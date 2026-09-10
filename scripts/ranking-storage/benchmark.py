"""Measure the isolated clones sequentially, with no concurrent test writers."""
import json
import statistics
from local_lab import ROOT,sql
from test_reads import fixtures,literal

DATABASES=['stats_storage_baseline','stats_storage_ready']
f=max(fixtures,key=lambda x:x['snapshot'])
uid=literal(f['user_id'])
queries={
 'latest_artists':f"SELECT * FROM public.artist_rankings WHERE snapshot_id={literal(f['snapshot'])}::uuid ORDER BY rank LIMIT 50",
 'previous_artist_ranks':f"SELECT artist_id,rank FROM public.artist_rankings WHERE snapshot_id={literal(f['snapshot'])}::uuid",
 'profile_artist_count':f"SELECT count(*) FROM public.artist_rankings WHERE user_id={uid}::uuid",
 'artist_history':f"SELECT * FROM public.get_ranking_history(p_user_id=>{uid}::uuid,p_item_id=>{literal(f['artist'])},p_item_type=>'artist',p_time_range=>'medium_term')",
 'hall_of_fame':f"SELECT public.get_hall_of_fame_recap(p_target_user_id=>{uid}::uuid)",
}
performance={}
for db in DATABASES:
    performance[db]={}
    for label,query in queries.items():
        times=[]
        for run in range(3):
            command=f"BEGIN; SET LOCAL statement_timeout='45s'; SET LOCAL ROLE authenticated; DO $$ BEGIN PERFORM set_config('request.jwt.claim.sub',{uid},true); END $$; EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) {query}; ROLLBACK;"
            result=json.loads(sql(command,db,f'{db}-plan-{label}-{run}.private.json'))[0]
            times.append(result['Execution Time'])
        performance[db][label]={'runs_ms':times,'median_ms':statistics.median(times)}
        print(db,label,performance[db][label],flush=True)

# Exercise visibility settings and friendship states only inside rollback transactions.
visibility={}
for db in DATABASES:
    visibility[db]={}
    owner,viewer=fixtures[:2]
    for visibility_mode in ('public','followers','private'):
        for state in ('accepted','pending','blocked'):
            command=f"""BEGIN; SET LOCAL statement_timeout='45s';
DELETE FROM public.friendships;
UPDATE public.user_profiles SET stats_visibility='{visibility_mode}' WHERE user_id={literal(owner['user_id'])}::uuid;
INSERT INTO public.friendships(user_id,friend_id,status) VALUES ({literal(owner['user_id'])}::uuid,{literal(viewer['user_id'])}::uuid,'{state}');
SET LOCAL ROLE authenticated;
DO $$ BEGIN PERFORM set_config('request.jwt.claim.sub',{literal(viewer['user_id'])},true); END $$;
SELECT jsonb_build_object('artist',(SELECT count(*) FROM public.artist_rankings WHERE snapshot_id={literal(owner['snapshot'])}::uuid),'track',(SELECT count(*) FROM public.track_rankings WHERE snapshot_id={literal(owner['snapshot'])}::uuid),'album',(SELECT count(*) FROM public.album_rankings WHERE snapshot_id={literal(owner['snapshot'])}::uuid));
ROLLBACK;"""
            visibility[db][f'{visibility_mode}/{state}']=json.loads(sql(command,db))
    print(db,'privacy fixtures passed execution',flush=True)

sizes={}
for db in DATABASES:
    sql("VACUUM (ANALYZE);",db)
    sizes[db]=json.loads(sql("""SELECT jsonb_build_object('database_bytes',pg_database_size(current_database()),'relations',(SELECT jsonb_agg(jsonb_build_object('schema',schemaname,'table',relname,'heap_bytes',pg_table_size(relid),'index_bytes',pg_indexes_size(relid),'total_bytes',pg_total_relation_size(relid)) ORDER BY schemaname,relname) FROM pg_stat_user_tables WHERE schemaname IN ('public','ranking_storage','ranking_storage_backup')));""",db))
summary={'performance':performance,'privacy_fixture_parity':visibility[DATABASES[0]]==visibility[DATABASES[1]],'privacy_fixtures':visibility,'sizes':sizes}
(ROOT/'ready-performance-results.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
print(json.dumps({'privacy_fixture_parity':summary['privacy_fixture_parity'],'database_bytes':{db:v['database_bytes'] for db,v in sizes.items()}}),flush=True)
if not summary['privacy_fixture_parity']: raise AssertionError('Privacy fixture mismatch')
