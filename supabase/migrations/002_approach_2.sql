-- Approach 2.0: position groups, shared team calendar, readiness check-ins.
-- Existing projects: paste this whole file into Supabase → SQL Editor → New query → Run (once).
-- New projects: supabase/schema.sql already includes it.

-- ---------- Position groups ----------
create table if not exists public.team_groups (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  position_hint text,
  created_at timestamptz not null default now()
);
create index if not exists team_groups_team on public.team_groups (team_id);

alter table public.team_members
  add column if not exists group_id uuid references public.team_groups (id) on delete set null;

-- One posted workout per team per group ('all' = whole team).
alter table public.team_programs add column if not exists group_key text not null default 'all';
alter table public.team_programs drop constraint if exists team_programs_pkey;
alter table public.team_programs add primary key (team_id, group_key);

-- ---------- Shared team calendar ----------
create table if not exists public.team_calendars (
  team_id uuid primary key references public.teams (id) on delete cascade,
  events jsonb not null default '[]'::jsonb,
  light_dates jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- Readiness check-ins ----------
create table if not exists public.readiness (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  day date not null,
  sleep smallint not null check (sleep between 1 and 5),
  soreness smallint not null check (soreness between 1 and 5),
  energy smallint not null check (energy between 1 and 5),
  pain boolean not null default false,
  pain_note text check (pain_note is null or char_length(pain_note) <= 200),
  created_at timestamptz not null default now(),
  primary key (team_id, user_id, day)
);

-- ---------- Row level security ----------
alter table public.team_groups enable row level security;
alter table public.team_calendars enable row level security;
alter table public.readiness enable row level security;

drop policy if exists "coach or member sees groups" on public.team_groups;
create policy "coach or member sees groups" on public.team_groups
  for select to authenticated using (public.is_team_coach(team_id) or public.is_team_member(team_id));
drop policy if exists "coach manages groups" on public.team_groups;
create policy "coach manages groups" on public.team_groups
  for all to authenticated using (public.is_team_coach(team_id)) with check (public.is_team_coach(team_id));

-- Coaches can move athletes between groups (only the group_id column).
revoke update on public.team_members from authenticated;
grant update (group_id) on public.team_members to authenticated;
drop policy if exists "coach assigns groups" on public.team_members;
create policy "coach assigns groups" on public.team_members
  for update to authenticated using (public.is_team_coach(team_id)) with check (public.is_team_coach(team_id));

drop policy if exists "coach deletes group workouts" on public.team_programs;
create policy "coach deletes group workouts" on public.team_programs
  for delete to authenticated using (public.is_team_coach(team_id));

drop policy if exists "team sees calendar" on public.team_calendars;
create policy "team sees calendar" on public.team_calendars
  for select to authenticated using (public.is_team_coach(team_id) or public.is_team_member(team_id));
drop policy if exists "coach writes calendar" on public.team_calendars;
create policy "coach writes calendar" on public.team_calendars
  for insert to authenticated with check (public.is_team_coach(team_id));
drop policy if exists "coach updates calendar" on public.team_calendars;
create policy "coach updates calendar" on public.team_calendars
  for update to authenticated using (public.is_team_coach(team_id)) with check (public.is_team_coach(team_id));

drop policy if exists "athlete checks in" on public.readiness;
create policy "athlete checks in" on public.readiness
  for insert to authenticated with check (user_id = auth.uid() and public.is_team_member(team_id));
drop policy if exists "athlete updates own check-in" on public.readiness;
create policy "athlete updates own check-in" on public.readiness
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_team_member(team_id));
drop policy if exists "athlete or coach sees check-ins" on public.readiness;
create policy "athlete or coach sees check-ins" on public.readiness
  for select to authenticated using (user_id = auth.uid() or public.is_team_coach(team_id));

-- ---------- Live updates ----------
do $$
begin
  begin alter publication supabase_realtime add table public.team_calendars; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.team_groups; exception when duplicate_object then null; end;
end $$;
