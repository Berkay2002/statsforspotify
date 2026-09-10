"""Prove unsafe source drift aborts the migration without modifying the clone."""
import json
from pathlib import Path

from test_writes import TABLES, LAB_ROOT, expect_error, lab

ROOT = Path(__file__).resolve().parents[2]


def main():
    source = (ROOT / "supabase/migrations/20260910122700_compact_ranking_storage.sql").read_text()
    source = source.replace("\nBEGIN;\n", "\n", 1).removesuffix("COMMIT;\n")
    cases = {
        "changed restrictive INSERT policy": "CREATE POLICY storage_test_restrict ON public.artist_rankings AS RESTRICTIVE FOR INSERT WITH CHECK(false);",
        "changed column constraint": "ALTER TABLE public.artist_rankings ALTER COLUMN popularity SET NOT NULL;",
        "existing dependent view": "CREATE VIEW public.storage_test_dependency AS SELECT * FROM public.artist_rankings;",
    }
    passed = []
    for path in ('public,extensions', 'public,auth,extensions'):
        lab.sql('BEGIN; SET LOCAL search_path=' + path + ';' + source + 'ROLLBACK;')
        if lab.sql("SELECT to_regnamespace('ranking_storage') IS NULL;") != 't':
            raise AssertionError('Search-path rehearsal persisted changes')
        passed.append(f'migration accepts equivalent schema with search_path={path}')
        print('PASS', passed[-1], flush=True)
    for name, setup in cases.items():
        # Expected migration exception rolls back every DDL statement in that
        # subtransaction. The outer rollback removes the intentional drift.
        query = "BEGIN;" + setup + """DO $test$ BEGIN
          BEGIN EXECUTE $migration$""" + source + """$migration$;
            RAISE EXCEPTION 'Expected preflight rejection' USING ERRCODE='ZX001';
          EXCEPTION WHEN SQLSTATE 'P0001' THEN NULL; END;
          IF to_regnamespace('ranking_storage') IS NOT NULL OR
             (SELECT relkind FROM pg_class WHERE oid='public.artist_rankings'::regclass)<>'r'
          THEN RAISE EXCEPTION 'Failed migration left schema changes'; END IF;
          END $test$;ROLLBACK;"""
        lab.sql(query)
        passed.append(name)
        print("PASS", name, flush=True)
    for role in ("anon", "authenticated", "service_role"):
        for kind in TABLES:
            lab.sql("BEGIN;SET LOCAL ROLE " + role + ";" + expect_error(
                f"PERFORM * FROM ranking_storage.{kind}_metadata LIMIT 1", ("42501",)) + "ROLLBACK;",
                "stats_storage_ready")
            passed.append(f"{role} cannot directly read private {kind} metadata")
    (LAB_ROOT / "preflight-results.json").write_text(json.dumps({"passed": len(passed), "tests": passed}, indent=2))
    print(f"{len(passed)} preflight/private-schema checks passed")


if __name__ == "__main__":
    main()
