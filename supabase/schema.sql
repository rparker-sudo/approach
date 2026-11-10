-- Approach: team sync database
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run once on a new project.

-- ---------- Tables ----------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  role text not null check (role in ('coach', 'athlete')),
  position text,
  created_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  join_code text not null unique check (join_code ~ '^[A-Z0-9]{6}$'),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

-- One posted workout program per team.
create table public.team_programs (
  team_id uuid primary key references public.teams (id) on delete cascade,
  program jsonb not null,
  updated_at timestamptz not null default now()
);

-- Workouts athletes log, so their coach can see who trained.
create table public.workout_logs (
  id text primary key,
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  session_name text not null,
  logged_at timestamptz not null,
  sets_done int not null default 0,
  note text,
  entries jsonb
);

create index workout_logs_team_date on public.workout_logs (team_id, logged_at desc);

-- ---------- New accounts get a profile automatically ----------

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, role, position)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    case when new.raw_user_meta_data ->> 'role' = 'coach' then 'coach' else 'athlete' end,
    new.raw_user_meta_data ->> 'position'
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Helper checks (security definer avoids policy loops) ----------

create function public.is_team_coach(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from teams where id = t and coach_id = auth.uid());
$$;

create function public.is_team_member(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from team_members where team_id = t and user_id = auth.uid());
$$;

-- You can see a profile if it's yours, it's an athlete on your team, or it's your coach.
create function public.can_see_profile(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p = auth.uid()
    or exists (
      select 1 from team_members m join teams t on t.id = m.team_id
      where (t.coach_id = auth.uid() and m.user_id = p)
         or (m.user_id = auth.uid() and t.coach_id = p)
    );
$$;

-- Athletes join with a code. Runs as the database owner so athletes can't add themselves to teams any other way.
create function public.join_team(code text) returns json
language plpgsql security definer set search_path = public as $$
declare
  t teams;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  select * into t from teams where join_code = upper(regexp_replace(code, '[^A-Za-z0-9]', '', 'g'));
  if not found then
    raise exception 'No team has that code. Check it with your coach.';
  end if;
  insert into team_members (team_id, user_id) values (t.id, auth.uid())
    on conflict do nothing;
  return json_build_object(
    'id', t.id, 'name', t.name, 'join_code', t.join_code, 'coach_id', t.coach_id,
    'created_at', t.created_at, 'coach_name', (select name from profiles where id = t.coach_id)
  );
end $$;

revoke execute on function public.join_team(text) from anon;

-- ---------- Row level security ----------

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_programs enable row level security;
alter table public.workout_logs enable row level security;

create policy "see allowed profiles" on public.profiles
  for select to authenticated using (public.can_see_profile(id));
create policy "edit own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "coach or member sees team" on public.teams
  for select to authenticated using (coach_id = auth.uid() or public.is_team_member(id));
create policy "coaches create teams" on public.teams
  for insert to authenticated with check (
    coach_id = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
  );
create policy "coach edits team" on public.teams
  for update to authenticated using (coach_id = auth.uid()) with check (coach_id = auth.uid());
create policy "coach deletes team" on public.teams
  for delete to authenticated using (coach_id = auth.uid());

create policy "see own membership or your roster" on public.team_members
  for select to authenticated using (user_id = auth.uid() or public.is_team_coach(team_id));
create policy "leave team or coach removes" on public.team_members
  for delete to authenticated using (user_id = auth.uid() or public.is_team_coach(team_id));

create policy "team sees posted workout" on public.team_programs
  for select to authenticated using (public.is_team_coach(team_id) or public.is_team_member(team_id));
create policy "coach posts workout" on public.team_programs
  for insert to authenticated with check (public.is_team_coach(team_id));
create policy "coach updates workout" on public.team_programs
  for update to authenticated using (public.is_team_coach(team_id)) with check (public.is_team_coach(team_id));

create policy "athlete logs own workouts" on public.workout_logs
  for insert to authenticated with check (user_id = auth.uid() and public.is_team_member(team_id));
create policy "athlete or coach sees logs" on public.workout_logs
  for select to authenticated using (user_id = auth.uid() or public.is_team_coach(team_id));
create policy "athlete deletes own logs" on public.workout_logs
  for delete to authenticated using (user_id = auth.uid());

-- ---------- Live updates ----------
alter publication supabase_realtime add table public.team_programs, public.team_members;

-- ======================================================================
-- Approach 2.0 additions (same as supabase/migrations/002_approach_2.sql)
-- ======================================================================
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

-- ============================================================
-- Approach 2.1 additions (same as supabase/migrations/003_approach_2_1.sql)
-- ============================================================
-- ---------- S1: age (birth year + is_minor only, never a full date) ----------
alter table public.profiles add column if not exists birth_year smallint
  check (birth_year is null or birth_year between 1900 and 2100);
alter table public.profiles add column if not exists is_minor boolean;

-- Under 18 by birth year alone where it's certain; the client's answer (from month + year)
-- decides only the one ambiguous year. Under-13 years are rejected.
create or replace function public.minor_from(y smallint, client_minor boolean) returns boolean
language sql immutable as $$
  select case
    when y is null then null
    when extract(year from now())::int - y < 18 then true
    when extract(year from now())::int - y > 18 then false
    else coalesce(client_minor, true)
  end;
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  y smallint := nullif(new.raw_user_meta_data ->> 'birth_year', '')::smallint;
  minor boolean := public.minor_from(y, (new.raw_user_meta_data ->> 'is_minor')::boolean);
begin
  if y is not null and extract(year from now())::int - y < 13 then
    raise exception 'Not eligible.';
  end if;
  insert into public.profiles (id, name, role, position, birth_year, is_minor)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    -- Coach accounts are for adults 18 and older.
    case when new.raw_user_meta_data ->> 'role' = 'coach' and minor = false then 'coach' else 'athlete' end,
    new.raw_user_meta_data ->> 'position',
    y,
    minor
  );
  return new;
end $$;

-- Users may edit their name and position; birth year is set once through set_my_birth_year.
revoke update on public.profiles from authenticated;
grant update (name, position) on public.profiles to authenticated;

-- ---------- S2: parent consent on file ----------
alter table public.team_members add column if not exists consent_status text not null default 'pending';
alter table public.team_members drop constraint if exists team_members_consent_status_check;
-- Text + check constraint so more consent options can be added later without a rewrite.
alter table public.team_members add constraint team_members_consent_status_check
  check (consent_status in ('not_required', 'pending', 'training_only', 'full'));
alter table public.team_members add column if not exists consent_recorded_at timestamptz;
alter table public.team_members add column if not exists consent_recorded_by uuid
  references public.profiles (id) on delete set null;

-- Existing adult members don't need consent. Members with no birth year stay pending
-- until they answer the age question (set_my_birth_year updates them).
update public.team_members m set consent_status = 'not_required'
  from public.profiles p
  where p.id = m.user_id and p.is_minor = false and m.consent_status = 'pending';

-- Only group_id is directly updatable (by the coach, via the 002 policy). Consent goes through record_consent.
revoke update on public.team_members from authenticated;
grant update (group_id) on public.team_members to authenticated;

-- The caller's consent status on a team (null if not a member).
create or replace function public.member_consent(t uuid) returns text
language sql stable security definer set search_path = public as $$
  select consent_status from team_members where team_id = t and user_id = auth.uid();
$$;

create or replace function public.is_current_member(t uuid, u uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from team_members where team_id = t and user_id = u);
$$;

-- Coach records (or clears) a minor's parent consent.
create or replace function public.record_consent(t uuid, athlete uuid, status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_team_coach(t) then
    raise exception 'Only the team coach can record consent.';
  end if;
  if status not in ('pending', 'training_only', 'full') then
    raise exception 'Unknown consent option.';
  end if;
  update team_members
    set consent_status = status,
        consent_recorded_at = case when status = 'pending' then null else now() end,
        consent_recorded_by = case when status = 'pending' then null else auth.uid() end
    where team_id = t and user_id = athlete and consent_status <> 'not_required';
  if not found then
    raise exception 'That athlete isn''t on the team or doesn''t need consent.';
  end if;
end $$;

-- Existing users answer the age question once; birth year can't be changed afterward.
create or replace function public.set_my_birth_year(y smallint, client_minor boolean) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  minor boolean := public.minor_from(y, client_minor);
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  if y is null or extract(year from now())::int - y < 13 then
    raise exception 'Not eligible.';
  end if;
  update profiles set birth_year = y, is_minor = minor where id = auth.uid() and birth_year is null;
  select is_minor into minor from profiles where id = auth.uid();
  if minor = false then
    update team_members set consent_status = 'not_required' where user_id = auth.uid() and consent_status = 'pending';
  end if;
  return minor;
end $$;

-- Minors join as pending; adults as not_required.
create or replace function public.join_team(code text) returns json
language plpgsql security definer set search_path = public as $$
declare
  t teams;
  minor boolean;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  select * into t from teams where join_code = upper(regexp_replace(code, '[^A-Za-z0-9]', '', 'g'));
  if not found then
    raise exception 'No team has that code. Check it with your coach.';
  end if;
  select is_minor into minor from profiles where id = auth.uid();
  insert into team_members (team_id, user_id, consent_status)
    values (t.id, auth.uid(), case when minor = false then 'not_required' else 'pending' end)
    on conflict do nothing;
  return json_build_object(
    'id', t.id, 'name', t.name, 'join_code', t.join_code, 'coach_id', t.coach_id,
    'created_at', t.created_at, 'coach_name', (select name from profiles where id = t.coach_id)
  );
end $$;

-- ---------- RLS: consent gates writes (S2.6); coaches see current members only (S6) ----------
drop policy if exists "athlete logs own workouts" on public.workout_logs;
create policy "athlete logs own workouts" on public.workout_logs
  for insert to authenticated with check (
    user_id = auth.uid() and public.member_consent(team_id) in ('training_only', 'full', 'not_required')
  );

drop policy if exists "athlete or coach sees logs" on public.workout_logs;
create policy "athlete or coach sees logs" on public.workout_logs
  for select to authenticated using (
    user_id = auth.uid() or (public.is_team_coach(team_id) and public.is_current_member(team_id, user_id))
  );

drop policy if exists "athlete checks in" on public.readiness;
create policy "athlete checks in" on public.readiness
  for insert to authenticated with check (
    user_id = auth.uid() and public.member_consent(team_id) in ('full', 'not_required')
  );

drop policy if exists "athlete updates own check-in" on public.readiness;
create policy "athlete updates own check-in" on public.readiness
  for update to authenticated using (user_id = auth.uid()) with check (
    user_id = auth.uid() and public.member_consent(team_id) in ('full', 'not_required')
  );

drop policy if exists "athlete or coach sees check-ins" on public.readiness;
create policy "athlete or coach sees check-ins" on public.readiness
  for select to authenticated using (
    user_id = auth.uid() or (public.is_team_coach(team_id) and public.is_current_member(team_id, user_id))
  );

-- ---------- S3: no free-text pain notes ----------
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'readiness' and column_name = 'pain_note') then
    update public.readiness set pain_note = null;
    alter table public.readiness drop column pain_note;
  end if;
end $$;

-- ---------- S5: in-app account deletion ----------
-- Deletes the caller's login; on delete cascade removes their profile, memberships, logs,
-- check-ins, and (for coaches) their teams with everything in them.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  delete from auth.users where id = auth.uid();
end $$;

-- ---------- Who can call what ----------
revoke execute on function public.record_consent(uuid, uuid, text) from public, anon;
revoke execute on function public.set_my_birth_year(smallint, boolean) from public, anon;
revoke execute on function public.delete_my_account() from public, anon;
revoke execute on function public.join_team(text) from public, anon;
grant execute on function public.record_consent(uuid, uuid, text) to authenticated;
grant execute on function public.set_my_birth_year(smallint, boolean) to authenticated;
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.join_team(text) to authenticated;

-- ============================================================
-- Approach 2.1 pass 2 additions (same as supabase/migrations/004_approach_2_1_pass2.sql)
-- ============================================================
-- ---------- P2: how the athlete appears on boards ----------
alter table public.profiles add column if not exists board_name_mode text not null default 'short';
alter table public.profiles drop constraint if exists profiles_board_name_mode_check;
alter table public.profiles add constraint profiles_board_name_mode_check
  check (board_name_mode in ('short', 'initials', 'hidden'));
revoke update on public.profiles from authenticated;
grant update (name, position, board_name_mode) on public.profiles to authenticated;

-- "Jordan Miller" → 'Jordan M.' (short) or 'J.M.' (initials); one word stays as is; hidden → null.
-- Never returns a full last name.
create or replace function public.board_name(full_name text, mode text) returns text
language sql immutable as $$
  with w as (select regexp_split_to_array(btrim(coalesce(full_name, '')), '\s+') as parts)
  select case
    when mode = 'hidden' then null
    when coalesce(parts[1], '') = '' then 'Athlete'
    when mode = 'initials' then
      upper(left(parts[1], 1)) || '.' ||
      case when array_length(parts, 1) > 1 then upper(left(parts[array_length(parts, 1)], 1)) || '.' else '' end
    when array_length(parts, 1) = 1 then parts[1]
    else parts[1] || ' ' || upper(left(parts[array_length(parts, 1)], 1)) || '.'
  end
  from w;
$$;

-- ---------- Team settings (boards, attendance lengths, testing) ----------
alter table public.teams add column if not exists practice_min smallint not null default 120;
alter table public.teams add column if not exists match_min smallint not null default 120;
alter table public.teams add column if not exists tournament_min smallint not null default 240;
alter table public.teams add column if not exists effort_board boolean not null default true;
alter table public.teams add column if not exists board_effort_panel boolean not null default true;
alter table public.teams add column if not exists team_goal integer;
alter table public.teams add column if not exists med_ball_lb numeric(4, 1) not null default 6;
alter table public.teams drop constraint if exists teams_settings_check;
alter table public.teams add constraint teams_settings_check check (
  practice_min between 0 and 600 and match_min between 0 and 600 and tournament_min between 0 and 900
  and (team_goal is null or team_goal between 0 and 100000) and med_ball_lb between 1 and 30
);

-- ---------- P1: six consent permissions ----------
alter table public.team_members add column if not exists c_participation boolean not null default false;
alter table public.team_members add column if not exists c_checkins boolean not null default false;
alter table public.team_members add column if not exists c_share_checkins boolean not null default false;
alter table public.team_members add column if not exists c_boards boolean not null default false;
alter table public.team_members add column if not exists c_attendance boolean not null default false;
alter table public.team_members add column if not exists c_testing boolean not null default false;
-- Form version recorded (minors: the paper form; adults: 2 once they've saved "Your choices").
alter table public.team_members add column if not exists consent_version smallint;

-- Migrate pass 1's single status, then drop it.
--   training_only → participation; full → participation + check-ins + sharing; pending → nothing.
--   not_required (adults) → participation + check-ins + sharing (what pass 1 allowed);
--   boards, attendance and testing stay off until they save "Your choices".
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'team_members' and column_name = 'consent_status') then
    update public.team_members set
      c_participation = consent_status in ('training_only', 'full', 'not_required'),
      c_checkins = consent_status in ('full', 'not_required'),
      c_share_checkins = consent_status in ('full', 'not_required'),
      consent_version = case when consent_status in ('training_only', 'full') then 1 else consent_version end;
    alter table public.team_members drop constraint if exists team_members_consent_status_check;
    alter table public.team_members drop column consent_status;
  end if;
end $$;

-- Is permission p on for member u of team t? (false if not a member)
create or replace function public.has_perm(t uuid, u uuid, p text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select case p
      when 'participation' then c_participation
      when 'checkins' then c_checkins
      when 'share_checkins' then c_checkins and c_share_checkins
      when 'boards' then c_participation and c_boards
      when 'attendance' then c_participation and c_attendance
      when 'testing' then c_participation and c_testing
      else false end
    from team_members where team_id = t and user_id = u
  ), false);
$$;

-- On a board: boards permission and not hidden.
create or replace function public.on_boards(t uuid, u uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_perm(t, u, 'boards')
     and coalesce((select board_name_mode <> 'hidden' from profiles where id = u), false);
$$;

-- Coach records a minor's form-v2 boxes. Box 3 needs box 2; boxes 2–6 need box 1.
-- participation = false clears everything (back to "Consent needed").
create or replace function public.record_consent(
  t uuid, athlete uuid, participation boolean, checkins boolean, share_checkins boolean,
  boards boolean, attendance boolean, testing boolean
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_team_coach(t) then
    raise exception 'Only the team coach can record consent.';
  end if;
  if exists (select 1 from profiles where id = athlete and is_minor = false) then
    raise exception 'Adults choose these themselves.';
  end if;
  update team_members set
      c_participation = participation,
      c_checkins = participation and checkins,
      c_share_checkins = participation and checkins and share_checkins,
      c_boards = participation and boards,
      c_attendance = participation and attendance,
      c_testing = participation and testing,
      consent_version = case when participation then 2 else null end,
      consent_recorded_at = case when participation then now() else null end,
      consent_recorded_by = case when participation then auth.uid() else null end
    where team_id = t and user_id = athlete;
  if not found then
    raise exception 'That athlete isn''t on the team.';
  end if;
end $$;

-- Adults (18+) choose boxes 2–6 for themselves; applies to every team they're on.
create or replace function public.set_my_choices(
  checkins boolean, share_checkins boolean, boards boolean, attendance boolean, testing boolean
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  if not exists (select 1 from profiles where id = auth.uid() and is_minor = false) then
    raise exception 'Your coach records these from your parent''s form.';
  end if;
  update team_members set
      c_participation = true,
      c_checkins = checkins,
      c_share_checkins = checkins and share_checkins,
      c_boards = boards,
      c_attendance = attendance,
      c_testing = testing,
      consent_version = 2,
      consent_recorded_at = now(),
      consent_recorded_by = auth.uid()
    where user_id = auth.uid();
end $$;

-- Existing users answer the age question once; adults get participation (then "Your choices").
create or replace function public.set_my_birth_year(y smallint, client_minor boolean) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  minor boolean := public.minor_from(y, client_minor);
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  if y is null or extract(year from now())::int - y < 13 then
    raise exception 'Not eligible.';
  end if;
  update profiles set birth_year = y, is_minor = minor where id = auth.uid() and birth_year is null;
  select is_minor into minor from profiles where id = auth.uid();
  if minor = false then
    update team_members set c_participation = true where user_id = auth.uid() and not c_participation;
  end if;
  return minor;
end $$;

-- Minors join with nothing on (coach records the form); adults with participation only.
create or replace function public.join_team(code text) returns json
language plpgsql security definer set search_path = public as $$
declare
  t teams;
  minor boolean;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  select * into t from teams where join_code = upper(regexp_replace(code, '[^A-Za-z0-9]', '', 'g'));
  if not found then
    raise exception 'No team has that code. Check it with your coach.';
  end if;
  select is_minor into minor from profiles where id = auth.uid();
  insert into team_members (team_id, user_id, c_participation)
    values (t.id, auth.uid(), minor = false)
    on conflict do nothing;
  return json_build_object(
    'id', t.id, 'name', t.name, 'join_code', t.join_code, 'coach_id', t.coach_id,
    'created_at', t.created_at, 'coach_name', (select name from profiles where id = t.coach_id)
  );
end $$;

-- ---------- Workout logs: duration and bests (P3.3, P5.5) ----------
alter table public.workout_logs add column if not exists pr_count smallint not null default 0;
alter table public.workout_logs add column if not exists duration_min smallint;
alter table public.workout_logs drop constraint if exists workout_logs_pass2_check;
alter table public.workout_logs add constraint workout_logs_pass2_check
  check (pr_count between 0 and 100 and (duration_min is null or duration_min between 0 and 120));

drop policy if exists "athlete logs own workouts" on public.workout_logs;
create policy "athlete logs own workouts" on public.workout_logs
  for insert to authenticated with check (user_id = auth.uid() and public.has_perm(team_id, auth.uid(), 'participation'));

-- ---------- Check-ins need boxes 2 and 3 ----------
drop policy if exists "athlete checks in" on public.readiness;
create policy "athlete checks in" on public.readiness
  for insert to authenticated with check (user_id = auth.uid() and public.has_perm(team_id, auth.uid(), 'share_checkins'));
drop policy if exists "athlete updates own check-in" on public.readiness;
create policy "athlete updates own check-in" on public.readiness
  for update to authenticated using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.has_perm(team_id, auth.uid(), 'share_checkins'));
drop policy if exists "athlete or coach sees check-ins" on public.readiness;
create policy "athlete or coach sees check-ins" on public.readiness
  for select to authenticated using (
    user_id = auth.uid()
    or (public.is_team_coach(team_id) and public.is_current_member(team_id, user_id) and public.has_perm(team_id, user_id, 'share_checkins'))
  );

-- ---------- P3: live progress for the coach board ----------
create table if not exists public.live_progress (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  day date not null,
  session_id text,
  sets_done smallint not null default 0 check (sets_done between 0 and 500),
  sets_total smallint not null default 0 check (sets_total between 0 and 500),
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'done')),
  updated_at timestamptz not null default now(),
  primary key (team_id, user_id, day)
);
alter table public.live_progress enable row level security;

drop policy if exists "athlete shares live progress" on public.live_progress;
create policy "athlete shares live progress" on public.live_progress
  for insert to authenticated with check (user_id = auth.uid() and public.has_perm(team_id, auth.uid(), 'boards'));
drop policy if exists "athlete updates live progress" on public.live_progress;
create policy "athlete updates live progress" on public.live_progress
  for update to authenticated using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.has_perm(team_id, auth.uid(), 'boards'));
drop policy if exists "athlete clears live progress" on public.live_progress;
create policy "athlete clears live progress" on public.live_progress
  for delete to authenticated using (user_id = auth.uid());
drop policy if exists "athlete or coach board sees live progress" on public.live_progress;
create policy "athlete or coach board sees live progress" on public.live_progress
  for select to authenticated using (
    user_id = auth.uid()
    or (public.is_team_coach(team_id) and public.is_current_member(team_id, user_id) and public.on_boards(team_id, user_id))
  );

-- Rows older than 24 hours are deleted whenever new progress is written.
create or replace function public.purge_live_progress() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from live_progress where updated_at < now() - interval '24 hours';
  return null;
end $$;
drop trigger if exists live_progress_purge on public.live_progress;
create trigger live_progress_purge after insert or update on public.live_progress
  for each statement execute function public.purge_live_progress();

-- ---------- P5: attendance ----------
-- A row with minutes = 0 marked by the coach means "not there" (the coach's entry wins).
create table if not exists public.attendance (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  kind text not null check (kind in ('practice', 'match', 'tournament')),
  minutes smallint not null check (minutes between 0 and 900),
  marked_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (team_id, user_id, day, kind)
);
alter table public.attendance enable row level security;

drop policy if exists "mark attendance" on public.attendance;
create policy "mark attendance" on public.attendance
  for insert to authenticated with check (
    marked_by = auth.uid() and public.has_perm(team_id, user_id, 'attendance')
    and (user_id = auth.uid() or (public.is_team_coach(team_id) and public.is_current_member(team_id, user_id)))
  );
drop policy if exists "change attendance" on public.attendance;
create policy "change attendance" on public.attendance
  for update to authenticated
  using ((user_id = auth.uid() and marked_by = auth.uid()) or public.is_team_coach(team_id))
  with check (
    marked_by = auth.uid() and public.has_perm(team_id, user_id, 'attendance')
    and (user_id = auth.uid() or (public.is_team_coach(team_id) and public.is_current_member(team_id, user_id)))
  );
drop policy if exists "remove attendance" on public.attendance;
create policy "remove attendance" on public.attendance
  for delete to authenticated using ((user_id = auth.uid() and marked_by = auth.uid()) or public.is_team_coach(team_id));
drop policy if exists "athlete or coach sees attendance" on public.attendance;
create policy "athlete or coach sees attendance" on public.attendance
  for select to authenticated using (
    user_id = auth.uid() or (public.is_team_coach(team_id) and public.is_current_member(team_id, user_id))
  );

-- ---------- P6: testing days ----------
create table if not exists public.test_sessions (
  team_id uuid not null references public.teams (id) on delete cascade,
  group_key text not null default 'all',
  day date not null,
  coach_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  confirmed_at timestamptz not null default now(),
  battery text not null check (battery in ('full', 'jump', 'mid')),
  primary key (team_id, group_key, day)
);
alter table public.test_sessions enable row level security;
drop policy if exists "coach confirms supervision" on public.test_sessions;
create policy "coach confirms supervision" on public.test_sessions
  for insert to authenticated with check (coach_id = auth.uid() and public.is_team_coach(team_id));
drop policy if exists "team sees supervision" on public.test_sessions;
create policy "team sees supervision" on public.test_sessions
  for select to authenticated using (public.is_team_coach(team_id) or public.is_team_member(team_id));

create table if not exists public.test_results (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  test_id text not null check (test_id in (
    'touch', 'broad', 'throw', 'trap-bar-deadlift', 'back-squat', 'bench', 'goblet-squat', 'db-bench'
  )),
  value numeric(6, 1) not null check (value > 0 and value < 2000),
  unit text not null check (unit in ('in', 'ft', 'lb')),
  reps smallint check (reps is null or reps between 1 and 12),
  e1rm numeric(6, 1),
  entered_by uuid default auth.uid() references public.profiles (id) on delete set null,
  voided boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists test_results_team_user on public.test_results (team_id, user_id, day);
alter table public.test_results enable row level security;

-- Estimated strength is always computed here: weight × (1 + reps / 30). Jumps have none.
create or replace function public.set_e1rm() returns trigger
language plpgsql as $$
begin
  new.e1rm := case when new.unit = 'lb' and new.reps is not null then round(new.value * (1 + new.reps / 30.0), 1) end;
  return new;
end $$;
drop trigger if exists test_results_e1rm on public.test_results;
create trigger test_results_e1rm before insert or update on public.test_results
  for each row execute function public.set_e1rm();

-- Load tests need the coach's supervision confirmation for that team and day.
create or replace function public.supervised(t uuid, d date) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from test_sessions where team_id = t and day = d and battery in ('full', 'mid'));
$$;

drop policy if exists "enter test results" on public.test_results;
create policy "enter test results" on public.test_results
  for insert to authenticated with check (
    entered_by = auth.uid() and public.has_perm(team_id, user_id, 'testing') and not voided
    and (user_id = auth.uid() or (public.is_team_coach(team_id) and public.is_current_member(team_id, user_id)))
    and (
      (test_id in ('touch', 'broad', 'throw') and reps is null)
      or (reps is not null and day between current_date - 1 and current_date + 1 and public.supervised(team_id, day))
    )
  );
drop policy if exists "coach edits test results" on public.test_results;
create policy "coach edits test results" on public.test_results
  for update to authenticated using (public.is_team_coach(team_id)) with check (public.is_team_coach(team_id));
drop policy if exists "athlete or coach sees test results" on public.test_results;
create policy "athlete or coach sees test results" on public.test_results
  for select to authenticated using (
    user_id = auth.uid() or (public.is_team_coach(team_id) and public.is_current_member(team_id, user_id))
  );
revoke update on public.test_results from authenticated;
grant update (value, reps, voided) on public.test_results to authenticated;

-- ---------- Boards: names and effort inputs (no weights, tests, check-ins or nutrition) ----------
-- Members who appear on boards, with their board name. Coach or current members only.
create or replace function public.board_members(t uuid)
returns table (user_id uuid, board_name text, group_id uuid)
language sql stable security definer set search_path = public as $$
  select m.user_id, public.board_name(p.name, p.board_name_mode), m.group_id
  from team_members m join profiles p on p.id = m.user_id
  where m.team_id = t
    and (public.is_team_coach(t) or public.is_team_member(t))
    and public.on_boards(t, m.user_id);
$$;

-- Effort board inputs since a date. Rows: everyone on boards, plus the caller's own row.
-- Logs carry only time, session name and minutes; attendance only day/kind/minutes (with permission);
-- improvement is a % from jump tests only (with permission). Never weights, results, check-ins or nutrition.
create or replace function public.team_effort(t uuid, since date)
returns table (user_id uuid, board_name text, group_id uuid, is_me boolean, logs json, attendance json, improvement numeric)
language sql stable security definer set search_path = public as $$
  with allowed as (
    select public.is_team_coach(t)
        or (public.is_team_member(t) and coalesce((select effort_board from teams where id = t), true)) as ok
  ),
  rows as (
    select m.user_id, m.group_id, p.name, p.board_name_mode, (m.user_id = auth.uid()) as me
    from team_members m join profiles p on p.id = m.user_id, allowed
    where m.team_id = t and allowed.ok
      and (public.on_boards(t, m.user_id) or m.user_id = auth.uid())
  )
  select r.user_id,
    coalesce(public.board_name(r.name, case when r.me and r.board_name_mode = 'hidden' then 'short' else r.board_name_mode end), 'Athlete'),
    r.group_id,
    r.me,
    coalesce((select json_agg(json_build_object('at', l.logged_at, 'session', l.session_name, 'minutes', l.duration_min) order by l.logged_at)
              from workout_logs l where l.team_id = t and l.user_id = r.user_id and l.logged_at >= since::timestamptz - interval '1 day'), '[]'::json),
    case when public.has_perm(t, r.user_id, 'attendance') then
      coalesce((select json_agg(json_build_object('day', a.day, 'kind', a.kind, 'minutes', a.minutes) order by a.day)
                from attendance a where a.team_id = t and a.user_id = r.user_id and a.day >= since and a.minutes > 0), '[]'::json)
    end,
    case when public.has_perm(t, r.user_id, 'testing') then (
      select round(avg(g.pct), 1) from (
        select (last_value(x.value) over w - first_value(x.value) over w) / first_value(x.value) over w * 100 as pct,
               row_number() over (partition by x.test_id order by x.day desc, x.created_at desc) as rn,
               count(*) over (partition by x.test_id) as n
        from test_results x
        where x.team_id = t and x.user_id = r.user_id and x.test_id in ('touch', 'broad') and not x.voided and x.day >= since
        window w as (partition by x.test_id order by x.day, x.created_at rows between unbounded preceding and unbounded following)
      ) g where g.rn = 1 and g.n >= 2
    ) end
  from rows r;
$$;

-- ---------- Live updates ----------
do $$
begin
  begin alter publication supabase_realtime add table public.live_progress; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.test_sessions; exception when duplicate_object then null; end;
end $$;

-- ---------- Who can call what ----------
revoke execute on function public.record_consent(uuid, uuid, boolean, boolean, boolean, boolean, boolean, boolean) from public, anon;
revoke execute on function public.set_my_choices(boolean, boolean, boolean, boolean, boolean) from public, anon;
revoke execute on function public.board_members(uuid) from public, anon;
revoke execute on function public.team_effort(uuid, date) from public, anon;
revoke execute on function public.set_my_birth_year(smallint, boolean) from public, anon;
revoke execute on function public.join_team(text) from public, anon;
grant execute on function public.record_consent(uuid, uuid, boolean, boolean, boolean, boolean, boolean, boolean) to authenticated;
grant execute on function public.set_my_choices(boolean, boolean, boolean, boolean, boolean) to authenticated;
grant execute on function public.board_members(uuid) to authenticated;
grant execute on function public.team_effort(uuid, date) to authenticated;
grant execute on function public.set_my_birth_year(smallint, boolean) to authenticated;
grant execute on function public.join_team(text) to authenticated;

-- Pass 1's single-status helpers are replaced (policies above no longer use them).
drop function if exists public.member_consent(uuid);
drop function if exists public.record_consent(uuid, uuid, text);
