# Workflow Status and Monitoring

This document explains how to monitor the Supabase schema synchronization workflow.

## Adding Status Badge to README

You can add a workflow status badge to your README.md:

```markdown
![Schema Sync](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/sync-supabase-schema.yml/badge.svg)
```

Replace `YOUR_USERNAME` and `YOUR_REPO` with your actual values.

Example:
```markdown
![Schema Sync](https://github.com/Berkay2002/statsforspotify/actions/workflows/sync-supabase-schema.yml/badge.svg)
```

This will show a green badge if the last run succeeded, or red if it failed.

## Monitoring Workflow Runs

### Via GitHub UI

1. Go to **Actions** tab in your repository
2. Select **Sync Supabase Schema** workflow
3. View all historical runs, their status, and logs

### Via GitHub CLI (Optional)

```bash
# List recent workflow runs
gh run list --workflow=sync-supabase-schema.yml

# View specific run
gh run view RUN_ID

# Watch a running workflow
gh run watch
```

## Setting Up Notifications

### Email Notifications

GitHub automatically sends email notifications for workflow failures if you have:
1. Push access to the repository
2. Email notifications enabled in Settings → Notifications

### Slack Notifications (Optional)

Add a Slack notification step to the workflow:

```yaml
- name: Notify Slack on Failure
  if: failure()
  uses: slackapi/slack-github-action@v1.24.0
  with:
    payload: |
      {
        "text": "❌ Schema sync failed",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "Schema sync workflow failed. Check logs: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
            }
          }
        ]
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### GitHub Issues (Optional)

Create an issue automatically on failure:

```yaml
- name: Create Issue on Failure
  if: failure()
  uses: actions/github-script@v7
  with:
    script: |
      github.rest.issues.create({
        owner: context.repo.owner,
        repo: context.repo.repo,
        title: '🚨 Schema Sync Failed',
        body: `The schema sync workflow failed.\n\nSee logs: ${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`,
        labels: ['schema', 'automation', 'bug']
      })
```

## Workflow Logs

### Accessing Logs

1. Go to Actions → Sync Supabase Schema
2. Click on a specific run
3. Expand each step to see detailed logs

### Understanding Log Output

**Successful run:**
```
✅ Schema dumped successfully
✅ Types generated successfully
✅ Schema changes detected and committed
✅ Schema changes committed and pushed
```

**No changes:**
```
✅ Schema dumped successfully
✅ Types generated successfully
✅ Schema is up-to-date, no changes needed
```

**Failure:**
```
❌ Error: Connection refused
❌ Error: Authentication failed
```

## Troubleshooting Workflow Failures

### Connection Errors

**Symptoms:**
- `Connection refused`
- `Could not connect to database`

**Common causes:**
1. Database is paused (Supabase free tier)
2. Wrong project ID in secrets
3. Network connectivity issues

**Solutions:**
1. Wake up database in Supabase Dashboard
2. Verify `SUPABASE_PROJECT_ID` is correct
3. Check Supabase status page

### Authentication Errors

**Symptoms:**
- `Authentication failed`
- `Invalid credentials`
- `Unauthorized`

**Common causes:**
1. Wrong database password
2. Expired access token
3. Missing or incorrect secrets

**Solutions:**
1. Reset database password and update secret
2. Generate new access token
3. Verify all three secrets are set correctly

### Schema Dump Issues

**Symptoms:**
- Empty schema.sql file
- Incomplete schema
- Missing tables

**Common causes:**
1. Supabase CLI version issues
2. Wrong database URL format
3. Insufficient permissions

**Solutions:**
1. Update Supabase CLI in workflow
2. Check DB_URL construction
3. Verify access token has read permissions

### Git Push Failures

**Symptoms:**
- `Failed to push changes`
- `Permission denied`

**Common causes:**
1. Branch protection rules
2. Concurrent workflow runs
3. GitHub token issues

**Solutions:**
1. Allow workflows to push in branch protection
2. Wait for concurrent runs to finish
3. Check `GITHUB_TOKEN` has write permissions

## Monitoring Best Practices

### Daily Checks

✅ **DO:**
- Review automated commits weekly
- Check workflow runs for failures monthly
- Monitor for unexpected schema changes

❌ **DON'T:**
- Ignore workflow failures
- Disable notifications without replacement
- Let schema drift accumulate

### Response Protocol

When a workflow fails:

1. **Check logs** - Identify the specific error
2. **Verify credentials** - Ensure secrets are valid
3. **Check Supabase status** - Database might be down
4. **Attempt re-run** - Many failures are transient
5. **Update documentation** - If you discover a new issue

### Scheduled Review

**Weekly:**
- Review schema change commits
- Ensure changes are expected
- Check for security issues

**Monthly:**
- Review workflow logs for patterns
- Check for recurring failures
- Update documentation if needed

**Quarterly:**
- Rotate access tokens
- Review and update workflow
- Audit schema sync effectiveness

## Workflow Metrics

Track these metrics over time:

- **Success rate**: % of successful runs
- **Schema change frequency**: How often schema changes
- **Failure recovery time**: Time to fix failures
- **False positives**: Unnecessary commits

## Emergency Procedures

### If Workflow is Constantly Failing

1. **Disable scheduled runs** (comment out `schedule:` in workflow)
2. **Investigate root cause** (check logs, secrets, database)
3. **Fix the issue** (update secrets, fix database, etc.)
4. **Test manually** (trigger workflow manually)
5. **Re-enable schedule** (uncomment `schedule:`)

### If Schema Gets Out of Sync

1. **Manually trigger workflow** from GitHub Actions
2. **Review the diff** carefully before merging
3. **Verify database state** in Supabase Dashboard
4. **Document what happened** for future reference

### If Automated Commits Are Unwanted

1. **Review the schema changes** in Supabase
2. **Revert database changes** if they were mistakes
3. **Re-run workflow** to sync the reverted state
4. **Update team procedures** to prevent recurrence

## Contact and Support

If you need help with workflow monitoring:

1. Check this documentation first
2. Review [SCHEMA_SYNC.md](../SCHEMA_SYNC.md)
3. Check GitHub Actions logs
4. Reach out to the team

## Related Documentation

- [SCHEMA_SYNC.md](../SCHEMA_SYNC.md) - Complete schema sync guide
- [SECRETS_SETUP.md](SECRETS_SETUP.md) - Secret configuration
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
