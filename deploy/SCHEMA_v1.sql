-- ═══════════════════════════════════════════════════════════════════════════
-- G-Index Supabase SCHEMA v1.0
-- Створено: 21.04.2026
-- Застосування: Supabase → SQL Editor → New query → вставити → RUN
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Table 1: profiles ──
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  plan        text default 'free' check (plan in ('free','plus','pro','enterprise')),
  display_name text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

comment on table public.profiles is 'User profiles (extends auth.users). Auto-created on signup via trigger.';

-- ── Table 2: user_preferences ──
create table if not exists public.user_preferences (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  settings    jsonb default '{}'::jsonb,
  updated_at  timestamptz default now()
);

comment on table public.user_preferences is 'Flexible user settings (profile type, notifications, UI state).';

-- ── Table 3: push_subscriptions ──
create table if not exists public.push_subscriptions (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth_key    text not null,
  user_agent  text,
  created_at  timestamptz default now()
);

comment on table public.push_subscriptions is 'VAPID push endpoints. Used by Edge Function send-push.';

create index if not exists idx_push_user on public.push_subscriptions(user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- Auto-create profile on signup
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, created_at)
  values (new.id, new.email, now())
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id, settings)
  values (new.id, '{}'::jsonb)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS — кожен user бачить тільки СВОЇ дані
-- ═══════════════════════════════════════════════════════════════════════════
alter table public.profiles enable row level security;

drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update"
  on public.profiles for update
  using (auth.uid() = id);

alter table public.user_preferences enable row level security;

drop policy if exists "prefs_self_read" on public.user_preferences;
create policy "prefs_self_read"
  on public.user_preferences for select
  using (auth.uid() = user_id);

drop policy if exists "prefs_self_upsert" on public.user_preferences;
create policy "prefs_self_upsert"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

drop policy if exists "prefs_self_update" on public.user_preferences;
create policy "prefs_self_update"
  on public.user_preferences for update
  using (auth.uid() = user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_self_read" on public.push_subscriptions;
create policy "push_self_read"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "push_self_insert" on public.push_subscriptions;
create policy "push_self_insert"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

drop policy if exists "push_self_delete" on public.push_subscriptions;
create policy "push_self_delete"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

-- updated_at auto-update
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists profiles_updated on public.profiles;
create trigger profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists prefs_updated on public.user_preferences;
create trigger prefs_updated
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- NEXT STEPS:
-- 1. Після RUN: select * from public.profiles;  — має бути 0 рядків
-- 2. У Authentication → URL Configuration:
--    Site URL:       https://nikolaevkirill-commits.github.io/g-index/deploy/
--    Redirect URLs:  https://nikolaevkirill-commits.github.io/g-index/deploy/**
--                    http://localhost:*/**
-- 3. Deploy v87.63 на GitHub Pages
-- 4. Тест login: dashboard → 🔐 Увійти → email → inbox → клік magic link
-- 5. Перевір: select * from public.profiles;  — має бути 1 запис
-- ═══════════════════════════════════════════════════════════════════════════
