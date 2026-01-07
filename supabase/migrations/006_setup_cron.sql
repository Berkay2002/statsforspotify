-- pg_cron setup for automated snapshot collection
--
-- PREREQUISITES:
-- 1. Go to Supabase Dashboard > Integrations
-- 2. Find and enable "pg_cron"
-- 3. Enable "pg_net" as well (for HTTP requests)
-- 4. Then run this SQL in the SQL Editor
--

-- Schedule daily snapshot collection at 6 AM UTC
SELECT cron.schedule(
  'collect-daily-snapshots',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/collect-snapshots',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- To view scheduled jobs:
-- SELECT * FROM cron.job;

-- To view job run history:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- To unschedule the job:
-- SELECT cron.unschedule('collect-daily-snapshots');
