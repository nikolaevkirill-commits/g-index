-- ═════════════════════════════════════════════════════════════════════════
-- G-Index Backend — Supabase Postgres schema v1
-- Created: 2026-04-19 (v87.36)
-- Usage:
--   1. Create new Supabase project at https://supabase.com/dashboard
--   2. SQL Editor → paste this file → Run
--   3. Copy URL + anon key to client (window._supabase_url / _supabase_key)
--   4. Auth → Email/Magic Link enabled by default
-- ═════════════════════════════════════════════════════════════════════════

-- ══════════════════ Extensions ══════════════════
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ══════════════════ 1) user_profiles ══════════════════
-- Розширення auth.users з публічними полями. RLS: own row only.
create table if not exists public.user_profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  display_name text,
  tier         text not null default 'free' check (tier in ('free','plus','pro','enterprise')),
  locale       text default 'uk',
  timezone     text default 'Europe/Kyiv',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

create policy "Users view own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "Users update own profile"
  on public.user_profiles for update
  using (auth.uid() = id);

-- Авто-вставка рядка при signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ══════════════════ 2) personal_profiles ══════════════════
-- Серверні дублі slot-ів personalData_0/1/2 (birthdate, coords, Nakshatra).
-- Синхронізуються з localStorage при login.
create table if not exists public.personal_profiles (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  slot_idx      smallint not null check (slot_idx between 0 and 2),
  name          text,
  birth_date    date,
  birth_time    time,
  birth_tz_off  real,
  birth_lat     double precision,
  birth_lon     double precision,
  profile       text default 'off' check (profile in ('off','med','pilot','mil','trader')),
  natal_nak_idx smallint,
  natal_pada    smallint,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, slot_idx)
);

alter table public.personal_profiles enable row level security;

create policy "Users manage own personal_profiles"
  on public.personal_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ══════════════════ 3) push_subscriptions ══════════════════
-- Web Push API subscriptions (VAPID). Один юзер → багато пристроїв.
create table if not exists public.push_subscriptions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth_secret text not null,
  user_agent  text,
  last_seen   timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "Users manage own push subs"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ══════════════════ 4) subscriptions ══════════════════
-- Stripe monetization — active paid subscriptions. Writable only by service role.
create table if not exists public.subscriptions (
  id                     uuid primary key default uuid_generate_v4(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id     text,
  stripe_subscription_id text unique,
  tier                   text not null check (tier in ('plus','pro','enterprise')),
  status                 text not null check (status in ('active','trialing','past_due','canceled','incomplete')),
  current_period_end     timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- Users can READ their own subscription (read-only, to determine tier for client UI)
create policy "Users view own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- WRITE operations только service role (Stripe webhook). Заборонено усі authed users.
-- (Якщо policy не вказана для insert/update/delete → denied by default under RLS.)

-- ══════════════════ 5) entitlements (view) ══════════════════
-- Читабельний resolved tier на основі user_profiles.tier + active subscriptions.
create or replace view public.entitlements as
  select
    up.id as user_id,
    coalesce(
      (select s.tier
       from public.subscriptions s
       where s.user_id = up.id
         and s.status in ('active','trialing')
         and (s.current_period_end is null or s.current_period_end > now())
       order by
         case s.tier
           when 'enterprise' then 1
           when 'pro' then 2
           when 'plus' then 3
         end
       limit 1),
      up.tier
    ) as effective_tier,
    up.tier as base_tier
  from public.user_profiles up;

-- ══════════════════ 6) usage_events ══════════════════
-- Опційна телеметрія для retention / funnel analysis. Orthogonal to auth.
create table if not exists public.usage_events (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references auth.users(id) on delete set null,
  event_type text not null,
  props      jsonb,
  created_at timestamptz not null default now()
);

alter table public.usage_events enable row level security;

create policy "Users insert own events"
  on public.usage_events for insert
  with check (auth.uid() is null or auth.uid() = user_id);

create policy "Users view own events"
  on public.usage_events for select
  using (auth.uid() = user_id);

-- Index for time-range queries
create index if not exists usage_events_user_time_idx
  on public.usage_events (user_id, created_at desc);

-- ══════════════════ 7) updated_at auto-refresh ══════════════════
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_profiles_upd on public.user_profiles;
create trigger trg_user_profiles_upd
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_personal_profiles_upd on public.personal_profiles;
create trigger trg_personal_profiles_upd
  before update on public.personal_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_subscriptions_upd on public.subscriptions;
create trigger trg_subscriptions_upd
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ══════════════════ Grants (anon can read only entitlements view) ══════════════════
grant usage on schema public to anon, authenticated;
grant select on public.entitlements to authenticated;

-- ══════════════════ Done ══════════════════
-- Next: enable Email provider in Supabase Auth dashboard.
-- Magic Link is default; OAuth providers can be added later (Google, Apple).
