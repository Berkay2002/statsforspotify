export function buildMigrationSql(source, operation) {
  const version = '20260910122700';
  if (!['migrate', 'rollback'].includes(operation) || !/^BEGIN;\r?$/m.test(source) || !/COMMIT;\s*$/.test(source)) {
    throw new Error('Unexpected migration transaction format');
  }
  const history = operation === 'migrate'
    ? `INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('${version}','compact_ranking_storage',ARRAY[$history$${source}$history$]);`
    : `DELETE FROM supabase_migrations.schema_migrations WHERE version='${version}';`;
  const rowHashes = ['artist', 'track', 'album'].map(kind =>
    `SELECT '${kind}' AS kind,count(*) AS rows,md5(string_agg(md5(r::text),'' ORDER BY id)) AS digest FROM public.${kind}_rankings r`).join(' UNION ALL ');
  const lockEnd = operation === 'migrate' ? 'public.track_rankings IN ACCESS EXCLUSIVE MODE;'
    : 'ranking_storage.track_observations IN ACCESS EXCLUSIVE MODE;';
  if (!source.includes(lockEnd)) throw new Error('Expected source lock missing');
  const guarded = source.replace(lockEnd, lockEnd + `\nCREATE TEMP TABLE ranking_before ON COMMIT DROP AS ${rowHashes};`);
  const equality = `CREATE TEMP TABLE ranking_after ON COMMIT DROP AS ${rowHashes};
    DO $$ BEGIN IF EXISTS((SELECT * FROM ranking_before EXCEPT ALL SELECT * FROM ranking_after)
      UNION ALL (SELECT * FROM ranking_after EXCEPT ALL SELECT * FROM ranking_before))
      THEN RAISE EXCEPTION 'Ranking fingerprints changed inside migration'; END IF; END $$;`;
  // Function replacement preserves SQL dollar quoting literally ($$/$history$).
  return guarded.replace(/COMMIT;\s*$/, () => equality + '\n' + history + '\nCOMMIT;');
}
