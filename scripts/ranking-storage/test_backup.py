"""Restore the updated backup format into a fresh, fixed-name LOCAL database.

Fails if that database already exists. Keeps the restored clone for inspection.
"""
import json
import subprocess

import local_lab as lab

RESTORED = "stats_storage_backup_restore"


def run(command):
    lab.verify_container()
    result = subprocess.run(lab.PREFIX + ["exec", lab.CONTAINER] + command, capture_output=True)
    if result.returncode:
        (lab.ROOT / "backup-restore-error.private.log").write_bytes(result.stderr)
        raise RuntimeError("Local backup/restore failed; inspect private log")
    return result.stdout


def verify_data():
    lab.DATABASES.add(RESTORED)
    tables = json.loads(lab.sql("""SELECT jsonb_agg(jsonb_build_array(n.nspname,c.relname)
      ORDER BY n.nspname,c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE c.relkind='r' AND n.nspname IN ('public','auth','ranking_storage','ranking_storage_backup');""",
      "stats_storage_ready"))
    for schema, table in tables:
        relation = '"' + schema.replace('"', '""') + '"."' + table.replace('"', '""') + '"'
        query = f"SELECT count(*)||':'||coalesce(md5(string_agg(md5(r::text),'' ORDER BY md5(r::text))),'empty') FROM {relation} r;"
        if lab.sql(query, "stats_storage_ready") != lab.sql(query, RESTORED):
            raise AssertionError(f"Restored table differs: {schema}.{table}")
    summary = {"private_tables_included": 6, "restored_tables_equal": len(tables), "passed": True}
    (lab.ROOT / "backup-restore-results.json").write_text(json.dumps(summary, indent=2))
    print(f"PASS backup restores all {len(tables)} application, Auth and private tables exactly")


def main():
    run(["pg_dump", "-U", "supabase_admin", "-d", "stats_storage_ready", "--format=custom",
         "--schema=public", "--schema=auth", "--schema=ranking_storage", "--schema=ranking_storage_backup",
         "--file=/tmp/stats-ready.dump"])
    toc = run(["pg_restore", "--list", "/tmp/stats-ready.dump"]).decode()
    for kind in ("artist", "track", "album"):
        for suffix in ("metadata", "observations"):
            assert f"TABLE DATA ranking_storage {kind}_{suffix}" in toc
    run(["createdb", "-U", "supabase_admin", "--template=template0", RESTORED])
    lab.DATABASES.add(RESTORED)
    lab.sql('DROP SCHEMA public; CREATE SCHEMA extensions; '
            'CREATE EXTENSION pgcrypto WITH SCHEMA extensions; CREATE EXTENSION pg_trgm WITH SCHEMA extensions; '
            'CREATE EXTENSION "uuid-ossp" WITH SCHEMA extensions; GRANT USAGE ON SCHEMA extensions TO PUBLIC;', RESTORED)
    run(["pg_restore", "-U", "supabase_admin", "-d", RESTORED, "--single-transaction", "--exit-on-error", "/tmp/stats-ready.dump"])
    verify_data()


if __name__ == "__main__":
    main()
