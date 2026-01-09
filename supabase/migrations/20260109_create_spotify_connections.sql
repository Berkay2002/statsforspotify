-- Create spotify_connections table to manage Spotify OAuth tokens
-- This externalizes token management from auth.users.identities for better control

CREATE TABLE IF NOT EXISTS spotify_connections (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  refresh_token text NOT NULL,
  scope_version int NOT NULL DEFAULT 1,
  status text NOT NULL CHECK (status IN ('connected', 'revoked', 'error')) DEFAULT 'connected',
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add index for querying active connections
CREATE INDEX IF NOT EXISTS idx_spotify_connections_status ON spotify_connections(status);
CREATE INDEX IF NOT EXISTS idx_spotify_connections_last_sync ON spotify_connections(last_sync_at);

-- Add unique constraint to snapshots table for idempotency
-- Prevents duplicate snapshots for same user/UTC-date/time_range
-- Note: We cannot use expression indexes in constraints directly
-- Instead, we'll check for duplicates in the application layer and Edge function

-- Enable RLS for spotify_connections
ALTER TABLE spotify_connections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own connection
CREATE POLICY "Users can read own spotify connection"
  ON spotify_connections
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role: Supabase `service_role` key bypasses RLS and can manage all connections.
-- We intentionally do not define a separate RLS policy for service role here, since it
-- would be redundant and `auth.role() = 'service_role'` is not evaluated when using
-- the service role key. Backend jobs should use the service role key to manage this table.

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_spotify_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_spotify_connections_timestamp
  BEFORE UPDATE ON spotify_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_spotify_connections_updated_at();

-- Add comment for documentation
COMMENT ON TABLE spotify_connections IS 'Stores Spotify OAuth refresh tokens and connection state for cron jobs. Separates token management from auth.users.identities for operational reliability.';
COMMENT ON COLUMN spotify_connections.scope_version IS 'Version of OAuth scopes granted. Increment when requesting new scopes to track permission changes.';
COMMENT ON COLUMN spotify_connections.status IS 'Connection status: connected (active), revoked (user revoked access), error (temporary failure)';
