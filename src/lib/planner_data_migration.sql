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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'planner_data'
      AND policyname = 'Users manage own data'
  ) THEN
    CREATE POLICY "Users manage own data"
      ON public.planner_data
      FOR ALL
      USING  (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'planner_shares'
      AND policyname = 'Owners manage their own shares'
  ) THEN
    CREATE POLICY "Owners manage their own shares"
      ON public.planner_shares
      FOR ALL
      USING  (auth.uid() = owner_user_id)
      WITH CHECK (auth.uid() = owner_user_id);
  END IF;
END
$$;

-- NOTE: Public token resolution is handled server-side by /api/shared-planner
-- which uses the service_role key. No direct public client access is needed.

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

-- Server-side API functions use the service role key and bypass RLS automatically.
-- This explicit policy restricts direct DB access via any other role.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'push_subscriptions'
      AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access"
      ON public.push_subscriptions
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

-- Authenticated users can only read/delete their own subscription rows.
-- (The frontend never queries this table directly, but this policy is a safe guard.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'push_subscriptions'
      AND policyname = 'Users manage own subscriptions'
  ) THEN
    CREATE POLICY "Users manage own subscriptions"
      ON public.push_subscriptions
      FOR ALL
      TO authenticated
      USING  (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

-- ── 4. Structured sync tables (feature-flagged dual-write/read migration) ───
-- Run src/lib/structured_sync_migration.sql when you are ready to enable
-- VITE_USE_STRUCTURED_SYNC. Keeping it separate makes rollout safer.
