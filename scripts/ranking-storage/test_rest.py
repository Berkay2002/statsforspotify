"""Exercise the real PostgREST API in the isolated local storage lab.

Requires two PostgREST instances sharing the network-disabled lab container:
ready on loopback:3000 and baseline on loopback:3001. No remote URL is accepted.
Temporary snapshots are committed and removed in finally on BOTH local clones.
"""
import base64
import hashlib
import hmac
import json
import subprocess
import time
import uuid

from test_writes import lab, LAB_ROOT, TABLES

SECRET = b"local-storage-lab-only-never-use-in-production-20260910"
SNAPSHOT = "bf5b95b0-cf46-439b-825a-000000000001"
DATABASES = {"stats_storage_baseline": 3001, "stats_storage_ready": 3000}
HTTP = """
import json,sys,urllib.request,urllib.error
r=json.load(sys.stdin)
assert r['port'] in (3000,3001)
req=urllib.request.Request('http://127.0.0.1:'+str(r['port'])+r['path'],
 data=json.dumps(r['body']).encode() if r['body'] is not None else None,
 method=r['method'],headers=r['headers'])
try: response=urllib.request.urlopen(req,timeout=45)
except urllib.error.HTTPError as e: response=e
body=response.read().decode()
print(json.dumps({'status':response.status,'body':json.loads(body) if body else None}))
"""


def token(role, owner):
    def b64(value):
        return base64.urlsafe_b64encode(value).rstrip(b"=")
    data = b".".join(b64(json.dumps(x).encode()) for x in (
        {"alg": "HS256", "typ": "JWT"},
        {"role": role, "sub": owner, "exp": int(time.time()) + 3600},
    ))
    return (data + b"." + b64(hmac.new(SECRET, data, hashlib.sha256).digest())).decode()


def request(db, method, path, owner, body=None, role="authenticated"):
    payload = {"port": DATABASES[db], "method": method, "path": path, "body": body,
               "headers": {"Authorization": "Bearer " + token(role, owner),
                           "Content-Type": "application/json", "Prefer": "return=representation"}}
    result = subprocess.run(lab.PREFIX + ["exec", "-i", lab.CONTAINER, "python3", "-c", HTTP],
                            input=json.dumps(payload), text=True, capture_output=True, check=True)
    return json.loads(result.stdout)


def main():
    users = json.loads(lab.sql("SELECT jsonb_agg(id ORDER BY id) FROM auth.users"))
    owner, other = users[:2]
    passed = []
    failures = []

    def check(condition, label):
        if not condition:
            failures.append(label)
            raise AssertionError(label)
        passed.append(label)
        print("PASS", label, flush=True)

    def both(method, path, body=None, role="authenticated", user=owner):
        return [request(db, method, path, user, body, role) for db in DATABASES]

    try:
        for db in DATABASES:
            lab.sql(f"INSERT INTO public.snapshots(id,user_id,time_range,created_at) VALUES "
                    f"('{SNAPSHOT}','{owner}','short_term','2196-01-01T12:00:00Z');", db)
        for kind in TABLES:
            endpoint = f"/{kind}_rankings"
            row = {"snapshot_id": SNAPSHOT, "user_id": owner, "rank": 1,
                   f"{kind}_id": "rest-storage-test", f"{kind}_name": "REST fixture"}
            if kind != "artist":
                row.update(artist_id="rest-artist", artist_name="REST artist")
            if kind == "track":
                row.update(album_id="rest-album", album_name="REST album")
            responses = both("POST", endpoint, [row, {**row, "rank": 2}])
            check(all(r["status"] == 201 and len(r["body"]) == 2 for r in responses),
                  f"{kind}: authenticated bulk insert with RETURNING")
            check(all(all(uuid.UUID(x["id"]) and x["created_at"] for x in r["body"]) for r in responses),
                  f"{kind}: generated UUID and timestamp defaults")
            fields = f"{kind}_id,{kind}_name,rank,snapshots(id)"
            query = endpoint + f"?snapshot_id=eq.{SNAPSHOT}&select={fields}&order=rank"
            responses = both("GET", query)
            check(responses[0] == responses[1] and responses[0]["status"] == 200
                  and len(responses[0]["body"]) == 2, f"{kind}: FK view embedding and read parity")
            responses = both("PATCH", endpoint + f"?snapshot_id=eq.{SNAPSHOT}", {"rank": 3})
            check(all(r == {"status": 200, "body": []} for r in responses),
                  f"{kind}: authenticated UPDATE affects zero rows")
            responses = both("PATCH", endpoint + f"?snapshot_id=eq.{SNAPSHOT}&rank=eq.2",
                             {f"{kind}_name": "Revised metadata"}, role="service_role")
            check(all(r["status"] == 200 and len(r["body"]) == 1 for r in responses),
                  f"{kind}: service UPDATE with RETURNING")
            responses = both("GET", query)
            check(responses[0] == responses[1] and responses[0]["body"][0][f"{kind}_name"] == "REST fixture",
                  f"{kind}: metadata update leaves earlier observation intact")
            responses = both("POST", endpoint, [{**row, "rank": 3}, {**row, "rank": 0}])
            check(all(r["status"] == 400 and r["body"]["code"] == "23514" for r in responses),
                  f"{kind}: invalid batch returns original constraint status")
            responses = both("GET", query)
            check(all(len(r["body"]) == 2 for r in responses), f"{kind}: invalid batch rolls back all rows")
            responses = both("POST", endpoint, {**row, "id": None})
            check(all(r["status"] == 400 and r["body"]["code"] == "23502" for r in responses),
                  f"{kind}: explicit NULL is distinct from omitted default")
            responses = both("POST", endpoint, row, user=other)
            check(all(r["status"] == 403 and r["body"]["code"] == "42501" for r in responses),
                  f"{kind}: cross-owner INSERT is forbidden")
            responses = both("DELETE", endpoint + f"?snapshot_id=eq.{SNAPSHOT}", user=other)
            check(all(r == {"status": 200, "body": []} for r in responses),
                  f"{kind}: cross-owner DELETE affects zero rows")
            responses = both("DELETE", endpoint + f"?snapshot_id=eq.{SNAPSHOT}")
            check(all(r["status"] == 200 and len(r["body"]) == 2 for r in responses),
                  f"{kind}: owner DELETE with RETURNING")
    finally:
        for db in DATABASES:
            lab.sql(f"DELETE FROM public.snapshots WHERE id='{SNAPSHOT}';", db)
        (LAB_ROOT / "rest-contract-results.json").write_text(json.dumps(
            {"passed": len(passed), "passed_tests": passed, "failed": failures}, indent=2))
    print(f"{len(passed)} REST checks passed.")


if __name__ == "__main__":
    main()
