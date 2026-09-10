import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { buildMigrationSql } from './ranking-migration-sql.mjs';

const project = 'zpswcygleazebxmpblcx';
const origin = 'https://statsforspotify-chi.vercel.app';
const version = '20260910122700';
const operation = process.env.OPERATION;
const sha = process.env.EXPECTED_SHA;
if (process.env.SUPABASE_PROJECT_ID !== project || process.env.GITHUB_SHA !== sha || !/^[a-f0-9]{40}$/.test(sha ?? '')) {
  throw new Error('Release target or commit mismatch');
}
if (!['inspect', 'pause', 'migrate', 'verify', 'resume', 'rollback'].includes(operation)) throw new Error('Unknown operation');
const sql = query => {
  try {
    return execFileSync('psql', ['-X', '-v', 'ON_ERROR_STOP=1', '-qAt'], {
      input: query, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 240_000,
      env: { ...process.env, PGAPPNAME: `ranking-release-${operation}` },
    }).trim();
  } catch (error) {
    // Keep SQL/data contexts off the public workflow log.
    const messages = String(error.stderr ?? '').split('\n').filter(line => /^(ERROR|FATAL):/.test(line));
    throw new Error(messages.join('\n') || 'PostgreSQL operation failed; inspect database state before retrying');
  }
};
const queryCounts = `SELECT jsonb_build_object('users',(SELECT count(*) FROM auth.users),
 'snapshots',(SELECT count(*) FROM public.snapshots),'artists',(SELECT count(*) FROM public.artist_rankings),
 'tracks',(SELECT count(*) FROM public.track_rankings),'albums',(SELECT count(*) FROM public.album_rankings),
 'database_bytes',pg_database_size(current_database()))`;
const fingerprints = () => Object.fromEntries(['artist', 'track', 'album'].map(kind => [kind,
  sql(`SELECT count(*)||':'||md5(string_agg(md5(r::text),'' ORDER BY id)) FROM public.${kind}_rankings r;`)]));
const collector = () => JSON.parse(sql(`SELECT coalesce(jsonb_agg(jsonb_build_object('id',jobid,'active',active,
 'collector',command LIKE '%collect-snapshots%','commandHash',md5(command))),'[]') FROM cron.job WHERE jobname='collect-daily-snapshots';`));
const job = collector();
if (job.length !== 1 || job[0].collector !== true) throw new Error('Unexpected collector configuration');
console.log(JSON.stringify({ operation, sha, before: JSON.parse(sql(queryCounts)), collector: job }));

async function requireMaintenance() {
  const response = await fetch(`${origin}/api/snapshot`, { method: 'POST', redirect: 'manual', cache: 'no-store' });
  if (response.status !== 503 || response.headers.get('x-ranking-storage-maintenance') !== sha
      || (await response.json()).error !== 'Brief maintenance in progress. Please try again shortly.') {
    throw new Error('The exact reviewed maintenance deployment is not serving production');
  }
}
async function requireBackup() {
  if (!/^\d+$/.test(process.env.BACKUP_RUN_ID ?? '')) throw new Error('Missing verified backup run');
  const run = JSON.parse(execFileSync('gh', ['api', `repos/Berkay2002/statsforspotify/actions/runs/${process.env.BACKUP_RUN_ID}`], { encoding: 'utf8' }));
  if (run.conclusion !== 'success' || run.path !== '.github/workflows/maintenance-database.yml'
      || Date.now() - Date.parse(run.created_at) > 6 * 3600_000) throw new Error('A successful backup from the last six hours is required');
  const artifacts = JSON.parse(execFileSync('gh', ['api', `repos/Berkay2002/statsforspotify/actions/runs/${run.id}/artifacts`], { encoding: 'utf8' }));
  if (!artifacts.artifacts.some(a => !a.expired && a.name === `stats-database-backup-${run.id}`)) throw new Error('Encrypted backup artifact missing');
}
function pauseState() {
  if (!/^\d+$/.test(process.env.PAUSE_RUN_ID ?? '')) throw new Error('Missing successful pause run');
  const run = JSON.parse(execFileSync('gh', ['api', `repos/Berkay2002/statsforspotify/actions/runs/${process.env.PAUSE_RUN_ID}`], { encoding: 'utf8' }));
  if (run.conclusion !== 'success' || run.path !== '.github/workflows/compact-ranking-storage.yml') throw new Error('Invalid pause run');
  const directory = join(process.env.RUNNER_TEMP, 'verified-pause');
  execFileSync('gh', ['run', 'download', String(run.id), '--repo', 'Berkay2002/statsforspotify', '--name', `ranking-release-${run.id}`, '--dir', directory]);
  const state = JSON.parse(readFileSync(join(directory, 'ranking-pause-state.json'), 'utf8'));
  if (state.project !== project || state.job.id !== job[0].id || state.job.commandHash !== job[0].commandHash) throw new Error('Collector changed since pause');
  return state;
}
function requireDrained() {
  const state = pauseState();
  if (Date.now() - Date.parse(state.pausedAt) < 180_000) throw new Error('Collector drain interval has not elapsed');
  const clear = sql(`SELECT
    NOT EXISTS(SELECT 1 FROM cron.job_run_details WHERE jobid=${job[0].id} AND status='running')
    AND NOT EXISTS(SELECT 1 FROM net.http_request_queue WHERE url LIKE '%/functions/v1/collect-snapshots%')
    AND NOT EXISTS(SELECT 1 FROM pg_stat_activity WHERE pid<>pg_backend_pid() AND state='active'
      AND query ~* '(insert|update|delete|persist_snapshot)' AND query ~* '(rankings|snapshots|persist_snapshot)')
    AND NOT EXISTS(SELECT 1 FROM cron.job_run_details WHERE jobid=${job[0].id} AND start_time>now()-interval '10 minutes');`);
  if (clear !== 't') throw new Error('Collector or ranking writers are active/recent; wait and inspect before migration');
}
function verifyCompact() {
  for (const kind of ['artist', 'track', 'album']) {
    const ok = sql(`SELECT
      (SELECT relkind='v' AND 'security_invoker=true'=ANY(reloptions) FROM pg_class WHERE oid='public.${kind}_rankings'::regclass)
      AND NOT EXISTS(SELECT 1 FROM ranking_storage_backup.${kind}_rankings)
      AND NOT EXISTS(SELECT 1 FROM ranking_storage.${kind}_metadata m WHERE NOT EXISTS(
        SELECT 1 FROM ranking_storage.${kind}_observations o WHERE o.metadata_key=m.metadata_key))
      AND NOT has_schema_privilege('anon','ranking_storage','USAGE')
      AND NOT has_schema_privilege('authenticated','ranking_storage','USAGE');`);
    if (ok !== 't') throw new Error(`Compact storage verification failed for ${kind}`);
  }
  if (sql(`SELECT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='${version}');`) !== 't') throw new Error('Migration history entry missing');
}
function verifyCurrentStorage() {
  if (sql("SELECT to_regnamespace('ranking_storage') IS NOT NULL;") === 't') {
    verifyCompact();
    return;
  }
  // Recovery also supports a completed lossless rollback. Mixed states fail.
  if (sql(`SELECT to_regnamespace('ranking_storage_backup') IS NULL AND
    NOT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='${version}');`) !== 't') {
    throw new Error('Incomplete rollback state');
  }
  for (const kind of ['artist', 'track', 'album']) {
    if (sql(`SELECT relkind='r' AND relrowsecurity FROM pg_class WHERE oid='public.${kind}_rankings'::regclass;`) !== 't') {
      throw new Error(`Original storage was not restored: ${kind}`);
    }
  }
}
async function smokeApi() {
  const keysResponse = await fetch(`https://api.supabase.com/v1/projects/${project}/api-keys`, {
    headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}` },
  });
  if (!keysResponse.ok) throw new Error(`Could not load API keys for smoke check: ${keysResponse.status}`);
  const keys = await keysResponse.json();
  for (const role of ['anon', 'service_role']) {
    const key = keys.find(k => k.name === role)?.api_key;
    if (!key) throw new Error(`Missing ${role} API key for smoke test`);
    for (const kind of ['artist', 'track', 'album']) {
      const response = await fetch(`https://${project}.supabase.co/rest/v1/${kind}_rankings?select=id,rank,snapshots(id)&limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      if (!response.ok) throw new Error(`REST ${kind}/${role} failed: ${response.status}`);
      const rows = await response.json();
      if (!Array.isArray(rows) || rows.length !== (role === 'anon' ? 0 : 1)) throw new Error(`REST visibility mismatch: ${kind}/${role}`);
    }
  }
  console.log('Production REST reads, snapshot embedding and anonymous visibility passed.');
}

if (operation === 'inspect') {
  console.log(JSON.stringify({ compact: sql("SELECT to_regnamespace('ranking_storage') IS NOT NULL;"), fingerprints: fingerprints() }));
  const source = readFileSync(`supabase/migrations/${version}_compact_ranking_storage.sql`, 'utf8');
  const expression = source.match(/IF md5\((jsonb_build_object\([\s\S]*?)::text\) <>/)[1];
  const contracts = Object.fromEntries(['artist', 'track', 'album'].map(kind => [kind,
    JSON.parse(sql(`SELECT ${expression.replaceAll('artist_rankings', `${kind}_rankings`)};`))]));
  writeFileSync(join(process.env.RUNNER_TEMP, 'ranking-source-contract.json'), JSON.stringify({
    searchPath: sql('SHOW search_path;'), contracts,
  }, null, 2));
} else if (operation === 'pause') {
  await requireMaintenance();
  writeFileSync(join(process.env.RUNNER_TEMP, 'ranking-pause-state.json'), JSON.stringify({ project, sha, job: job[0], pausedAt: new Date().toISOString() }, null, 2));
  sql(`SELECT cron.alter_job(${job[0].id},active:=false);`);
  if (collector()[0].active) throw new Error('Collector did not pause');
  console.log('Collector paused. Drain existing invocations before taking the final backup and migrating.');
} else if (operation === 'migrate' || operation === 'rollback') {
  await requireMaintenance();
  await requireBackup();
  if (job[0].active) throw new Error('Pause and drain the collector first');
  requireDrained();
  const path = operation === 'migrate'
    ? `supabase/migrations/${version}_compact_ranking_storage.sql`
    : 'supabase/rollback/compact_ranking_storage.sql';
  const source = readFileSync(path, 'utf8');
  if (!/^BEGIN;\r?$/m.test(source) || !/COMMIT;\s*$/.test(source)) throw new Error('Unexpected migration transaction format');
  console.log(JSON.stringify({ migrationSha256: createHash('sha256').update(source).digest('hex') }));
  // Capture under all three source locks, then assert before COMMIT. External
  // fingerprint reads alone would not define a consistent migration boundary.
  sql(buildMigrationSql(source, operation));
  const after = fingerprints();
  if (operation === 'migrate') verifyCompact();
  const result = { operation, sha, transactionFingerprintsEqual: true, after, counts: JSON.parse(sql(queryCounts)), verified: true };
  writeFileSync(join(process.env.RUNNER_TEMP, 'ranking-release-result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} else if (operation === 'verify') {
  verifyCurrentStorage();
  const before = fingerprints();
  sql(readFileSync('.github/scripts/ranking-production-smoke.sql', 'utf8'));
  if (JSON.stringify(before) !== JSON.stringify(fingerprints())) throw new Error('Rollback smoke fixture changed persisted rows');
  await smokeApi();
  console.log(JSON.stringify({ verified: true, counts: JSON.parse(sql(queryCounts)), fingerprints: fingerprints() }));
} else if (operation === 'resume') {
  verifyCurrentStorage();
  const original = pauseState();
  const response = await fetch(`${origin}/api/snapshot`, { method: 'POST', redirect: 'manual', cache: 'no-store' });
  if (response.status !== 401 || response.headers.has('x-ranking-storage-maintenance')
      || response.headers.get('x-ranking-storage-release') !== sha) throw new Error('The exact resumed application deployment is not healthy');
  sql(`SELECT cron.alter_job(${job[0].id},active:=${original.job.active ? 'true' : 'false'});`);
  if (collector()[0].active !== original.job.active) throw new Error('Collector state was not restored');
  console.log('Application is out of maintenance and the original collector state is restored.');
}
