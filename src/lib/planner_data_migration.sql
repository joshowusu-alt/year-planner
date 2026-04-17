-- ============================================================
-- STRATUM Planner — Supabase Setup SQL
-- Run this entire script in the SQL Editor of your Supabase
-- project (gnaxneghoochsfeasyra) to set up all required tables.
-- https://supabase.com/dashboard/project/gnaxneghoochsfeasyra/sql
-- ============================================================

-- ── 1. Main planner data table ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.planner_data (
  user_id  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  store    jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.planner_data ENABLE ROW LEVEL SECURITY;

-- Each user can only read/write their own row
CREATE POLICY "Users manage own data"
  ON public.planner_data
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 2. Planner shares table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.planner_shares (
  token          text PRIMARY KEY,
  owner_user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label          text,
  created_at     timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS planner_shares_owner_idx
  ON public.planner_shares(owner_user_id);

ALTER TABLE public.planner_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their own shares"
  ON public.planner_shares
  FOR ALL
  USING  (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Public can read share tokens"
  ON public.planner_shares
  FOR SELECT
  USING (true);

-- ── 3. Push subscriptions table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint     text UNIQUE NOT NULL,
  subscription jsonb NOT NULL,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx
  ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access"
  ON public.push_subscriptions
  USING (true)
  WITH CHECK (true);
