import { mkdtemp, readdir, realpath, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { authFixture, readPortableBaseline, readSql } from "./database-fixture";

// Always initialize a new native cluster. No Docker, existing database URL,
// linked Supabase project, system service, or production credentials are used.
const root = resolve(import.meta.dir, "..");
const scratch = await mkdtemp(join(tmpdir(), "statsforspotify-db-test-"));
const dataDirectory = join(scratch, "data");
const executable = (name: string) => process.env.POSTGRES_BIN
  ? join(process.env.POSTGRES_BIN, `${name}${process.platform === "win32" ? ".exe" : ""}`)
  : Bun.which(name) ?? (() => { throw new Error(`Missing ${name}. Set POSTGRES_BIN to a PostgreSQL 17+ bin directory; see SCHEMA_SYNC.md.`); })();
const psql = executable("psql");
const initdb = executable("initdb");
const pgctl = executable("pg_ctl");
const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("PG")));
const password = crypto.randomUUID();
// Reserve an available loopback port. If another process claims it after this
// probe, pg_ctl must fail; it must never fall back to a different database.
const probe = createServer();
await new Promise<void>((accept, reject) => { probe.once("error", reject); probe.listen(0, "127.0.0.1", accept); });
const address = probe.address();
if (!address || typeof address === "string") throw new Error("Unable to choose test port");
const port = String(address.port);
await new Promise<void>((accept, reject) => probe.close(error => error ? reject(error) : accept()));
Object.assign(environment, { PGHOST: "127.0.0.1", PGPORT: port, PGUSER: "postgres", PGDATABASE: "postgres", PGPASSWORD: password, PGCONNECT_TIMEOUT: "5" });
async function run(command: string[], stdin?: string, quiet = false, capture = false) {
  const proc = Bun.spawn(command, {
    cwd: root, env: environment, stdin: stdin === undefined ? "ignore" : new Blob([stdin]),
    // pg_ctl's server descendants can retain a pipe handle on Windows. Capture
    // only psql output; initialization/server output goes to the diagnostic log.
    stdout: capture ? "pipe" : quiet ? "ignore" : "inherit", stderr: "inherit",
  });
  const output = capture ? await new Response(proc.stdout).text() : "";
  if (await proc.exited) throw new Error(`Command failed: ${command.slice(0, 3).join(" ")}`);
  return output;
}
const sql = (source: string) => run([psql, "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1"], source, true, true);

async function waitForSql(condition: string, description: string) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if ((await sql(`SELECT ${condition};`)).trim() === "t") return;
    await Bun.sleep(40);
  }
  throw new Error(`Timed out waiting for ${description}`);
}

// Each call runs in a separate psql backend. Observe the actual waiting lock
// before releasing the first transaction, rather than relying on startup timing.
async function concurrentScenario(scenario: number, secondRange: "short_term" | "medium_term" | "delete") {
  const userId = `00000000-0000-0000-0000-00000000010${scenario}`;
  const firstName = `audit-first-${scenario}`;
  const secondName = `audit-second-${scenario}`;
  await sql(`
    INSERT INTO auth.users(id,email) VALUES('${userId}','concurrency-${scenario}@example.invalid');
    INSERT INTO audit_test.control(scenario,released) VALUES(${scenario},false);
  `);
  const begin = (name: string) => `
    BEGIN;
    SET LOCAL statement_timeout='35s';
    SET LOCAL application_name='${name}';
    SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"${userId}"}',true);
    SET LOCAL ROLE authenticated;
  `;
  const persist = (range: "short_term" | "medium_term", trackId: string) => `
    SELECT public.persist_snapshot('${userId}','${range}',
      '[{"artist_id":"shared-artist","artist_name":"Artist","rank":1}]',
      '[{"track_id":"${trackId}","track_name":"Track","artist_id":"shared-artist","artist_name":"Artist","album_id":"album","album_name":"Album","duration_ms":180000,"rank":1}]',
      '[{"album_id":"album","album_name":"Album","artist_id":"shared-artist","artist_name":"Artist","track_count":1,"rank":1}]');
  `;
  const first = sql(`${begin(firstName)}
    SELECT pg_advisory_xact_lock(hashtextextended('${userId}' || ':listening-stats',0));
    DO $$ BEGIN
      FOR attempt IN 1..600 LOOP
        IF (SELECT released FROM audit_test.control WHERE scenario=${scenario}) THEN RETURN; END IF;
        PERFORM pg_sleep(0.05);
      END LOOP;
      RAISE EXCEPTION 'Coordinator did not release test transaction';
    END $$;
    ${persist("short_term", "track-first")}
    COMMIT;
  `);
  // Keep the promise handled while the coordinator observes the other backend.
  void first.catch(() => {});
  let second: Promise<string> | undefined;
  const hasLock = (name: string, granted: boolean) => `EXISTS(
    SELECT 1 FROM pg_locks l JOIN pg_stat_activity a ON a.pid=l.pid
    WHERE a.application_name='${name}' AND l.locktype='advisory' AND l.granted=${granted}
  )`;
  try {
    await waitForSql(hasLock(firstName, true), "first collector to acquire its user lock");
    second = sql(`${begin(secondName)}
      ${secondRange === "delete" ? `SELECT public.delete_user_data('${userId}');` : persist(secondRange, "track-second")}
      COMMIT;
    `);
    void second.catch(() => {});
    await waitForSql(hasLock(secondName, false), "second operation to wait on the same user lock");
    await sql(`UPDATE audit_test.control SET released=true WHERE scenario=${scenario};`);
    const [firstOutput, secondOutput] = await Promise.all([first, second]);
    if (!firstOutput.includes('"skipped": false')) throw new Error("First concurrent collector did not persist");
    if (secondRange !== "delete" && !secondOutput.includes(`"skipped": ${secondRange === "short_term"}`)) {
      throw new Error("Second concurrent collector returned an unexpected skip result");
    }
    const expected = secondRange === "delete" ? 0 : secondRange === "short_term" ? 1 : 2;
    await sql(`DO $$ BEGIN
      IF (SELECT count(*) FROM public.snapshots WHERE user_id='${userId}') <> ${expected}
        OR (SELECT count(*) FROM public.artist_rankings WHERE user_id='${userId}') <> ${expected}
        OR (SELECT count(*) FROM public.track_rankings WHERE user_id='${userId}') <> ${expected}
        OR (SELECT count(*) FROM public.album_rankings WHERE user_id='${userId}') <> ${expected}
        OR (SELECT coalesce(sum(total_play_count),0) FROM public.artist_listening_stats WHERE user_id='${userId}') <> ${expected}
      THEN RAISE EXCEPTION 'Concurrent collection or deletion left inconsistent history'; END IF;
      IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id='${userId}') THEN
        RAISE EXCEPTION 'Data deletion must retain the account';
      END IF;
    END $$;`);
    console.log(`Passed two-session concurrency: ${secondRange === "delete" ? "collection followed by queued data deletion" : `short_term and ${secondRange}`}`);
  } finally {
    // A failing assertion must not leave the first test backend holding a lock.
    try {
      await sql(`UPDATE audit_test.control SET released=true WHERE scenario=${scenario};`);
    } finally {
      await Promise.allSettled(second ? [first, second] : [first]);
    }
  }
}
let started = false;
let passed = false;
console.log("Native PostgreSQL tests with synthetic Auth claims; no Docker or hosted database.");
console.log("Real Auth, PostgREST and Supabase operational extensions are not covered.");
try {
  const passwordFile = join(scratch, "password");
  await Bun.write(passwordFile, password, { mode: 0o600 });
  await run([initdb, "-D", dataDirectory, "-U", "postgres", "--encoding=UTF8", "--locale=C", "--auth=scram-sha-256", `--pwfile=${passwordFile}`], undefined, true);
  await rm(passwordFile);
  await Bun.write(join(dataDirectory, "postgresql.auto.conf"), `listen_addresses='127.0.0.1'\nport=${port}\nwal_level=logical\nunix_socket_directories=''\n`);
  started = true;
  await run([pgctl, "start", "-D", dataDirectory, "-l", join(scratch, "server.log"), "-w", "-t", "30"], undefined, true);
  console.log((await sql("SELECT version();")).trim());
  const connectedDirectory = (await sql("SHOW data_directory;")).trim();
  if (await realpath(connectedDirectory) !== await realpath(dataDirectory)) {
    throw new Error("Test connection did not reach the newly initialized cluster");
  }
  await sql(authFixture);
  await sql(await readPortableBaseline());
  await sql(await readSql("tests/baseline_security_reproduction.sql"));
  console.log("Original security defects reproduced against synthetic data.");
  const migrations = (await readdir(join(root, "supabase/migrations"))).filter(name => name.startsWith("20260905") && name.endsWith(".sql")).sort();
  for (const file of migrations) await sql(await readSql(`migrations/${file}`));
  for (const file of ["security_and_accounts.sql", "atomic_snapshots.sql"]) {
    await sql(await readSql(`tests/${file}`));
    console.log(`Passed ${file}`);
  }
  await sql(`
    CREATE SCHEMA audit_test;
    CREATE TABLE audit_test.control(scenario integer PRIMARY KEY,released boolean NOT NULL);
    GRANT USAGE ON SCHEMA audit_test TO authenticated;
    GRANT SELECT ON audit_test.control TO authenticated;
  `);
  await concurrentScenario(1, "short_term");
  await concurrentScenario(2, "medium_term");
  await concurrentScenario(3, "delete");
  passed = true;
} finally {
  if (started) {
    const status = Bun.spawn([pgctl, "status", "-D", dataDirectory], { env: environment, stdout: "ignore", stderr: "ignore" });
    const statusCode = await status.exited;
    if (statusCode === 0) {
      await run([pgctl, "stop", "-D", dataDirectory, "-m", "fast", "-w", "-t", "30"], undefined, true);
    } else if (statusCode !== 3) {
      throw new Error(`Unable to establish shutdown state; retained ${scratch}`);
    }
  }
  if (passed) {
    const actual = await realpath(scratch);
    if (dirname(actual) !== await realpath(tmpdir()) || !basename(actual).startsWith("statsforspotify-db-test-")) {
      throw new Error("Refusing cleanup outside the test temporary directory");
    }
    await rm(actual, { recursive: true });
    console.log("Stopped and removed the disposable PostgreSQL cluster.");
  } else {
    console.log(`Test failed; diagnostic files retained at ${scratch}`);
  }
}
