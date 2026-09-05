import { chmod, mkdtemp, open, readFile, realpath, rm, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

// Accept only a local custom pg_dump archive. Never connect to an existing server.
// Restore trusted project backups only: a dump can contain executable SQL.
const [input, ...extra] = process.argv.slice(2);
const checkMaintenance = extra.length === 1 && extra[0] === "--check-maintenance";
if (!input || (extra.length > 0 && !checkMaintenance) || /^[a-z]+:\/\//i.test(input) || /^[\\/]{2}/.test(input)) {
  throw new Error("Usage: bun scripts/verify-database-backup.ts <local-custom-pg-dump> [--check-maintenance]");
}
const archive = await realpath(resolve(input));
if (/^[\\/]{2}/.test(archive) || !(await stat(archive)).isFile()) throw new Error("Expected a local archive file");
const file = await open(archive, "r");
try {
  const magic = Buffer.alloc(5);
  await file.read(magic, 0, 5, 0);
  if (magic.toString() !== "PGDMP") throw new Error("Expected a custom pg_dump archive (PGDMP)");
} finally { await file.close(); }

const executable = (name: string) => process.env.POSTGRES_BIN
  ? join(process.env.POSTGRES_BIN, `${name}${process.platform === "win32" ? ".exe" : ""}`)
  : Bun.which(name) ?? (() => { throw new Error(`Missing ${name}; set POSTGRES_BIN to PostgreSQL 17+ binaries`); })();
const psql = executable("psql");
const initdb = executable("initdb");
const pgctl = executable("pg_ctl");
const restore = executable("pg_restore");
const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(PG|SUPABASE|SPOTIFY|VERCEL)/i.test(key)));
const scratch = await mkdtemp(join(tmpdir(), "statsforspotify-backup-verify-"));
await chmod(scratch, 0o700);
const dataDirectory = join(scratch, "data");
const diagnosticFile = join(scratch, "commands.log");
await writeFile(diagnosticFile, "", { mode: 0o600 });
const password = crypto.randomUUID();
let started = false;
let passed = false;

async function run(command: string[], stdin?: string) {
  if (command[0] === initdb || command[0] === pgctl) {
    // On Windows a postgres descendant can retain inherited pipe handles even
    // when pg_ctl redirects its own server log. Use a file for both streams.
    const diagnostics = await open(diagnosticFile, "a", 0o600);
    try {
      const proc = Bun.spawn(command, {
        env: environment, stdin: "ignore", stdout: diagnostics.fd, stderr: diagnostics.fd,
      });
      const code = await proc.exited;
      if (code) throw new Error(`${basename(command[0])} failed (${code}); private diagnostics: ${diagnosticFile}`);
      return "";
    } finally { await diagnostics.close(); }
  }
  const proc = Bun.spawn(command, {
    env: environment, stdin: stdin === undefined ? "ignore" : new Blob([stdin]),
    stdout: "pipe", stderr: "pipe",
  });
  const [output, errors, code] = await Promise.all([
    new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited,
  ]);
  if (errors) await writeFile(diagnosticFile, errors, { flag: "a", mode: 0o600 });
  if (code) throw new Error(`${basename(command[0])} failed (${code}); private diagnostics: ${diagnosticFile}`);
  return output;
}
const sql = (source: string) => run([psql, "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1"], source);

try {
  const probe = createServer();
  await new Promise<void>((accept, reject) => { probe.once("error", reject); probe.listen(0, "127.0.0.1", accept); });
  const address = probe.address();
  if (!address || typeof address === "string") throw new Error("Unable to select local verification port");
  const port = String(address.port);
  await new Promise<void>((accept, reject) => probe.close(error => error ? reject(error) : accept()));
  Object.assign(environment, {
    PGHOST: "127.0.0.1", PGPORT: port, PGUSER: "postgres", PGDATABASE: "postgres",
    PGPASSWORD: password, PGCONNECT_TIMEOUT: "5", PGSSLMODE: "disable",
  });
  const passwordFile = join(scratch, "password");
  await writeFile(passwordFile, password, { mode: 0o600 });
  await run([initdb, "-D", dataDirectory, "-U", "postgres", "--encoding=UTF8", "--locale=C", "--auth=scram-sha-256", `--pwfile=${passwordFile}`]);
  await rm(passwordFile);
  await writeFile(join(dataDirectory, "postgresql.auto.conf"), `listen_addresses='127.0.0.1'\nport=${port}\nwal_level=logical\nunix_socket_directories=''\ntimezone='UTC'\n`, { mode: 0o600 });
  // Log redirection prevents server descendants retaining pg_ctl pipes on Windows.
  started = true;
  await run([pgctl, "start", "-D", dataDirectory, "-l", join(scratch, "server.log"), "-w", "-t", "30"]);
  const connectedDirectory = (await sql("SHOW data_directory;")).trim();
  if (await realpath(connectedDirectory) !== await realpath(dataDirectory)) {
    throw new Error("Refusing restore: connection did not reach the newly initialized cluster");
  }
  const contents = await run([restore, "--list", archive]);
  await sql(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE ROLE supabase_auth_admin NOLOGIN;
    CREATE ROLE supabase_admin NOLOGIN;
    CREATE ROLE authenticator NOLOGIN;
    CREATE ROLE dashboard_user NOLOGIN;
    CREATE ROLE supabase_storage_admin NOLOGIN;
    CREATE SCHEMA extensions;
    CREATE EXTENSION pg_trgm WITH SCHEMA extensions;
    CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
    CREATE EXTENSION "uuid-ossp" WITH SCHEMA extensions;
    ${/SCHEMA - public\s/m.test(contents) ? "DROP SCHEMA public;" : ""}
    ${/PUBLICATION TABLE /m.test(contents) && !/PUBLICATION - supabase_realtime\s/m.test(contents) ? "CREATE PUBLICATION supabase_realtime;" : ""}
  `);
  await run([restore, "--no-owner", "--no-acl", "--single-transaction", "--exit-on-error", "--dbname=postgres", archive]);
  const countSql = `
    DO $$ DECLARE table_name text; BEGIN
      FOREACH table_name IN ARRAY ARRAY['auth.users','public.user_profiles','public.spotify_connections',
        'public.friendships','public.snapshots','public.artist_rankings','public.track_rankings',
        'public.album_rankings','public.artist_listening_stats'] LOOP
        IF to_regclass(table_name) IS NULL THEN RAISE EXCEPTION 'Missing required table %',table_name; END IF;
      END LOOP;
    END $$;
    CREATE TEMP TABLE restored_counts(table_name text, row_count bigint);
    DO $$ DECLARE t record; BEGIN
      FOR t IN SELECT n.nspname,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname IN ('public','auth') AND c.relkind IN ('r','p') AND NOT c.relispartition LOOP
        EXECUTE format('INSERT INTO restored_counts SELECT %L,count(*) FROM %I.%I',
          t.nspname||'.'||t.relname,t.nspname,t.relname);
      END LOOP;
    END $$;
    SELECT table_name||'|'||row_count FROM restored_counts ORDER BY table_name;
  `;
  const counts = await sql(countSql);
  console.log("Restored public/Auth schema and data into disposable native PostgreSQL. Table counts:");
  console.log(counts.trim());
  if (checkMaintenance) {
    for (const migration of ["202609050001_security_and_account_integrity.sql", "202609050002_atomic_snapshots.sql"]) {
      await sql(await readFile(new URL(`../supabase/migrations/${migration}`, import.meta.url), "utf8"));
    }
    if ((await sql(countSql)).trim() !== counts.trim()) throw new Error("Maintenance migrations changed restored table counts");
    console.log("Both pending maintenance migrations applied successfully to the restored backup; every public/Auth table count was preserved.");
  }
  console.log("Ownership and grants were intentionally omitted; hosted Auth services, cron, vault, storage, and full-project recovery are not verified.");
  passed = true;
} finally {
  if (started) {
    const status = Bun.spawn([pgctl, "status", "-D", dataDirectory], { env: environment, stdout: "ignore", stderr: "ignore" });
    const statusCode = await status.exited;
    if (statusCode === 0) await run([pgctl, "stop", "-D", dataDirectory, "-m", "fast", "-w", "-t", "30"]);
    else if (statusCode !== 3) throw new Error(`Unable to establish shutdown state; retained private files at ${scratch}`);
  }
  if (passed) {
    const actual = await realpath(scratch);
    if (dirname(actual) !== await realpath(tmpdir()) || !basename(actual).startsWith("statsforspotify-backup-verify-")) {
      throw new Error("Refusing cleanup outside the verification temporary directory");
    }
    await rm(actual, { recursive: true });
    console.log("Stopped and removed the disposable verification cluster. Input archive was preserved.");
  } else console.log(`Verification failed; private diagnostics and cluster files retained at ${scratch}`);
}
