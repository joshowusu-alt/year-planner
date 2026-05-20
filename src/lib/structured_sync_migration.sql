-- ============================================================
-- STRATUM Planner — Structured Sync Migration
-- Run this after planner_data_migration.sql when you are ready
-- to enable VITE_USE_STRUCTURED_SYNC.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.planner_events (
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id          text NOT NULL,
  payload     jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL,
  deleted_at  timestamptz,
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS planner_events_user_id_idx
  ON public.planner_events(user_id);

ALTER TABLE public.planner_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'planner_events'
      AND policyname = 'Users manage own planner events'
  ) THEN
    CREATE POLICY "Users manage own planner events"
      ON public.planner_events
      FOR ALL
      USING  (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.planner_tasks (
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id          text NOT NULL,
  payload     jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL,
  deleted_at  timestamptz,
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS planner_tasks_user_id_idx
  ON public.planner_tasks(user_id);

ALTER TABLE public.planner_tasks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'planner_tasks'
      AND policyname = 'Users manage own planner tasks'
  ) THEN
    CREATE POLICY "Users manage own planner tasks"
      ON public.planner_tasks
      FOR ALL
      USING  (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.planner_goals (
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id          text NOT NULL,
  payload     jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL,
  deleted_at  timestamptz,
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS planner_goals_user_id_idx
  ON public.planner_goals(user_id);

ALTER TABLE public.planner_goals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'planner_goals'
      AND policyname = 'Users manage own planner goals'
  ) THEN
    CREATE POLICY "Users manage own planner goals"
      ON public.planner_goals
      FOR ALL
      USING  (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.planner_notes (
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id          text NOT NULL,
  payload     jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL,
  deleted_at  timestamptz,
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS planner_notes_user_id_idx
  ON public.planner_notes(user_id);

ALTER TABLE public.planner_notes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'planner_notes'
      AND policyname = 'Users manage own planner notes'
  ) THEN
    CREATE POLICY "Users manage own planner notes"
      ON public.planner_notes
      FOR ALL
      USING  (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.planner_categories (
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id          text NOT NULL,
  payload     jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL,
  deleted_at  timestamptz,
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS planner_categories_user_id_idx
  ON public.planner_categories(user_id);

ALTER TABLE public.planner_categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'planner_categories'
      AND policyname = 'Users manage own planner categories'
  ) THEN
    CREATE POLICY "Users manage own planner categories"
      ON public.planner_categories
      FOR ALL
      USING  (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.planner_month_meta (
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id          text NOT NULL,
  payload     jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL,
  deleted_at  timestamptz,
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS planner_month_meta_user_id_idx
  ON public.planner_month_meta(user_id);

ALTER TABLE public.planner_month_meta ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'planner_month_meta'
      AND policyname = 'Users manage own planner month meta'
  ) THEN
    CREATE POLICY "Users manage own planner month meta"
      ON public.planner_month_meta
      FOR ALL
      USING  (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.planner_vital_few (
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id          text NOT NULL,
  payload     jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL,
  deleted_at  timestamptz,
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS planner_vital_few_user_id_idx
  ON public.planner_vital_few(user_id);

ALTER TABLE public.planner_vital_few ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'planner_vital_few'
      AND policyname = 'Users manage own planner vital few'
  ) THEN
    CREATE POLICY "Users manage own planner vital few"
      ON public.planner_vital_few
      FOR ALL
      USING  (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.planner_weekly_reviews (
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id          text NOT NULL,
  payload     jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL,
  deleted_at  timestamptz,
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS planner_weekly_reviews_user_id_idx
  ON public.planner_weekly_reviews(user_id);

ALTER TABLE public.planner_weekly_reviews ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'planner_weekly_reviews'
      AND policyname = 'Users manage own planner weekly reviews'
  ) THEN
    CREATE POLICY "Users manage own planner weekly reviews"
      ON public.planner_weekly_reviews
      FOR ALL
      USING  (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;