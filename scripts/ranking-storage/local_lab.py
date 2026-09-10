"""Local-only SQL transport for the disposable, network-disabled storage lab.

No connection URL or remote host is accepted. Private outputs stay outside Git.
"""
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(os.environ.get("RANKING_STORAGE_LAB",
    "C:/Users/berka/.codex/scratch/statsforspotify-storage-lab-20260910"))
CONTAINER = "statsforspotify-storage-lab-20260910"
PREFIX = (["wsl", "-d", os.environ.get("RANKING_STORAGE_DOCKER_DISTRO", "DeepSWE-Docker"), "--"]
          if sys.platform == "win32" else []) + ["docker", "--host", "unix:///var/run/docker.sock"]
DATABASES = {"stats_storage_baseline", "stats_storage_ready", "stats_storage_candidate"}
_verified = False


def verify_container():
    global _verified
    if _verified:
        return
    result = subprocess.run(PREFIX + ["inspect", CONTAINER], capture_output=True, text=True, check=True)
    config = json.loads(result.stdout)[0]
    if (config["HostConfig"]["NetworkMode"] != "none"
            or config["HostConfig"].get("PortBindings")
            or "cron.launch_active_jobs=off" not in config["Config"]["Cmd"]):
        raise RuntimeError("Lab must have network=none, no host ports and cron jobs disabled")
    if not ROOT.is_dir():
        raise RuntimeError("Set RANKING_STORAGE_LAB to an existing private artifact directory")
    _verified = True


def sql(query, database="stats_storage_baseline", log=None):
    verify_container()
    if database not in DATABASES:
        raise ValueError("Only allowlisted disposable local database names are accepted")
    result = subprocess.run(PREFIX + ["exec", "-i", CONTAINER, "psql", "-X", "-q", "-A", "-t",
        "-U", "supabase_admin", "-d", database, "-v", "ON_ERROR_STOP=1"],
        input=query, text=True, encoding="utf-8", capture_output=True)
    if log:
        if Path(log).name != log:
            raise ValueError("Log must be a filename inside the private lab directory")
        (ROOT / log).write_text(result.stdout + result.stderr, encoding="utf-8")
    if result.returncode:
        errors = [line for line in result.stderr.splitlines() if "ERROR:" in line or "FATAL:" in line]
        raise RuntimeError("Local PostgreSQL failed: " + "\n".join(errors))
    return result.stdout.strip()
