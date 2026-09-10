"""Deterministic, local-only concurrency checks for compact ranking storage.

Uses independent lab.sql/psql sessions. A local gate table and advisory locks
hold the first writer *after* its mutation until the competing statement has
actually blocked. No timing-only race assertions or remote connection options.
Temporary snapshots and the gate table are deleted even after a test failure.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager

from test_writes import ALLOWED, LAB_ROOT, TABLES, expect_error, insert, literal, role_sql, sql


class ConcurrencySuite:
    def __init__(self, database: str):
        self.database = database
        self.token = uuid.uuid4().hex
        self.gate_table = "public._ranking_concurrency_" + self.token
        self.passed: list[str] = []
        self.failed: list[dict[str, str]] = []
        users = json.loads(self.sql("SELECT json_agg(id) FROM (SELECT id FROM auth.users ORDER BY id LIMIT 2) u;"))
        if not users or len(users) != 2:
            raise RuntimeError("The local restored database requires two existing auth users")
        self.owner, self.new_owner = users

    def sql(self, query: str) -> str:
        return sql(query, self.database)

    def run(self, name: str, operation) -> None:
        try:
            operation()
        except Exception as exc:
            self.failed.append({"test": name, "error": str(exc)})
            print("FAIL " + name + ": " + str(exc), flush=True)
        else:
            self.passed.append(name)
            print("PASS " + name, flush=True)

    @contextmanager
    def fixture(self):
        token = uuid.uuid4().hex
        snapshots = [str(uuid.uuid4()) for _ in range(4)]
        rows = [str(uuid.uuid4()) for _ in range(3)]
        offset = int(token[:7], 16) % 100000
        values = ",".join(
            f"('{sid}','{self.owner if index < 3 else self.new_owner}','medium_term',"
            f"'3500-01-01'::timestamptz+interval '{offset+index} days')"
            for index, sid in enumerate(snapshots))
        try:
            self.sql("INSERT INTO public.snapshots(id,user_id,time_range,created_at) VALUES " + values + ";")
            yield {"token": token, "snapshots": snapshots, "rows": rows}
        finally:
            self.sql("DELETE FROM public.snapshots WHERE id IN (" + ",".join(map(literal, snapshots)) + ");")

    def add_row(self, kind: str, fixture: dict, index: int = 0) -> None:
        self.sql(insert(kind, self.owner, fixture["snapshots"][index], key=fixture["token"],
                        extra={"id": literal(fixture["rows"][index])}) + ";")

    def wait_for(self, condition: str, description: str, futures=()) -> None:
        deadline = time.monotonic() + 15
        while time.monotonic() < deadline:
            for future in futures:
                if future.done():
                    future.result()
                    raise AssertionError("Session completed before " + description)
            if self.sql("SELECT EXISTS(" + condition + ");") == "t":
                return
            time.sleep(0.025)
        raise TimeoutError("Did not observe " + description)

    def blocked(self, name: str, futures=()) -> None:
        self.wait_for(
            "SELECT 1 FROM pg_stat_activity WHERE application_name=" + literal(name)
            + " AND wait_event_type='Lock' AND lower(wait_event)='advisory'",
            "writer blocked on advisory lock", futures)

    def race(self, first_action: str, second_action: str, *, second_role: str = "service_role") -> dict:
        """Return competing statement outcome after proving stale-snapshot overlap."""
        token = uuid.uuid4().hex
        gate_key = int(token[:14], 16)
        gate_name, first_name, second_name = ("rs-gate-" + token, "rs-first-" + token, "rs-second-" + token)
        self.sql(f"INSERT INTO {self.gate_table}(id,released) VALUES ('{token}',false);")
        gate = f"""BEGIN; SET LOCAL application_name='{gate_name}';
          SET LOCAL statement_timeout='35s';
          SELECT pg_advisory_xact_lock({gate_key}::bigint);
          DO $gate$ DECLARE finished boolean; BEGIN
            FOR attempt IN 1..1500 LOOP
              SELECT released INTO finished FROM {self.gate_table} WHERE id='{token}';
              IF finished THEN RETURN; END IF;
              PERFORM pg_sleep(0.02);
            END LOOP;
            RAISE EXCEPTION 'Concurrency gate timed out';
          END $gate$; COMMIT;"""
        first = f"""BEGIN; SET LOCAL application_name='{first_name}';
          SET LOCAL statement_timeout='30s'; {role_sql('service_role')}
          {first_action}; SELECT pg_advisory_xact_lock({gate_key}::bigint); COMMIT;"""
        second = f"""BEGIN; SET LOCAL application_name='{second_name}';
          SET LOCAL statement_timeout='30s'; {role_sql(second_role, self.owner)}
          CREATE TEMP TABLE concurrency_outcome(state text,affected bigint);
          DO $write$ DECLARE changed bigint; BEGIN
            {second_action}; GET DIAGNOSTICS changed = ROW_COUNT;
            INSERT INTO concurrency_outcome VALUES ('ok',changed);
          EXCEPTION WHEN serialization_failure THEN
            INSERT INTO concurrency_outcome VALUES ('40001',0);
          END $write$;
          SELECT row_to_json(r) FROM concurrency_outcome r; COMMIT;"""
        with ThreadPoolExecutor(max_workers=3) as executor:
            gate_future = executor.submit(self.sql, gate)
            first_future = second_future = None
            try:
                self.wait_for(
                    "SELECT 1 FROM pg_locks l JOIN pg_stat_activity a ON a.pid=l.pid "
                    f"WHERE a.application_name='{gate_name}' AND l.locktype='advisory' AND l.granted",
                    "gate lock acquired", (gate_future,))
                first_future = executor.submit(self.sql, first)
                self.blocked(first_name, (first_future, gate_future))
                second_future = executor.submit(self.sql, second)
                self.blocked(second_name, (second_future, first_future, gate_future))
            finally:
                # Release the first writer even when setup or overlap assertion fails.
                self.sql(f"UPDATE {self.gate_table} SET released=true WHERE id='{token}';")
            gate_future.result(timeout=35)
            if first_future is not None:
                first_future.result(timeout=35)
            if second_future is None:
                raise AssertionError("Competing writer never started")
            output = second_future.result(timeout=35)
        self.sql(f"DELETE FROM {self.gate_table} WHERE id='{token}';")
        return json.loads(output)

    def ownership_transfer(self, kind: str) -> None:
        with self.fixture() as fixture:
            self.add_row(kind, fixture)
            row_id = fixture["rows"][0]
            result = self.race(
                f"UPDATE public.{kind}_rankings SET user_id='{self.new_owner}',"
                f"snapshot_id='{fixture['snapshots'][3]}' WHERE id='{row_id}'",
                f"DELETE FROM public.{kind}_rankings WHERE id='{row_id}'",
                second_role="authenticated")
            if result not in ({"state": "40001", "affected": 0}, {"state": "ok", "affected": 0}):
                raise AssertionError("Old owner deleted a concurrently transferred row")
            retained = self.sql(f"SELECT count(*)=1 FROM public.{kind}_rankings WHERE id='{row_id}' AND user_id='{self.new_owner}';")
            if retained != "t":
                raise AssertionError("Transferred row was lost or ownership reverted")

    def disjoint_updates(self, kind: str) -> None:
        with self.fixture() as fixture:
            self.add_row(kind, fixture)
            row_id = fixture["rows"][0]
            second = f"UPDATE public.{kind}_rankings SET rank=2 WHERE id='{row_id}'"
            result = self.race(
                f"UPDATE public.{kind}_rankings SET {kind}_name='Concurrent changed name' WHERE id='{row_id}'",
                second)
            if result["state"] == "40001":
                self.sql("BEGIN;" + role_sql("service_role") + second + "; COMMIT;")
            elif result != {"state": "ok", "affected": 1}:
                raise AssertionError("Concurrent disjoint update unexpectedly disappeared")
            preserved = self.sql(f"SELECT count(*)=1 FROM public.{kind}_rankings WHERE id='{row_id}' AND rank=2 AND {kind}_name='Concurrent changed name';")
            if preserved != "t":
                raise AssertionError("One concurrent disjoint update silently overwrote the other")

    def prune_and_reuse(self, kind: str) -> None:
        with self.fixture() as fixture:
            self.add_row(kind, fixture, 0)
            self.add_row(kind, fixture, 1)
            new_row = insert(kind, self.owner, fixture["snapshots"][2], key=fixture["token"],
                             extra={"id": literal(fixture["rows"][2])})
            result = self.race(
                "DELETE FROM public.snapshots WHERE id IN ("
                + ",".join(map(literal, fixture["snapshots"][:2])) + ")", new_row)
            if result["state"] == "40001":
                self.sql("BEGIN;" + role_sql("service_role") + new_row + "; COMMIT;")
            elif result != {"state": "ok", "affected": 1}:
                raise AssertionError("Concurrent metadata reuse insert disappeared")
            item_id = "storage-test-" + fixture["token"]
            counts = json.loads(self.sql(f"""SELECT jsonb_build_object(
              'rows',(SELECT count(*) FROM public.{kind}_rankings WHERE {kind}_id='{item_id}'),
              'metadata',(SELECT count(*) FROM ranking_storage.{kind}_metadata WHERE {kind}_id='{item_id}' AND user_id='{self.owner}'),
              'orphans',(SELECT count(*) FROM ranking_storage.{kind}_metadata m
                WHERE m.{kind}_id='{item_id}' AND NOT EXISTS(SELECT 1 FROM ranking_storage.{kind}_observations o WHERE o.metadata_key=m.metadata_key)));"""))
            if counts != {"rows": 1, "metadata": 1, "orphans": 0}:
                raise AssertionError("Concurrent metadata pruning/reuse lost data or left orphan metadata")

    def isolation(self, kind: str, level: str, operation: str) -> None:
        with self.fixture() as fixture:
            self.add_row(kind, fixture)
            row_id = fixture["rows"][0]
            actions = {
                "insert": insert(kind, self.owner, fixture["snapshots"][1], key=fixture["token"]),
                "update": f"UPDATE public.{kind}_rankings SET rank=2 WHERE id='{row_id}'",
                "delete": f"DELETE FROM public.{kind}_rankings WHERE id='{row_id}'",
                "cascade": f"DELETE FROM public.snapshots WHERE id='{fixture['snapshots'][0]}'",
            }
            self.sql(f"BEGIN ISOLATION LEVEL {level};" + role_sql("service_role")
                     + expect_error(actions[operation], ("0A000",)) + "ROLLBACK;")
            if self.sql(f"SELECT count(*)=1 FROM public.{kind}_rankings WHERE id='{row_id}';") != "t":
                raise AssertionError("Rejected isolation-level write changed the existing ranking")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--candidate", choices=sorted(ALLOWED - {"stats_storage_baseline"}), default="stats_storage_ready")
    parser.add_argument("--skip-races", action="store_true")
    parser.add_argument("--skip-isolation", action="store_true")
    args = parser.parse_args()
    suite = ConcurrencySuite(args.candidate)
    try:
        suite.sql(f"CREATE TABLE {suite.gate_table}(id text PRIMARY KEY,released boolean NOT NULL);")
        for kind in TABLES:
            if not args.skip_races:
                suite.run(f"{kind}: transferred ownership survives stale owner DELETE", lambda k=kind: suite.ownership_transfer(k))
                suite.run(f"{kind}: disjoint concurrent UPDATE retains both fields", lambda k=kind: suite.disjoint_updates(k))
                suite.run(f"{kind}: shared metadata cascade and concurrent reuse", lambda k=kind: suite.prune_and_reuse(k))
            if not args.skip_isolation:
                for level in ("REPEATABLE READ", "SERIALIZABLE"):
                    for operation in ("insert", "update", "delete", "cascade"):
                        suite.run(f"{kind}: {level} {operation} rejects 0A000",
                                  lambda k=kind, l=level, o=operation: suite.isolation(k, l, o))
    finally:
        suite.sql(f"DROP TABLE IF EXISTS {suite.gate_table};")
        summary = {"candidate": args.candidate, "passed": len(suite.passed),
                   "passed_tests": suite.passed, "failed": suite.failed,
                   "skip_races": args.skip_races, "skip_isolation": args.skip_isolation}
        rendered = json.dumps(summary, indent=2)
        (LAB_ROOT / "concurrency-edge-results.json").write_text(rendered + "\n", encoding="utf-8")
        print(rendered)
    return bool(suite.failed)


if __name__ == "__main__":
    sys.exit(main())
