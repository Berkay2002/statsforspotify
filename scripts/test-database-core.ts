import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";
import { authFixture, readPortableBaseline, readSql } from "./database-fixture";

// No connection string, data directory, credentials, or external database is
// accepted. Each invocation creates and destroys an in-memory PostgreSQL engine.
const database = new PGlite({ extensions: { pg_trgm, pgcrypto, uuid_ossp } });

console.log("Supplemental in-memory PostgreSQL checks, not full Supabase integration.");
console.log("Auth users/claims are test shims. PostgREST, real Auth, operational extensions and concurrent sessions are not covered.");

try {
  await database.exec(authFixture);
  await database.exec(await readPortableBaseline());
  await database.exec("SET row_security = on");
  console.log("Restored immutable baseline; omitted pg_cron, pg_net, pg_stat_statements, supabase_vault declarations only.");

  for (const file of [
    "tests/baseline_security_reproduction.sql",
    "migrations/202609050001_security_and_account_integrity.sql",
    "migrations/202609050002_atomic_snapshots.sql",
    "tests/security_and_accounts.sql",
    "tests/atomic_snapshots.sql",
  ]) {
    await database.exec(await readSql(file));
    console.log(`Passed ${file}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "PostgreSQL core checks failed");
  process.exitCode = 1;
} finally {
  await database.close();
}
