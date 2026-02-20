-- ============================================
-- uDown Database Schema
-- Run this in your Supabase SQL editor
-- ============================================

-- PROFILES
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  couple_id uuid,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

-- COUPLES
create table couples (
  id uuid primary key default gen_random_uuid(),
  user1_id uuid not null references profiles(id),
  user2_id uuid not null references profiles(id),
  last_match date,
  created_at timestamptz default now()
);

alter table couples enable row level security;

create policy "Couple members can read their couple"
  on couples for select using (
    auth.uid() = user1_id or auth.uid() = user2_id
  );

-- INVITES
create table invites (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  created_by uuid not null references profiles(id),
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

alter table invites enable row level security;

create policy "Anyone authenticated can read invites"
  on invites for select using (auth.role() = 'authenticated');

create policy "Users can create invites"
  on invites for insert with check (auth.uid() = created_by);

-- DAILY RESPONSES
create table daily_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  couple_id uuid not null references couples(id),
  date date not null,
  response text not null check (response in ('yes', 'no')),
  created_at timestamptz default now(),
  unique(user_id, date)
);

alter table daily_responses enable row level security;

create policy "Users can manage own responses"
  on daily_responses for all using (auth.uid() = user_id);

-- PUSH SUBSCRIPTIONS
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references profiles(id),
  subscription text not null,
  updated_at timestamptz default now()
);

alter table push_subscriptions enable row level security;

create policy "Users can manage own subscriptions"
  on push_subscriptions for all using (auth.uid() = user_id);

-- ============================================
-- Done! Your schema is ready.
-- ============================================
