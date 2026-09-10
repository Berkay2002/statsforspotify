"""Rehearse rollback and reapply with committed post-migration writes, locally.

Run on stats_storage_ready only, with no other tests active. Leaves it migrated.
"""
import json
from pathlib import Path

from test_writes import TABLES, LAB_ROOT, lab, insert

DB = "stats_storage_ready"
ROOT = Path(__file__).resolve().parents[2]
SNAPSHOTS = ("c42106f7-e20b-43c8-b4df-000000000001", "c42106f7-e20b-43c8-b4df-000000000002")


def fingerprint():
    # Hash textual typed rows, which also preserves NULLs and array bounds.
    return {kind: lab.sql(f"SELECT count(*)||':'||md5(string_agg(md5(r::text),'' ORDER BY id)) "
                        f"FROM public.{kind}_rankings r;", DB) for kind in TABLES}


def main():
    owner = lab.sql("SELECT id FROM auth.users ORDER BY id LIMIT 1;", DB)
    summary = {"committed_writes": False, "rollback_preserved_rows": False, "reapply_preserved_rows": False}
    initial = fingerprint()
    try:
        setup = "BEGIN;"
        for i, sid in enumerate(SNAPSHOTS):
            setup += (f"INSERT INTO public.snapshots(id,user_id,time_range,created_at) VALUES "
                      f"('{sid}','{owner}','short_term','2195-01-0{i+1}T12:00:00Z');")
        for kind in TABLES:
            for sid in SNAPSHOTS:
                extra = {"genres": "'[0:1]={rock,pop}'::text[]"} if kind == "artist" else {}
                setup += insert(kind, owner, sid, key="rollback", extra=extra) + ";"
            setup += f"UPDATE public.{kind}_rankings SET {kind}_name='Updated after migration' WHERE snapshot_id='{SNAPSHOTS[0]}';"
            setup += f"DELETE FROM public.{kind}_rankings WHERE snapshot_id='{SNAPSHOTS[1]}';"
        lab.sql(setup + "COMMIT;", DB)
        expected = fingerprint()
        assert expected != initial
        summary["committed_writes"] = True
        lab.sql((ROOT / "supabase/rollback/compact_ranking_storage.sql").read_text(), DB, "ready-rollback.log")
        assert fingerprint() == expected, "Rollback lost or changed current data"
        summary["rollback_preserved_rows"] = True
        print("PASS rollback preserves all original and post-migration rows", flush=True)
        lab.sql((ROOT / "supabase/migrations/20260910122700_compact_ranking_storage.sql").read_text(), DB, "ready-migration.log")
        assert fingerprint() == expected, "Reapply lost or changed current data"
        summary["reapply_preserved_rows"] = True
        print("PASS reapply preserves all rows, including array dimensions", flush=True)
    finally:
        lab.sql("DELETE FROM public.snapshots WHERE id IN (" + ",".join("'" + s + "'" for s in SNAPSHOTS) + ");", DB)
        summary["fixture_cleanup_preserved_original"] = fingerprint() == initial
        (LAB_ROOT / "rollback-results.json").write_text(json.dumps(summary, indent=2))
    assert all(summary.values()), summary


if __name__ == "__main__":
    main()
