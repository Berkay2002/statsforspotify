import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const project = 'zpswcygleazebxmpblcx';
const origin = 'https://statsforspotify-chi.vercel.app';
const operation = process.env.OPERATION;
if (process.env.SUPABASE_PROJECT_ID !== project || process.env.GITHUB_SHA !== process.env.EXPECTED_SHA) throw new Error('Release target mismatch');
const sql = text => execFileSync('psql', ['-X', '-v', 'ON_ERROR_STOP=1', '-At', '-c', text], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const api = async path => {
  const response = await fetch(`https://api.supabase.com/v1/projects/${project}/${path}`, {
    headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}` },
  });
  if (!response.ok) throw new Error(`Supabase metadata request failed: ${response.status}`);
  return response.json();
};
const functionInfo = await api('functions/collect-snapshots');
console.log(JSON.stringify({ collector: functionInfo.slug, version: functionInfo.version, verify_jwt: functionInfo.verify_jwt }));
const secrets = await api('secrets');
console.log(JSON.stringify({ configuredFunctionSecrets: secrets.map(secret => secret.name) }));
const queryCounts = `SELECT jsonb_build_object('users',(SELECT count(*) FROM auth.users),'snapshots',(SELECT count(*) FROM public.snapshots),'artists',(SELECT count(*) FROM public.artist_rankings),'tracks',(SELECT count(*) FROM public.track_rankings),'albums',(SELECT count(*) FROM public.album_rankings),'connections',(SELECT count(*) FROM public.spotify_connections),'profiles',(SELECT count(*) FROM public.user_profiles),'friendships',(SELECT count(*) FROM public.friendships),'aggregates',(SELECT count(*) FROM public.artist_listening_stats))`;
console.log(sql(queryCounts));
console.log(sql("SELECT jsonb_build_object('jobid',jobid,'name',jobname,'schedule',schedule,'active',active) FROM cron.job WHERE jobname='collect-daily-snapshots'"));

if (operation === 'inspect') {
  console.log(sql("SELECT jsonb_build_object('snapshot_rpc_installed',to_regprocedure('public.persist_snapshot(uuid,text,jsonb,jsonb,jsonb)') IS NOT NULL,'anon_can_export',has_function_privilege('anon','public.export_user_data(uuid)','EXECUTE'),'client_can_read_tokens',has_table_privilege('authenticated','public.spotify_connections','SELECT'))"));
} else if (operation === 'migrate' || operation === 'collector') {
  const response = await fetch(`${origin}/api/snapshot`, { redirect: 'manual', cache: 'no-store' });
  if (response.status !== 503 || (await response.json()).error !== 'Brief maintenance in progress. Please try again shortly.') {
    throw new Error('Deploy the reviewed application in maintenance mode before changing production');
  }
  if (operation === 'migrate') {
    if (!/^\d+$/.test(process.env.BACKUP_RUN_ID ?? '')) throw new Error('Missing backup run');
    const run = JSON.parse(execFileSync('gh', ['api', `repos/Berkay2002/statsforspotify/actions/runs/${process.env.BACKUP_RUN_ID}`], { encoding: 'utf8' }));
    if (run.conclusion !== 'success' || run.path !== '.github/workflows/maintenance-database.yml' || Date.now() - Date.parse(run.created_at) > 86400000) throw new Error('A successful backup from the last 24 hours is required');
    const before = sql(queryCounts);
    const files = ['202609050001_security_and_account_integrity.sql', '202609050002_atomic_snapshots.sql'];
    const parts = files.map(file => {
      const source = readFileSync(`supabase/migrations/${file}`, 'utf8');
      if (!/^BEGIN;\r?$/m.test(source) || !/COMMIT;\s*$/.test(source)) throw new Error('Unexpected migration transaction format');
      return source.replace(/^BEGIN;\r?$/m, '').replace(/COMMIT;\s*$/, '');
    });
    const migration = `BEGIN;
SET LOCAL lock_timeout='10s';
SET LOCAL statement_timeout='180s';
SELECT pg_advisory_xact_lock(hashtextextended('statsforspotify:maintenance-release',0));
DO $$ BEGIN
  IF to_regprocedure('public.persist_snapshot(uuid,text,jsonb,jsonb,jsonb)') IS NOT NULL THEN RAISE EXCEPTION 'Migration already installed; inspect instead of replaying'; END IF;
  IF (SELECT count(*) FROM cron.job WHERE jobname='collect-daily-snapshots' AND command LIKE '%collect-snapshots%') <> 1 THEN RAISE EXCEPTION 'Unexpected collector schedule'; END IF;
END $$;
SELECT cron.alter_job(jobid,active:=false) FROM cron.job WHERE jobname='collect-daily-snapshots';
${parts.join('\n')}
CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations(version text PRIMARY KEY,statements text[],name text);
${files.map((file, index) => `INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('${file.slice(0,12)}','${file.slice(13,-4)}',ARRAY[$migration$${parts[index]}$migration$]);`).join('\n')}
DO $$ BEGIN IF (${queryCounts})::text <> '${before.replaceAll("'", "''")}' THEN RAISE EXCEPTION 'Row counts changed during migration'; END IF; END $$;
NOTIFY pgrst,'reload schema';
COMMIT;`;
    const path = join(process.env.RUNNER_TEMP, 'reviewed-maintenance.sql');
    writeFileSync(path, migration, { mode: 0o600 });
    execFileSync('psql', ['-X', '-v', 'ON_ERROR_STOP=1', '-f', path], { stdio: 'inherit' });
    console.log(sql(queryCounts));
  } else {
    if (sql("SELECT to_regprocedure('public.persist_snapshot(uuid,text,jsonb,jsonb,jsonb)') IS NOT NULL") !== 't') throw new Error('Apply the migrations first');
    for (const required of ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET']) {
      if (!secrets.some(secret => secret.name === required)) throw new Error(`Missing collector secret: ${required}`);
    }
    if (typeof functionInfo.verify_jwt !== 'boolean') throw new Error('Cannot preserve existing JWT verification setting');
    writeFileSync('supabase/config.toml', `[functions.collect-snapshots]\nverify_jwt = ${functionInfo.verify_jwt}\n`);
    execFileSync('supabase', ['--agent=no', 'functions', 'deploy', 'collect-snapshots', '--project-ref', project, '--use-api'], { stdio: 'inherit' });
    const deployed = await api('functions/collect-snapshots');
    if (deployed.version <= functionInfo.version || deployed.verify_jwt !== functionInfo.verify_jwt) throw new Error('Collector deployment not confirmed');
    console.log(JSON.stringify({ deployedVersion: deployed.version, verify_jwt: deployed.verify_jwt }));
  }
} else if (operation === 'resume') {
  const response = await fetch(`${origin}/api/spotify/token`, { redirect: 'manual', cache: 'no-store' });
  if (response.status !== 401 || response.headers.get('cache-control') !== 'private, no-store') throw new Error('Updated application must be healthy and out of maintenance before resuming');
  if (sql("SELECT to_regprocedure('public.persist_snapshot(uuid,text,jsonb,jsonb,jsonb)') IS NOT NULL") !== 't') throw new Error('Snapshot migration missing');
  console.log(sql("SELECT cron.alter_job(jobid,active:=true) FROM cron.job WHERE jobname='collect-daily-snapshots'"));
} else {
  throw new Error('Unknown maintenance operation');
}
