-- Run this in your Supabase SQL Editor to enable sharing
create table if not exists public.planner_shares (
  token text primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  label text,
  created_at timestamptz default now() not null
);

-- Index for looking up shares by owner
create index if not exists planner_shares_owner_idx on public.planner_shares(owner_user_id);

-- Row Level Security
alter table public.planner_shares enable row level security;

-- Owners can read/write their own shares
create policy "Owners manage their own shares"
  on public.planner_shares
  for all
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

-- Public token resolution is handled by the server-side /api/shared-planner route.
-- No direct public client select policy is required.

