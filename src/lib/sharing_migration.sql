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

-- Anyone can read a share token (needed for the public share feature)
create policy "Public can read share tokens"
  on public.planner_shares
  for select
  using (true);
