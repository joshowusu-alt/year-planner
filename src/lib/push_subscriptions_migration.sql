-- Run this in your Supabase SQL editor
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text UNIQUE NOT NULL,
  subscription jsonb NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for user lookup
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON push_subscriptions(user_id);

-- RLS: only the server (service role) can write; deny direct client access
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- The subscribe/unsubscribe API routes use service_role key (bypasses RLS).
-- Deny all direct client access to this table.
-- NOTE: if you prefer to allow users to read their own subscriptions from the client,
-- you can replace this with an owner-scoped SELECT policy:
--   CREATE POLICY "Users read own subscriptions"
--     ON push_subscriptions FOR SELECT USING (auth.uid() = user_id);
-- For now, all access goes through the API routes only.
