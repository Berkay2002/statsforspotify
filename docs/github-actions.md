# GitHub Actions setup

The repository's workflows are listed in [`.github/README.md`](../.github/README.md). This page covers the secrets they need and how to inspect their runs.

## Secrets

Add these under **Settings → Secrets and variables → Actions** as repository secrets.

| Secret | What it is | Where to find it |
| --- | --- | --- |
| `SUPABASE_ACCESS_TOKEN` | Personal access token for the Supabase API, read access to the project schema | Supabase Dashboard → account menu → **Account Settings → Access Tokens** |
| `SUPABASE_PROJECT_ID` | Project reference ID (not secret, stored as one for consistency) | **Project Settings → General → Reference ID**, or the `/project/<id>` segment of the dashboard URL |
| `SUPABASE_DB_PASSWORD` | Database password for the direct Postgres connection | **Project Settings → Database → Connection string**; reset it there if unknown |

> [!CAUTION]
> `SUPABASE_DB_PASSWORD` grants full database access. Rotate it if it is ever exposed, and update the secret afterwards.

Verify the setup by dispatching **Sync Supabase Schema** manually from the **Actions** tab. A successful run confirms all three secrets.

## Monitoring runs

Via the **Actions** tab, or the CLI:

```bash
gh run list --workflow=sync-supabase-schema.yml
gh run view <run-id>
gh run watch
```

GitHub emails workflow failures to users with push access who have notifications enabled.

A status badge, if you want one in the README:

```markdown
![Schema Sync](https://github.com/<owner>/<repo>/actions/workflows/sync-supabase-schema.yml/badge.svg)
```

## Common failures

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `Connection refused` | Supabase free-tier database auto-paused, or wrong project ID | Wake the database in the dashboard, confirm `SUPABASE_PROJECT_ID` |
| `Authentication failed` | Expired access token or wrong database password | Regenerate the token / reset the password, update the secret |
| Empty or partial `schema.sql` | Supabase CLI version or insufficient token permissions | Bump the CLI pin in the workflow, re-issue the token |
| `Failed to push changes` | Branch protection or a concurrent run | Allow Actions to push, or wait for the other run |

Most connection failures are transient — re-run before investigating further. If runs fail persistently, comment out the `schedule:` block while you fix the cause, then restore it.
