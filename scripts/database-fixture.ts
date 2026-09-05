import { readFile } from "node:fs/promises";

export const readSql = (path: string) => readFile(new URL(`../supabase/${path}`, import.meta.url), "utf8");

// A deliberately small Auth substitute for PostgreSQL-only tests. These claims
// are supplied by tests, not by real Supabase Auth or PostgREST.
export const authFixture = `
  CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN;
  CREATE ROLE service_role NOLOGIN BYPASSRLS;
  CREATE SCHEMA auth;
  CREATE SCHEMA extensions;
  CREATE SCHEMA vault;
  CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}');
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT (nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'sub')::uuid
  $$;
  CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role'
  $$;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
  CREATE PUBLICATION supabase_realtime;
`;

export async function readPortableBaseline() {
  const baseline = await readSql("tests/fixtures/baseline_schema.sql");
  const omitted = /^CREATE EXTENSION IF NOT EXISTS "(pg_cron|pg_net|pg_stat_statements|supabase_vault)".*?;\r?\n/gm;
  if ([...baseline.matchAll(omitted)].length !== 4) {
    throw new Error("Unexpected baseline operational extension declarations; review the fixture adapter.");
  }
  return baseline.replace(omitted, "");
}
