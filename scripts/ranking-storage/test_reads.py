"""Compare RPC and visibility results on two isolated local clones. Run without concurrent writers."""
import json
from local_lab import ROOT, sql

fixtures = json.loads(sql("""SELECT jsonb_agg(jsonb_build_object('user_id',u.id,'artist',(SELECT min(artist_id) FROM public.artist_rankings WHERE user_id=u.id),'track',(SELECT min(track_id) FROM public.track_rankings WHERE user_id=u.id),'album',(SELECT min(album_id) FROM public.album_rankings WHERE user_id=u.id),'snapshot',(SELECT id FROM public.snapshots WHERE user_id=u.id ORDER BY created_at DESC LIMIT 1))) FROM auth.users u;"""))

def literal(value):
    return "NULL" if value is None else "'" + str(value).replace("'", "''") + "'"

def cases(fixture):
    uid = literal(fixture["user_id"])
    tests = {}
    for kind in ("artist", "track", "album"):
        entity = literal(fixture[kind])
        for term in ("short_term", "medium_term", "long_term"):
            suffix = f"{kind}/{term}"
            tests[f"history4/{suffix}"] = f"SELECT * FROM public.get_ranking_history(p_user_id=>{uid}::uuid,p_item_id=>{entity},p_item_type=>'{kind}',p_time_range=>'{term}')"
            tests[f"history5/{suffix}"] = f"SELECT * FROM public.get_ranking_history(p_user_id=>{uid}::uuid,p_entity_id=>{entity},p_entity_type=>'{kind}',p_time_range=>'{term}',p_limit=>100)"
            tests[f"sparkline5/{suffix}"] = f"SELECT * FROM public.get_sparkline_data(p_user_id=>{uid}::uuid,p_entity_id=>{entity},p_entity_type=>'{kind}',p_time_range=>'{term}',p_limit=>30)"
        tests[f"sparkline4/{kind}"] = f"SELECT * FROM public.get_sparkline_data(p_user_id=>{uid}::uuid,p_item_ids=>ARRAY[{entity}],p_item_type=>'{kind}',p_days=>365)"
        tests[f"history_null/{kind}"] = f"SELECT * FROM public.get_ranking_history(p_user_id=>{uid}::uuid,p_item_id=>{entity},p_item_type=>'{kind}',p_time_range=>NULL::text)"
        tests[f"history_missing/{kind}"] = f"SELECT * FROM public.get_ranking_history(p_user_id=>{uid}::uuid,p_item_id=>'missing-local-test',p_item_type=>'{kind}',p_time_range=>'medium_term')"
        tests[f"direct/{kind}"] = f"SELECT * FROM public.{kind}_rankings WHERE snapshot_id={literal(fixture['snapshot'])}::uuid ORDER BY rank,id LIMIT 50"
    for function in ("get_three_versions_of_you", "get_plot_twists_recap", "get_hall_of_fame_recap", "get_album_takeover_recap"):
        tests[function] = f"SELECT public.{function}(p_target_user_id=>{uid}::uuid) AS value"
    return tests

def capture(database):
    results = {}
    for number, fixture in enumerate(fixtures):
        statements = ["BEGIN; SET LOCAL statement_timeout='45s'; SET LOCAL ROLE authenticated;", f"SELECT set_config('request.jwt.claim.sub',{literal(fixture['user_id'])},true);"]
        for label, query in cases(fixture).items():
            statements.append(f"SELECT jsonb_build_object('case',{literal(str(number)+'/'+label)},'result',(SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM ({query}) t));")
        statements.append("ROLLBACK;")
        text = sql("\n".join(statements), database, f"{database}-rpc.private.log")
        for line in text.splitlines():
            if line.startswith('{'):
                row = json.loads(line)
                results[row['case']] = row['result']
        print(f"{database}: user {number+1} RPC/direct-query cases captured", flush=True)
    # Every viewer/owner pair, plus anonymous and service-role visibility.
    for number, viewer in enumerate(fixtures + [{"user_id": ""}, {"user_id": "", "service": True}]):
        role = "service_role" if viewer.get("service") else "authenticated" if viewer["user_id"] else "anon"
        statements = [f"BEGIN; SET LOCAL statement_timeout='45s'; SET LOCAL ROLE {role};", f"SELECT set_config('request.jwt.claim.sub',{literal(viewer['user_id'])},true);"]
        for owner_number, owner in enumerate(fixtures):
            for kind in ('artist','track','album'):
                statements.append(f"SELECT jsonb_build_object('case','rls/{number}/{owner_number}/{kind}','result',(SELECT coalesce(jsonb_agg(id ORDER BY id),'[]'::jsonb) FROM public.{kind}_rankings WHERE snapshot_id={literal(owner['snapshot'])}::uuid));")
        statements.append("ROLLBACK;")
        for line in sql("\n".join(statements),database,f"{database}-rls-{number}.private.log").splitlines():
            if line.startswith('{'):
                row=json.loads(line); results[row['case']]=row['result']
        print(f"{database}: visibility viewer {number+1} captured", flush=True)
    return results

def main():
    outputs = {}
    for db in ("stats_storage_baseline","stats_storage_ready"):
        sql("VACUUM (ANALYZE);",db)
        outputs[db]=capture(db)
        (ROOT/f"{db}-results.private.json").write_text(json.dumps(outputs[db],ensure_ascii=False),encoding='utf-8')
    before,after=outputs.values()
    differences=[key for key in before if before[key]!=after.get(key)]
    summary={'cases':len(before),'matching':len(before)-len(differences),'differing_cases':differences}
    (ROOT/'ready-read-results.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
    print(json.dumps(summary),flush=True)
    if differences:
        raise AssertionError("RPC/RLS results differ; see private comparison artifacts")

if __name__=='__main__': main()
