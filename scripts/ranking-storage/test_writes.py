"""Compare the original ranking SQL contract with a migrated LOCAL database.

Run only after applying the migration to the isolated storage lab::

    python scripts/ranking-storage/test_writes.py

Requires the isolated container and private RANKING_STORAGE_LAB directory.
No URL, password, or remote database option is accepted. Ordinary write cases roll back in both databases. The
concurrency cases commit temporary future snapshots in the candidate and clean
them up in finally; run on a disposable clone, never a production database.
"""

from __future__ import annotations

import argparse
import json
import sys
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
import local_lab as lab


LAB_ROOT = lab.ROOT

TABLES = ("artist", "track", "album")
ALLOWED = {"stats_storage_baseline", "stats_storage_ready", "stats_storage_candidate"}
SNAPSHOT = "ff7a096c-3a5a-441a-abde-c04401000001"
SNAPSHOT2 = "ff7a096c-3a5a-441a-abde-c04401000002"


def literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def sql(query: str, database: str) -> str:
    if database not in ALLOWED:
        raise ValueError("Only explicit disposable local storage databases are allowed")
    return lab.sql(query, database)


def role_sql(role: str, user: str = "") -> str:
    if role not in ("admin", "authenticated", "anon", "service_role"):
        raise ValueError(role)
    role_clause = "" if role == "admin" else f"SET LOCAL ROLE {role};"
    return f"SET LOCAL request.jwt.claim.sub = {literal(user)}; {role_clause}"


def insert(kind: str, owner: str, snapshot: str = SNAPSHOT, *,
           key: str = "fixture", rank: int = 1, extra: dict[str, str] | None = None) -> str:
    values = {
        "snapshot_id": literal(snapshot), "user_id": literal(owner),
        f"{kind}_id": literal("storage-test-" + key),
        f"{kind}_name": literal("Storage test " + key), "rank": str(rank),
    }
    if kind in ("track", "album"):
        values.update(artist_id="'storage-test-artist'", artist_name="'Storage artist'")
    if kind == "track":
        values.update(album_id="'storage-test-album'", album_name="'Storage album'")
    values.update(extra or {})
    return (f"INSERT INTO public.{kind}_rankings ({','.join(values)}) "
            f"VALUES ({','.join(values.values())})")


def fixture(owner: str, friend: str, stranger: str) -> str:
    return f"""
    DELETE FROM public.friendships WHERE user_id IN ('{owner}','{friend}','{stranger}')
      OR friend_id IN ('{owner}','{friend}','{stranger}');
    INSERT INTO public.friendships(user_id,friend_id,status)
      VALUES ('{owner}','{friend}','accepted');
    UPDATE public.user_profiles SET stats_visibility='followers'
      WHERE user_id='{owner}';
    INSERT INTO public.snapshots(id,user_id,time_range,created_at) VALUES
      ('{SNAPSHOT}','{owner}','short_term','2198-01-01T12:00:00Z'),
      ('{SNAPSHOT2}','{owner}','short_term','2198-01-02T12:00:00Z');
    """


def transaction(setup: str, action: str, database: str) -> str:
    return sql("BEGIN; SET LOCAL statement_timeout='30s'; " + setup + action + " ROLLBACK;", database)


def expect_error(statement: str, states: tuple[str, ...]) -> str:
    conditions = " OR ".join("SQLSTATE " + literal(state) for state in states)
    return f"""DO $test$ BEGIN
      BEGIN {statement};
        RAISE EXCEPTION 'Expected write rejection, but write succeeded' USING ERRCODE='ZX001';
      EXCEPTION WHEN {conditions} THEN NULL;
      END;
    END $test$;"""


def assert_sql(condition: str, message: str) -> str:
    return ("DO $test$ BEGIN IF NOT (" + condition + ") THEN RAISE EXCEPTION "
            + literal(message) + "; END IF; END $test$;")


class StopSuite(Exception):
    """Stop after a recorded failure while still writing the result summary."""


class Suite:
    def __init__(self, baseline: str, candidate: str, *, fail_fast: bool = False):
        self.baseline = baseline
        self.candidate = candidate
        self.fail_fast = fail_fast
        self.passed: list[str] = []
        self.failed: list[dict[str, str]] = []
        users = json.loads(sql("SELECT json_agg(id) FROM (SELECT id FROM auth.users ORDER BY id LIMIT 3) u;", baseline))
        if not users or len(users) < 3:
            raise RuntimeError("The restored lab needs at least three auth users")
        self.owner, self.friend, self.stranger = users
        self.setup = fixture(*users)

    def run(self, name: str, operation) -> None:
        try:
            operation()
        except Exception as exc:
            self.failed.append({"test": name, "error": str(exc)})
            print("FAIL " + name + ": " + str(exc), flush=True)
            if self.fail_fast:
                raise StopSuite from exc
        else:
            self.passed.append(name)
            print("PASS " + name, flush=True)

    def compare(self, action: str, *, setup: str | None = None) -> None:
        setup = self.setup if setup is None else setup
        expected = transaction(setup, action, self.baseline)
        actual = transaction(setup, action, self.candidate)
        if expected != actual:
            # Do not print restored user data in failure output.
            raise AssertionError("Migrated SQL result differs from original database")

    def reads(self) -> None:
        for kind in TABLES:
            for label, role, user in (
                ("owner", "authenticated", self.owner),
                ("friend", "authenticated", self.friend),
                ("stranger", "authenticated", self.stranger),
                ("anon", "anon", ""),
                ("service", "service_role", ""),
                ("admin", "admin", ""),
            ):
                action = role_sql(role, user) + f"""
                  SELECT jsonb_build_object('count',count(*),'hash',
                    md5(COALESCE(string_agg(to_jsonb(r)::text,'|' ORDER BY id),'')))
                  FROM public.{kind}_rankings r;
                """
                # Real restored rows, including exact UUIDs, timestamps and NULLs.
                self.run(f"{kind}: full read {label}", lambda a=action: self.compare(a, setup=self.setup))

    def writes(self) -> None:
        for kind in TABLES:
            table = f"public.{kind}_rankings"
            select_fixture = f"SELECT to_jsonb(r)-'id'-'created_at' FROM {table} r WHERE snapshot_id='{SNAPSHOT}' ORDER BY rank;"
            for role in ("authenticated", "service_role", "admin"):
                action = role_sql(role, self.owner) + insert(kind, self.owner) + ";"
                action += assert_sql(
                    f"(SELECT id IS NOT NULL AND created_at=now() FROM {table} WHERE snapshot_id='{SNAPSHOT}')",
                    "Omitted ID and timestamp defaults must be generated") + select_fixture
                self.run(f"{kind}: {role} insert defaults", lambda a=action: self.compare(a))

            nullable = {"previous_rank": "NULL", f"{kind}_image_url": "NULL"}
            if kind == "artist":
                nullable.update(genres="NULL", popularity="NULL")
            if kind == "track":
                nullable.update(duration_ms="NULL", popularity="NULL")
            if kind == "album":
                nullable.update(release_date="NULL", total_tracks="NULL")
            action = role_sql("authenticated", self.owner) + insert(kind, self.owner, extra=nullable) + ";" + select_fixture
            self.run(f"{kind}: explicit nullable fields", lambda a=action: self.compare(a))

            for column in ("id", "created_at", f"{kind}_name", "user_id", "snapshot_id"):
                action = role_sql("authenticated", self.owner) + expect_error(
                    insert(kind, self.owner, extra={column: "NULL"}), ("23502", "42501"))
                self.run(f"{kind}: explicit NULL {column} rejected", lambda a=action: self.compare(a))

            for bad_rank in ((0, 51) if kind != "album" else (0,)):
                action = role_sql("authenticated", self.owner) + expect_error(insert(kind, self.owner, rank=bad_rank), ("23514",))
                self.run(f"{kind}: rank {bad_rank} rejected", lambda a=action: self.compare(a))
            if kind == "album":
                action = role_sql("authenticated", self.owner) + insert(kind, self.owner, rank=70000) + ";" + select_fixture
                self.run("album: unbounded positive integer rank", lambda a=action: self.compare(a))

            good = insert(kind, self.owner, key="bulk-good")
            invalid_values = insert(kind, self.owner, key="bulk-bad", rank=0).split(" VALUES ", 1)[1]
            action = role_sql("authenticated", self.owner) + expect_error(good + "," + invalid_values, ("23514",))
            action += assert_sql(f"(SELECT count(*)=0 FROM {table} WHERE snapshot_id='{SNAPSHOT}')", "Partial bulk insert was retained")
            self.run(f"{kind}: bulk invalid row is atomic", lambda a=action: self.compare(a))

            # The original tables permit repeated ranks and repeated Spotify IDs;
            # metadata deduplication must not silently deduplicate ranking rows.
            action = role_sql("service_role") + insert(kind, self.owner) + ";"
            action += insert(kind, self.owner) + ";"
            action += f"SELECT count(*) FROM {table} WHERE snapshot_id='{SNAPSHOT}';"
            self.run(f"{kind}: duplicate item and rank remain separate rows", lambda a=action: self.compare(a))

            fixed_id = {"id": "'ff7a096c-3a5a-441a-abde-c04401000003'"}
            setup_duplicate = self.setup + insert(kind, self.owner, extra=fixed_id) + ";"
            action = role_sql("service_role") + expect_error(insert(kind, self.owner, extra=fixed_id), ("23505",))
            self.run(f"{kind}: duplicate original UUID rejected", lambda a=action, s=setup_duplicate: self.compare(a, setup=s))

            for column in ("snapshot_id", "user_id"):
                action = role_sql("service_role") + expect_error(insert(kind, self.owner, extra={
                    column: "'ff7a096c-3a5a-441a-abde-c04401000009'"}), ("23503",))
                self.run(f"{kind}: missing {column} rejected", lambda a=action: self.compare(a))

            setup = self.setup + insert(kind, self.owner) + ";"
            action = role_sql("authenticated", self.owner) + f"""
              WITH changed AS (UPDATE {table} SET {kind}_name='Changed'
                WHERE snapshot_id='{SNAPSHOT}' RETURNING id) SELECT count(*) FROM changed;
            """ + select_fixture
            self.run(f"{kind}: authenticated UPDATE changes zero rows", lambda a=action, s=setup: self.compare(a, setup=s))

            setup += insert(kind, self.owner, SNAPSHOT2) + ";"
            action = role_sql("service_role") + f"UPDATE {table} SET {kind}_name='Changed' WHERE snapshot_id='{SNAPSHOT}';"
            action += assert_sql(f"(SELECT {kind}_name='Storage test fixture' FROM {table} WHERE snapshot_id='{SNAPSHOT2}')", "Updating one ranking changed historical metadata")
            action += f"SELECT {kind}_name FROM {table} WHERE snapshot_id IN ('{SNAPSHOT}','{SNAPSHOT2}') ORDER BY snapshot_id;"
            self.run(f"{kind}: service UPDATE preserves other history", lambda a=action, s=setup: self.compare(a, setup=s))

            for role, actor in (("authenticated", self.friend), ("authenticated", self.stranger), ("anon", "")):
                label = "friend" if actor == self.friend else "stranger" if actor else "anon"
                action = role_sql(role, actor) + expect_error(insert(kind, self.owner), ("42501",))
                self.run(f"{kind}: {label} cannot insert for owner", lambda a=action: self.compare(a))
                action = role_sql(role, actor) + f"WITH gone AS (DELETE FROM {table} WHERE snapshot_id='{SNAPSHOT}' RETURNING id) SELECT count(*) FROM gone;"
                self.run(f"{kind}: {label} cannot delete owner", lambda a=action, s=setup: self.compare(a, setup=s))

            action = role_sql("authenticated", self.owner) + f"DELETE FROM public.snapshots WHERE id='{SNAPSHOT}';"
            action += f"SELECT count(*) FROM {table} WHERE snapshot_id='{SNAPSHOT}';"
            self.run(f"{kind}: snapshot deletion cascades", lambda a=action, s=setup: self.compare(a, setup=s))

    def erasure(self) -> None:
        action = f"DELETE FROM auth.users WHERE id='{self.owner}';"
        for kind in TABLES:
            action += assert_sql(f"(SELECT count(*)=0 FROM public.{kind}_rankings WHERE user_id='{self.owner}')", "User rankings survived erasure")
        # This is deliberately dynamic: every private storage relation carrying
        # user_id must erase its rows, including unreferenced metadata versions.
        action += f"""DO $erase$ DECLARE r record; remaining bigint; BEGIN
          FOR r IN SELECT c.table_schema,c.table_name FROM information_schema.columns c
            JOIN information_schema.tables t USING (table_schema,table_name)
            WHERE c.table_schema='ranking_storage' AND c.column_name='user_id'
              AND t.table_type='BASE TABLE'
          LOOP
            EXECUTE format('SELECT count(*) FROM %I.%I WHERE user_id=$1',r.table_schema,r.table_name)
              INTO remaining USING '{self.owner}'::uuid;
            IF remaining <> 0 THEN RAISE EXCEPTION 'Private storage survived erasure: %',r.table_name; END IF;
          END LOOP;
        END $erase$;"""
        self.run("user deletion erases rankings and per-user metadata", lambda: self.compare(action))

    def concurrency(self, kind: str, reversed_order: bool) -> None:
        snapshots = [str(uuid.uuid4()), str(uuid.uuid4())]
        token = uuid.uuid4().hex
        # Random dates avoid colliding with another independent test invocation.
        offset = int(token[:7], 16) % 100000
        setup = "INSERT INTO public.snapshots(id,user_id,time_range,created_at) VALUES " + ",".join(
            f"('{sid}','{self.owner}','long_term','2500-01-01'::timestamptz+interval '{offset+i} days')"
            for i, sid in enumerate(snapshots)) + ";"
        barrier = threading.Barrier(2)

        def worker(index: int) -> None:
            order = ("b", "a") if reversed_order and index else ("a", "b")
            query = "BEGIN; SET LOCAL statement_timeout='20s'; SET LOCAL lock_timeout='15s'; " + role_sql("service_role")
            for rank, item in enumerate(order, 1):
                query += insert(kind, self.owner, snapshots[index], key=token + item, rank=rank) + "; SELECT pg_sleep(0.15);"
            query += "COMMIT;"
            barrier.wait(timeout=10)
            sql(query, self.candidate)

        try:
            sql(setup, self.candidate)
            with ThreadPoolExecutor(max_workers=2) as executor:
                futures = [executor.submit(worker, i) for i in range(2)]
                for future in futures:
                    future.result(timeout=40)
            counts = json.loads(sql(f"""SELECT jsonb_build_object('rows',count(*),'names',count(DISTINCT {kind}_name))
              FROM public.{kind}_rankings WHERE snapshot_id IN ('{snapshots[0]}','{snapshots[1]}');""", self.candidate))
            if counts != {"rows": 4, "names": 2}:
                raise AssertionError("Concurrent inserts lost or corrupted rows")
            metadata_shape = sql(f"""SELECT count(*)=2 FROM information_schema.columns
              WHERE table_schema='ranking_storage' AND table_name='{kind}_metadata'
                AND column_name IN ('user_id','{kind}_id');""", self.candidate)
            if metadata_shape == "t":
                versions = int(sql(f"""SELECT count(*) FROM ranking_storage.{kind}_metadata
                  WHERE user_id='{self.owner}' AND {kind}_id IN
                    ('storage-test-{token}a','storage-test-{token}b');""", self.candidate))
                if versions != 2:
                    raise AssertionError(f"Concurrent identical metadata created {versions} versions instead of 2")
        finally:
            sql(f"DELETE FROM public.snapshots WHERE id IN ('{snapshots[0]}','{snapshots[1]}');", self.candidate)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--baseline", choices=sorted(ALLOWED), default="stats_storage_baseline")
    parser.add_argument("--candidate", choices=sorted(ALLOWED), default="stats_storage_ready")
    parser.add_argument("--skip-concurrency", action="store_true")
    parser.add_argument("--skip-reads", action="store_true", help="Skip expensive full-data read comparisons while debugging writes")
    parser.add_argument("--fail-fast", action="store_true", help="Stop on the first failure and still save the summary")
    args = parser.parse_args()
    if args.baseline == args.candidate:
        parser.error("Baseline and candidate must be separate local databases")
    suite = Suite(args.baseline, args.candidate, fail_fast=args.fail_fast)
    try:
        if not args.skip_reads:
            suite.reads()
        suite.writes()
        suite.erasure()
        if not args.skip_concurrency:
            for kind in TABLES:
                for reverse in (False, True):
                    label = "reversed order" if reverse else "identical metadata"
                    suite.run(f"{kind}: concurrent {label}", lambda k=kind, r=reverse: suite.concurrency(k, r))
    except StopSuite:
        pass
    summary = {
        "baseline": args.baseline, "candidate": args.candidate,
        "skip_reads": args.skip_reads, "skip_concurrency": args.skip_concurrency,
        "fail_fast": args.fail_fast, "passed": len(suite.passed),
        "passed_tests": suite.passed, "failed": suite.failed,
    }
    rendered = json.dumps(summary, indent=2)
    (LAB_ROOT / "write-contract-results.json").write_text(rendered + "\n", encoding="utf-8")
    print(rendered)
    return bool(suite.failed)


if __name__ == "__main__":
    sys.exit(main())
