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

-- ============================================================
-- Approach 2.2 pass 1 additions (same as supabase/migrations/005_approach_2_2_p1.sql)
-- ============================================================
-- ---------- 1.1 Level on each team (compliance § Level) ----------
alter table public.team_members add column if not exists level smallint;
alter table public.team_members drop constraint if exists team_members_level_check;
alter table public.team_members add constraint team_members_level_check check (level is null or level between 1 and 3);
-- null = self-reported (not confirmed). Set = the team's coach confirmed it.
alter table public.team_members add column if not exists level_set_by uuid references public.profiles (id) on delete set null;
alter table public.team_members add column if not exists level_set_at timestamptz;
-- Athletes still can't update team_members directly (only group_id, by the coach, from 002/003).
revoke update on public.team_members from authenticated;
grant update (group_id) on public.team_members to authenticated;

-- The athlete's app fills in their self-reported level once (the server doesn't know it otherwise).
-- Only while it's empty: after that, only the team's coach can change it.
create or replace function public.set_my_self_level(t uuid, lvl smallint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if lvl is null or lvl not between 1 and 3 then raise exception 'Unknown level.'; end if;
  update team_members set level = lvl
    where team_id = t and user_id = auth.uid() and level is null and level_set_by is null;
end $$;

-- The team's coach sets (or confirms) an athlete's level.
create or replace function public.set_member_level(t uuid, athlete uuid, lvl smallint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_team_coach(t) then
    raise exception 'Only the team coach can set levels.';
  end if;
  if lvl is null or lvl not between 1 and 3 then raise exception 'Unknown level.'; end if;
  update team_members set level = lvl, level_set_by = auth.uid(), level_set_at = now()
    where team_id = t and user_id = athlete;
  if not found then raise exception 'That athlete isn''t on the team.'; end if;
end $$;

-- ---------- 1.2 One lift program across teams (TM-2) ----------
alter table public.profiles add column if not exists lift_program_team_id uuid references public.teams (id) on delete set null;
-- Other users (coaches included) can't read which team's program someone follows.
revoke select on public.profiles from authenticated;
grant select (id, name, role, position, created_at, birth_year, is_minor, board_name_mode) on public.profiles to authenticated;

-- The athlete's lift program team: their choice, else their only (or first-joined) team, else null (personal program).
create or replace function public.lift_team_of(u uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select p.lift_program_team_id from profiles p
       where p.id = u and exists (select 1 from team_members m where m.user_id = u and m.team_id = p.lift_program_team_id)),
    (select m.team_id from team_members m where m.user_id = u order by m.joined_at limit 1)
  );
$$;

create or replace function public.my_lift_program() returns uuid
language sql stable security definer set search_path = public as $$
  select public.lift_team_of(auth.uid());
$$;

create or replace function public.set_lift_program(t uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if t is not null and not exists (select 1 from team_members where team_id = t and user_id = auth.uid()) then
    raise exception 'You''re not on that team.';
  end if;
  update profiles set lift_program_team_id = t where id = auth.uid();
end $$;

-- Coach roster: members of this team who follow another team's lift program (no team named).
create or replace function public.members_following_other(t uuid) returns setof uuid
language sql stable security definer set search_path = public as $$
  select m.user_id from team_members m
  where m.team_id = t and public.is_team_coach(t)
    and public.lift_team_of(m.user_id) is distinct from t;
$$;

-- Leaving the program team falls back to the remaining team (earliest joined) or the personal program.
create or replace function public.fix_lift_program_on_leave() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update profiles set lift_program_team_id =
      (select m.team_id from team_members m where m.user_id = old.user_id order by m.joined_at limit 1)
    where id = old.user_id and lift_program_team_id = old.team_id;
  return null;
end $$;
drop trigger if exists team_members_lift_program on public.team_members;
create trigger team_members_lift_program after delete on public.team_members
  for each row execute function public.fix_lift_program_on_leave();

-- Joining keeps the current program: if the athlete already has a team and hasn't chosen, pin the first one.
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
  update profiles p set lift_program_team_id = public.lift_team_of(auth.uid())
    where p.id = auth.uid() and p.lift_program_team_id is null
      and exists (select 1 from team_members where user_id = auth.uid() and team_id <> t.id);
  select is_minor into minor from profiles where id = auth.uid();
  insert into team_members (team_id, user_id, c_participation)
    values (t.id, auth.uid(), minor = false)
    on conflict do nothing;
  return json_build_object(
    'id', t.id, 'name', t.name, 'join_code', t.join_code, 'coach_id', t.coach_id,
    'created_at', t.created_at, 'coach_name', (select name from profiles where id = t.coach_id)
  );
end $$;

-- ---------- Level used for exercises: the lower of the athlete's levels across teams (Q-7) ----------
create or replace function public.resolve_level_of(u uuid) returns smallint
language sql stable security definer set search_path = public as $$
  select min(level)::smallint from team_members where user_id = u and level is not null;
$$;

-- Coach athlete detail: this team's level (and whether it's confirmed), plus swap_level: the level exercises resolve to,
-- returned only when it's lower than this team's level (otherwise null). No team names, coach names or other-team details.
-- The coach app uses swap_level only to list the swaps under "Adjusted for this athlete" and never names it (copy review §4).
drop function if exists public.member_levels(uuid);
create function public.member_levels(t uuid)
returns table (user_id uuid, team_level smallint, confirmed boolean, set_at timestamptz, swap_level smallint)
language sql stable security definer set search_path = public as $$
  select m.user_id, m.level, (m.level_set_by is not null), m.level_set_at,
    case when m.level is not null and public.resolve_level_of(m.user_id) < m.level then public.resolve_level_of(m.user_id) end
  from team_members m
  where m.team_id = t and public.is_team_coach(t);
$$;

-- ---------- 1.2 can_load_test: eligibility across all of the athlete's teams (no reason returned) ----------
-- Match or tournament on day..day+2 on any team (calendar events, or the usual week of the whole-team program).
create or replace function public.has_match_within_48h(u uuid, d date) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from team_members m
    join team_calendars c on c.team_id = m.team_id
    cross join lateral jsonb_array_elements(coalesce(c.events, '[]'::jsonb)) e
    where m.user_id = u and e->>'type' in ('game', 'tournament')
      and (e->>'date')::date between d and d + 2
  ) or exists (
    select 1 from team_members m
    join team_programs p on p.team_id = m.team_id and p.group_key = 'all'
    cross join generate_series(0, 2) g(k)
    where m.user_id = u
      and (p.program->'volleyballWeek'->>((extract(isodow from d + g.k)::int - 1)))::text in ('game', 'tournament')
      and not exists (
        -- a calendar event on that date overrides the usual week
        select 1 from team_calendars c2 cross join lateral jsonb_array_elements(coalesce(c2.events, '[]'::jsonb)) e2
        where c2.team_id = m.team_id and (e2->>'date')::date = d + g.k and e2->>'type' <> 'break'
      )
  );
$$;

create or replace function public.on_break(t uuid, d date) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from team_calendars c cross join lateral jsonb_array_elements(coalesce(c.events, '[]'::jsonb)) e
    where c.team_id = t and e->>'type' = 'break'
      and d between (e->>'date')::date and coalesce((e->>'endDate')::date, (e->>'date')::date)
  );
$$;

create or replace function public.can_load_test(u uuid, d date, t uuid default null) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  minor boolean;
  team uuid := coalesce(t, public.lift_team_of(u));
  tm team_members;
begin
  if team is null then return false; end if;
  select * into tm from team_members where team_id = team and user_id = u;
  if not found then return false; end if;
  if not public.has_perm(team, u, 'testing') then return false; end if;
  if public.has_match_within_48h(u, d) or public.on_break(team, d) then return false; end if;
  -- Pain or "run down" check-in that day (any team): skip load tests.
  if exists (
    select 1 from readiness r where r.user_id = u and r.day = d
      and (r.pain or (r.sleep + r.energy + (6 - r.soreness)) / 3.0 <= 2 or r.soreness >= 4)
  ) then return false; end if;
  select coalesce(is_minor, true) into minor from profiles where id = u;
  if minor then
    -- The testing team's coach confirmed intermediate or advanced, and no other team's coach set beginner.
    if tm.level is null or tm.level < 2 or tm.level_set_by is null
       or tm.level_set_by is distinct from (select coach_id from teams where id = team) then
      return false;
    end if;
    if exists (select 1 from team_members o where o.user_id = u and o.team_id <> team
               and o.level = 1 and o.level_set_by is not null) then
      return false;
    end if;
  else
    -- Adults: self-reported levels count; the lower level across teams must be intermediate or above.
    if coalesce(public.resolve_level_of(u), 2) < 2 then return false; end if;
  end if;
  return true;
end $$;

-- Load tests: supervision that day (004) and can_load_test (this pass).
drop policy if exists "enter test results" on public.test_results;
create policy "enter test results" on public.test_results
  for insert to authenticated with check (
    entered_by = auth.uid() and public.has_perm(team_id, user_id, 'testing') and not voided
    and (user_id = auth.uid() or (public.is_team_coach(team_id) and public.is_current_member(team_id, user_id)))
    and (
      (test_id in ('touch', 'broad', 'throw') and reps is null)
      or (reps is not null and day between current_date - 1 and current_date + 1
          and public.supervised(team_id, day) and public.can_load_test(user_id, day, team_id))
    )
  );

-- Coach testing screen: who can do strength checks today (yes/no only).
create or replace function public.testing_eligibility(t uuid, d date)
returns table (user_id uuid, eligible boolean)
language sql stable security definer set search_path = public as $$
  select m.user_id, public.can_load_test(m.user_id, d, t)
  from team_members m where m.team_id = t and public.is_team_coach(t);
$$;

-- ---------- 1.4 Returning from a break (coach chip; uses the athlete's whole history) ----------
-- True when the athlete has had 14+ days without a log, and either hasn't logged since or came back in the last 7 days.
create or replace function public.members_returning(t uuid) returns setof uuid
language sql stable security definer set search_path = public as $$
  with mem as (select m.user_id from team_members m where m.team_id = t and public.is_team_coach(t)),
  logs as (
    select l.user_id, l.logged_at, lag(l.logged_at) over (partition by l.user_id order by l.logged_at) as prev
    from workout_logs l where l.user_id in (select user_id from mem)
  ),
  stats as (
    select user_id, max(logged_at) as last_log,
           max(logged_at) filter (where prev is not null and logged_at - prev >= interval '14 days') as came_back
    from logs group by user_id
  )
  select s.user_id from stats s
  where now() - s.last_log >= interval '14 days' or s.came_back >= now() - interval '7 days';
$$;

-- ---------- C12 proof records: consent and supervision archives (compliance § C12) ----------
create table if not exists public.consent_archive (
  id bigserial primary key,
  athlete_user_id uuid not null,
  athlete_name text,
  birth_year smallint,
  team_id uuid not null,
  team_name text,
  coach_user_id uuid,
  coach_name text,
  consent_version smallint,
  c_participation boolean,
  c_checkins boolean,
  c_share_checkins boolean,
  c_boards boolean,
  c_attendance boolean,
  c_testing boolean,
  recorded_at timestamptz not null default now(),
  account_closed_at timestamptz,
  purge_after timestamptz
);
create table if not exists public.supervision_archive (
  id bigserial primary key,
  team_id uuid not null,
  team_name text,
  coach_user_id uuid,
  coach_name text,
  day date not null,
  battery text,
  confirmed_at timestamptz not null,
  -- athletes who entered a load-test result that session: [{user_id, name}]. No weights, reps, results or estimates.
  athletes jsonb not null default '[]'::jsonb,
  account_closed_at timestamptz,
  purge_after timestamptz
);
-- No foreign keys (deletions can't cascade). RLS on with no policies: only the service role can read.
alter table public.consent_archive enable row level security;
alter table public.supervision_archive enable row level security;
revoke all on public.consent_archive from anon, authenticated;
revoke all on public.supervision_archive from anon, authenticated;
revoke all on sequence public.consent_archive_id_seq from anon, authenticated;
revoke all on sequence public.supervision_archive_id_seq from anon, authenticated;

-- Record (or change) consent: also writes a proof row.
create or replace function public.record_consent(
  t uuid, athlete uuid, participation boolean, checkins boolean, share_checkins boolean,
  boards boolean, attendance boolean, testing boolean
) returns void
language plpgsql security definer set search_path = public as $$
declare
  tm team_members;
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
    where team_id = t and user_id = athlete
    returning * into tm;
  if not found then
    raise exception 'That athlete isn''t on the team.';
  end if;
  insert into consent_archive (athlete_user_id, athlete_name, birth_year, team_id, team_name, coach_user_id, coach_name,
      consent_version, c_participation, c_checkins, c_share_checkins, c_boards, c_attendance, c_testing, recorded_at)
    select athlete, pa.name, pa.birth_year, t, tt.name, auth.uid(), pc.name,
      tm.consent_version, tm.c_participation, tm.c_checkins, tm.c_share_checkins, tm.c_boards, tm.c_attendance, tm.c_testing, now()
    from teams tt
    left join profiles pa on pa.id = athlete
    left join profiles pc on pc.id = auth.uid()
    where tt.id = t;
end $$;

-- Supervision confirmed: one proof row per confirmation.
create or replace function public.archive_supervision() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into supervision_archive (team_id, team_name, coach_user_id, coach_name, day, battery, confirmed_at)
    select new.team_id, t.name, new.coach_id, p.name, new.day, new.battery, new.confirmed_at
    from teams t left join profiles p on p.id = new.coach_id where t.id = new.team_id;
  return null;
end $$;
drop trigger if exists test_sessions_archive on public.test_sessions;
create trigger test_sessions_archive after insert on public.test_sessions
  for each row execute function public.archive_supervision();

-- A load-test result adds the athlete (id and name only) to that session's proof row.
create or replace function public.archive_load_tester() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.reps is null then return null; end if;
  update supervision_archive a set athletes = a.athletes || jsonb_build_array(jsonb_build_object(
      'user_id', new.user_id, 'name', (select name from profiles where id = new.user_id)))
    where a.id = (select id from supervision_archive where team_id = new.team_id and day = new.day order by confirmed_at desc limit 1)
      and not exists (select 1 from jsonb_array_elements(a.athletes) x where x->>'user_id' = new.user_id::text);
  return null;
end $$;
drop trigger if exists test_results_archive on public.test_results;
create trigger test_results_archive after insert on public.test_results
  for each row execute function public.archive_load_tester();

-- Closing: mark rows for the user (athlete or coach) or team; the 5-year clock starts. Rows are never deleted here.
create or replace function public.close_archives(u uuid, t uuid) returns void
language sql security definer set search_path = public as $$
  update consent_archive set account_closed_at = now(), purge_after = now() + interval '5 years'
    where purge_after is null and ((u is not null and (athlete_user_id = u or coach_user_id = u)) or (t is not null and team_id = t));
  update supervision_archive set account_closed_at = now(), purge_after = now() + interval '5 years'
    where purge_after is null and (
      (u is not null and (coach_user_id = u or exists (select 1 from jsonb_array_elements(athletes) x where x->>'user_id' = u::text)))
      or (t is not null and team_id = t));
$$;

create or replace function public.close_team_archives() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.close_archives(null, old.id);
  return old;
end $$;
drop trigger if exists teams_close_archives on public.teams;
create trigger teams_close_archives before delete on public.teams
  for each row execute function public.close_team_archives();

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  perform public.close_archives(auth.uid(), null);
  delete from auth.users where id = auth.uid();
end $$;

-- Monthly purge of rows past purge_after.
create or replace function public.purge_archives() returns integer
language plpgsql security definer set search_path = public as $$
declare n1 integer; n2 integer;
begin
  delete from consent_archive where purge_after < now(); get diagnostics n1 = row_count;
  delete from supervision_archive where purge_after < now(); get diagnostics n2 = row_count;
  return n1 + n2;
end $$;
revoke execute on function public.purge_archives() from public, anon, authenticated;
revoke execute on function public.close_archives(uuid, uuid) from public, anon, authenticated;

-- Backfill (once): current consent records and supervision confirmations.
insert into public.consent_archive (athlete_user_id, athlete_name, birth_year, team_id, team_name, coach_user_id, coach_name,
    consent_version, c_participation, c_checkins, c_share_checkins, c_boards, c_attendance, c_testing, recorded_at)
  select m.user_id, pa.name, pa.birth_year, m.team_id, t.name, m.consent_recorded_by, pc.name,
    m.consent_version, m.c_participation, m.c_checkins, m.c_share_checkins, m.c_boards, m.c_attendance, m.c_testing, m.consent_recorded_at
  from public.team_members m
  join public.teams t on t.id = m.team_id
  left join public.profiles pa on pa.id = m.user_id
  left join public.profiles pc on pc.id = m.consent_recorded_by
  where m.consent_recorded_at is not null
    and not exists (select 1 from public.consent_archive a
                    where a.athlete_user_id = m.user_id and a.team_id = m.team_id and a.recorded_at = m.consent_recorded_at);
insert into public.supervision_archive (team_id, team_name, coach_user_id, coach_name, day, battery, confirmed_at, athletes)
  select s.team_id, t.name, s.coach_id, p.name, s.day, s.battery, s.confirmed_at,
    coalesce((select jsonb_agg(distinct jsonb_build_object('user_id', r.user_id, 'name', pr.name))
              from public.test_results r left join public.profiles pr on pr.id = r.user_id
              where r.team_id = s.team_id and r.day = s.day and r.reps is not null), '[]'::jsonb)
  from public.test_sessions s
  join public.teams t on t.id = s.team_id
  left join public.profiles p on p.id = s.coach_id
  where not exists (select 1 from public.supervision_archive a
                    where a.team_id = s.team_id and a.day = s.day and a.confirmed_at = s.confirmed_at);

-- ---------- Who can call what ----------
revoke execute on function public.set_my_self_level(uuid, smallint) from public, anon;
revoke execute on function public.set_member_level(uuid, uuid, smallint) from public, anon;
revoke execute on function public.my_lift_program() from public, anon;
revoke execute on function public.set_lift_program(uuid) from public, anon;
revoke execute on function public.members_following_other(uuid) from public, anon;
revoke execute on function public.member_levels(uuid) from public, anon;
revoke execute on function public.can_load_test(uuid, date, uuid) from public, anon;
revoke execute on function public.testing_eligibility(uuid, date) from public, anon;
revoke execute on function public.members_returning(uuid) from public, anon;
revoke execute on function public.join_team(text) from public, anon;
grant execute on function public.set_my_self_level(uuid, smallint) to authenticated;
grant execute on function public.set_member_level(uuid, uuid, smallint) to authenticated;
grant execute on function public.my_lift_program() to authenticated;
grant execute on function public.set_lift_program(uuid) to authenticated;
grant execute on function public.members_following_other(uuid) to authenticated;
grant execute on function public.member_levels(uuid) to authenticated;
grant execute on function public.can_load_test(uuid, date, uuid) to authenticated;
grant execute on function public.testing_eligibility(uuid, date) to authenticated;
grant execute on function public.members_returning(uuid) to authenticated;
grant execute on function public.join_team(text) to authenticated;

-- ---------- Monthly purge job (outside the transaction; skipped if pg_cron isn't available) ----------
-- On Supabase, enable pg_cron under Database → Extensions first if this prints a notice.
do $$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron not available (%). Enable it in Supabase → Database → Extensions, then re-run this block.', sqlerrm;
    return;
  end;
  begin
    perform cron.unschedule('approach-purge-archives');
  exception when others then null;
  end;
  perform cron.schedule('approach-purge-archives', '0 3 1 * *', 'select public.purge_archives()');
end $$;

-- ============================================================
-- Approach 2.2 pass 2 additions (same as supabase/migrations/006_approach_2_2_p2.sql)
-- ============================================================
-- ---------- 2.1 Live board (D-025, v2.1-pass-2 P3.3). Never loads or RPE. ----------
alter table public.live_progress add column if not exists state text not null default 'idle';
alter table public.live_progress drop constraint if exists live_progress_state_check;
alter table public.live_progress add constraint live_progress_state_check check (state in ('idle', 'lifting', 'resting', 'done'));
-- The resolved exercise name (G8), set x of y, last set's reps, when the rest ends, PRs today, finish time.
alter table public.live_progress add column if not exists exercise_name text;
alter table public.live_progress drop constraint if exists live_progress_exercise_name_check;
alter table public.live_progress add constraint live_progress_exercise_name_check check (exercise_name is null or char_length(exercise_name) <= 60);
alter table public.live_progress add column if not exists set_index smallint check (set_index between 0 and 50);
alter table public.live_progress add column if not exists set_count smallint check (set_count between 0 and 50);
alter table public.live_progress add column if not exists last_reps smallint check (last_reps between 0 and 100);
alter table public.live_progress add column if not exists rest_ends_at timestamptz;
alter table public.live_progress add column if not exists pr_today smallint not null default 0 check (pr_today between 0 and 50);
alter table public.live_progress add column if not exists finished_at timestamptz;

-- ---------- 2.1 Team accent color (D-023). Null = Approach default #C9CDD2. ----------
alter table public.teams add column if not exists accent_color text;
alter table public.teams drop constraint if exists teams_accent_color_check;
alter table public.teams add constraint teams_accent_color_check check (accent_color is null or accent_color ~ '^#[0-9A-Fa-f]{6}$');

-- ---------- 2.2 Extra recovery sessions (T4) ----------
alter table public.workout_logs add column if not exists kind text not null default 'lift';
alter table public.workout_logs drop constraint if exists workout_logs_kind_check;
alter table public.workout_logs add constraint workout_logs_kind_check check (kind in ('lift', 'extra_recovery'));

-- ---------- D-027: athletes following another team's lift program never appear on this team's live view ----------
create or replace function public.board_members(t uuid)
returns table (user_id uuid, board_name text, group_id uuid)
language sql stable security definer set search_path = public as $$
  select m.user_id, public.board_name(p.name, p.board_name_mode), m.group_id
  from team_members m join profiles p on p.id = m.user_id
  where m.team_id = t
    and (public.is_team_coach(t) or public.is_team_member(t))
    and public.on_boards(t, m.user_id)
    and public.lift_team_of(m.user_id) = t;
$$;

-- ---------- Effort board v2 (P4, D-024, FA-4, D-027) ----------
-- Rows: everyone on boards, plus the caller's own row. `ranked` = the athlete follows this team's lift program
-- (otherwise they're left off Overall, Sessions, Extra recovery, Consistency and Streak, and stay on Attendance,
-- Hours and Jump gains). Logs carry only time, session name, minutes and kind. jump_gain = inches gained in touch +
-- broad jump since the athlete's first test in the range (testing permission only). Never weights, lift results,
-- estimates, check-ins, levels or nutrition.
drop function if exists public.team_effort(uuid, date);
create function public.team_effort(t uuid, since date)
returns table (user_id uuid, board_name text, group_id uuid, is_me boolean, ranked boolean, logs json, attendance json, jump_gain numeric)
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
    (public.lift_team_of(r.user_id) = t),
    coalesce((select json_agg(json_build_object('at', l.logged_at, 'session', l.session_name, 'minutes', l.duration_min, 'kind', l.kind) order by l.logged_at)
              from workout_logs l where l.team_id = t and l.user_id = r.user_id and l.logged_at >= since::timestamptz - interval '1 day'), '[]'::json),
    case when public.has_perm(t, r.user_id, 'attendance') then
      coalesce((select json_agg(json_build_object('day', a.day, 'kind', a.kind, 'minutes', a.minutes) order by a.day)
                from attendance a where a.team_id = t and a.user_id = r.user_id and a.day >= since and a.minutes > 0), '[]'::json)
    end,
    case when public.has_perm(t, r.user_id, 'testing') then (
      select round(sum(g.gain), 1) from (
        select last_value(x.value) over w - first_value(x.value) over w as gain,
               row_number() over (partition by x.test_id order by x.day desc, x.created_at desc) as rn,
               count(*) over (partition by x.test_id) as n
        from test_results x
        where x.team_id = t and x.user_id = r.user_id and x.test_id in ('touch', 'broad') and not x.voided and x.day >= since
        window w as (partition by x.test_id order by x.day, x.created_at rows between unbounded preceding and unbounded following)
      ) g where g.rn = 1 and g.n >= 2
    ) end
  from rows r;
$$;

-- ---------- Testing-day board mode (D-021, P3.6, P6.10) ----------
-- Coach board only. Per athlete on the board with testing permission: jump tests done today, whether a strength check
-- was done (no value), and jump-test changes vs the previous result (inches / feet; null = first result, shown "Tested ✓").
-- Never raw values, never lift values.
create or replace function public.board_tests(t uuid, d date)
returns table (user_id uuid, jumps_done int, strength_done boolean, changes json)
language sql stable security definer set search_path = public as $$
  select m.user_id,
    (select count(distinct x.test_id)::int from test_results x
       where x.team_id = t and x.user_id = m.user_id and x.day = d and not x.voided and x.test_id in ('touch', 'broad', 'throw')),
    exists (select 1 from test_results x
       where x.team_id = t and x.user_id = m.user_id and x.day = d and not x.voided and x.reps is not null),
    coalesce((
      select json_agg(json_build_object('test', c.test_id, 'delta', c.delta, 'unit', c.unit) order by c.test_id)
      from (
        select distinct on (x.test_id) x.test_id, x.unit,
          x.value - (select p.value from test_results p
                     where p.team_id = t and p.user_id = m.user_id and p.test_id = x.test_id and not p.voided
                       and (p.day < x.day or (p.day = x.day and p.created_at < x.created_at))
                     order by p.day desc, p.created_at desc limit 1) as delta
        from test_results x
        where x.team_id = t and x.user_id = m.user_id and x.day = d and not x.voided and x.test_id in ('touch', 'broad', 'throw')
        order by x.test_id, x.created_at desc
      ) c
    ), '[]'::json)
  from team_members m
  where m.team_id = t and public.is_team_coach(t)
    and public.on_boards(t, m.user_id) and public.has_perm(t, m.user_id, 'testing');
$$;

-- ---------- 2.3 Rack groups (D-026, rack-groups.md R1) ----------
create table if not exists public.rack_groups (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 20),
  sort_order smallint not null default 0,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index if not exists rack_groups_team on public.rack_groups (team_id, sort_order);

create table if not exists public.rack_group_members (
  group_id uuid not null references public.rack_groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  primary key (group_id, user_id),
  -- An athlete is in at most one rack group per team.
  unique (team_id, user_id)
);

alter table public.rack_groups enable row level security;
alter table public.rack_group_members enable row level security;

-- Only the team's coach writes. Members read their team's rack names (neutral names) and their own membership.
drop policy if exists "coach manages racks" on public.rack_groups;
create policy "coach manages racks" on public.rack_groups
  for all to authenticated using (public.is_team_coach(team_id)) with check (public.is_team_coach(team_id));
drop policy if exists "members read rack names" on public.rack_groups;
create policy "members read rack names" on public.rack_groups
  for select to authenticated using (public.is_team_member(team_id));

drop policy if exists "coach manages rack members" on public.rack_group_members;
create policy "coach manages rack members" on public.rack_group_members
  for all to authenticated
  using (public.is_team_coach(team_id))
  with check (
    public.is_team_coach(team_id) and public.is_current_member(team_id, user_id)
    and exists (select 1 from rack_groups g where g.id = group_id and g.team_id = rack_group_members.team_id)
  );
drop policy if exists "athlete reads own rack" on public.rack_group_members;
create policy "athlete reads own rack" on public.rack_group_members
  for select to authenticated using (user_id = auth.uid());

-- Leaving or being removed from a team removes the athlete from its racks (the rack keeps its name).
create or replace function public.leave_racks() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from rack_group_members where team_id = old.team_id and user_id = old.user_id;
  return old;
end $$;
drop trigger if exists team_members_leave_racks on public.team_members;
create trigger team_members_leave_racks after delete on public.team_members
  for each row execute function public.leave_racks();

-- R5 partner names: Legal is still checking consent box 4 (B5). Until it's confirmed this returns false and athletes
-- see "with 2 teammates". To turn names on later without a new app build: replace this function to return true.
create or replace function public.rack_partner_names() returns boolean
language sql immutable as $$ select false $$;

-- The athlete's rack on a team: rack name, partner count, and partner board names only when the flag is on
-- (partners without boards or set to Hidden are counted in `others`, never named).
create or replace function public.my_rack(t uuid)
returns table (group_id uuid, rack_name text, partners int, partner_names text[], others int)
language sql stable security definer set search_path = public as $$
  select g.id, g.name,
    (select count(*)::int from rack_group_members o where o.group_id = g.id and o.user_id <> auth.uid()),
    case when public.rack_partner_names() then
      (select array_agg(public.board_name(p.name, p.board_name_mode) order by p.name)
       from rack_group_members o join profiles p on p.id = o.user_id
       where o.group_id = g.id and o.user_id <> auth.uid() and public.on_boards(t, o.user_id))
    end,
    case when public.rack_partner_names() then
      (select count(*)::int from rack_group_members o
       where o.group_id = g.id and o.user_id <> auth.uid() and not public.on_boards(t, o.user_id))
    end
  from rack_group_members me join rack_groups g on g.id = me.group_id
  where me.team_id = t and me.user_id = auth.uid();
$$;

-- The coach saves all racks at once (replaces the current racks; R2.6). Only current members can be placed.
create or replace function public.save_racks(t uuid, racks jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  r jsonb;
  i int := 0;
  gid uuid;
begin
  if auth.uid() is null or not public.is_team_coach(t) then raise exception 'Only the team coach can change racks.'; end if;
  delete from rack_groups where team_id = t;
  for r in select * from jsonb_array_elements(coalesce(racks, '[]'::jsonb)) loop
    insert into rack_groups (team_id, name, sort_order) values (t, left(coalesce(nullif(trim(r->>'name'), ''), 'Rack ' || (i + 1)), 20), i)
      returning id into gid;
    insert into rack_group_members (group_id, user_id, team_id)
      select gid, u::uuid, t from jsonb_array_elements_text(coalesce(r->'users', '[]'::jsonb)) u
      where public.is_current_member(t, u::uuid)
      on conflict (team_id, user_id) do nothing;
    i := i + 1;
  end loop;
end $$;

-- ---------- Live updates ----------
do $$
begin
  begin alter publication supabase_realtime add table public.rack_groups; exception when duplicate_object then null; when undefined_object then null; end;
  begin alter publication supabase_realtime add table public.rack_group_members; exception when duplicate_object then null; when undefined_object then null; end;
  begin alter publication supabase_realtime add table public.test_results; exception when duplicate_object then null; when undefined_object then null; end;
end $$;

-- ---------- Who can call what ----------
revoke execute on function public.team_effort(uuid, date) from public, anon;
revoke execute on function public.board_tests(uuid, date) from public, anon;
revoke execute on function public.my_rack(uuid) from public, anon;
revoke execute on function public.save_racks(uuid, jsonb) from public, anon;
revoke execute on function public.leave_racks() from public, anon, authenticated;
grant execute on function public.team_effort(uuid, date) to authenticated;
grant execute on function public.board_tests(uuid, date) to authenticated;
grant execute on function public.my_rack(uuid) to authenticated;
grant execute on function public.save_racks(uuid, jsonb) to authenticated;
grant execute on function public.rack_partner_names() to authenticated;
revoke all on public.rack_groups, public.rack_group_members from anon;
grant select, insert, update, delete on public.rack_groups, public.rack_group_members to authenticated;

-- ============================================================
-- Approach 2.2 pass 3 additions (same as supabase/migrations/007_approach_2_2_p3.sql)
-- ============================================================
-- ---------- 3.2 / 3.4 live board: superset label, station, shared rotation time. Never loads or RPE. ----------
alter table public.live_progress add column if not exists group_label text;
alter table public.live_progress drop constraint if exists live_progress_group_label_check;
alter table public.live_progress add constraint live_progress_group_label_check check (group_label is null or char_length(group_label) <= 120);
alter table public.live_progress add column if not exists station_id text;
alter table public.live_progress drop constraint if exists live_progress_station_id_check;
alter table public.live_progress add constraint live_progress_station_id_check check (station_id is null or char_length(station_id) <= 40);
alter table public.live_progress add column if not exists rotate_at timestamptz;

-- ---------- 3.4 Station rotation: one shared timer per team session (no athlete data) ----------
-- round is 0-based; rotate_at is when the current round's station time ends. Clients work out the rest from the clock.
create table if not exists public.station_runs (
  team_id uuid not null references public.teams (id) on delete cascade,
  day date not null,
  session_id text not null,
  round smallint not null default 0 check (round between 0 and 12),
  rounds smallint not null check (rounds between 1 and 12),
  station_sec integer not null check (station_sec between 60 and 3600),
  transition_sec integer not null default 60 check (transition_sec between 0 and 600),
  rotate_at timestamptz not null,
  ended_at timestamptz,
  started_by uuid default auth.uid() references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (team_id, day)
);
alter table public.station_runs enable row level security;
drop policy if exists "coach runs stations" on public.station_runs;
create policy "coach runs stations" on public.station_runs
  for all to authenticated using (public.is_team_coach(team_id)) with check (public.is_team_coach(team_id));
drop policy if exists "members follow stations" on public.station_runs;
create policy "members follow stations" on public.station_runs
  for select to authenticated using (public.is_team_member(team_id));
revoke all on public.station_runs from anon;
grant select, insert, update, delete on public.station_runs to authenticated;

do $$
begin
  begin alter publication supabase_realtime add table public.station_runs; exception when duplicate_object then null; when undefined_object then null; end;
end $$;

-- ==================== 2.2.1 (migration 008) ====================
-- Approach Strength 2.2.1 (docs/specs/v2.2.1.md §6, §8). Safe to re-run.
--
-- §6 J1: member_levels no longer returns another team's numeric level. It returns only the adjusted exercises.
-- §6 J3: team_effort no longer returns `ranked`. Teammates don't receive athletes who follow another team's lift
--        program (D-027); the coach gets every row and marks them with members_following_other.
-- §8   Coach Terms: profiles.coach_terms_version and profiles.coach_terms_accepted_at (the only new fields; Legal
--        approved, compliance § Outside coaches). Only the user writes their own row; nobody can clear it.
--        Recording consent and confirming testing-day supervision need the current version.

-- ---------- §8 Coach Terms ----------
alter table public.profiles add column if not exists coach_terms_version text;
alter table public.profiles add column if not exists coach_terms_accepted_at timestamptz;

-- The current Coach Terms version (Terms §4, 11/14).
create or replace function public.current_coach_terms() returns text
language sql immutable as $$ select '2026-11-14'::text $$;

create or replace function public.coach_terms_ok(u uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    where p.id = u and p.coach_terms_version = public.current_coach_terms() and p.coach_terms_accepted_at is not null
  );
$$;

-- The caller's own acceptance (other users can't read these columns: they aren't in the profiles select grant).
create or replace function public.my_coach_terms()
returns table (version text, accepted_at timestamptz, current_version text)
language sql stable security definer set search_path = public as $$
  select p.coach_terms_version, p.coach_terms_accepted_at, public.current_coach_terms()
  from profiles p where p.id = auth.uid();
$$;

-- Accept the current Coach Terms (own row only; coach accounts only). Accepting again keeps the first time for this
-- version.
create or replace function public.accept_coach_terms(v text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if v is distinct from public.current_coach_terms() then raise exception 'Those aren''t the current Coach Terms.'; end if;
  if not exists (select 1 from profiles where id = auth.uid() and role = 'coach') then
    raise exception 'The Coach Terms are for coach accounts.';
  end if;
  update profiles set
      coach_terms_accepted_at = case when coach_terms_version = v and coach_terms_accepted_at is not null then coach_terms_accepted_at else now() end,
      coach_terms_version = v
    where id = auth.uid();
end $$;

-- Nobody can clear an acceptance (or move it back in time). Direct column updates aren't granted to anyone, so only the
-- functions above write these columns; this trigger is the backstop.
create or replace function public.keep_coach_terms() returns trigger
language plpgsql as $$
begin
  if old.coach_terms_accepted_at is not null and (new.coach_terms_accepted_at is null or new.coach_terms_version is null) then
    raise exception 'Coach Terms acceptance can''t be cleared.';
  end if;
  return new;
end $$;
drop trigger if exists profiles_keep_coach_terms on public.profiles;
create trigger profiles_keep_coach_terms before update of coach_terms_version, coach_terms_accepted_at on public.profiles
  for each row execute function public.keep_coach_terms();

-- Column grants: users still edit only name, position and board name; the Coach Terms columns aren't readable by others.
revoke update on public.profiles from authenticated;
grant update (name, position, board_name_mode) on public.profiles to authenticated;
revoke select on public.profiles from authenticated;
grant select (id, name, role, position, created_at, birth_year, is_minor, board_name_mode) on public.profiles to authenticated;

-- New coach sign-up: the separate Coach Terms checkbox sends coach_terms_version in the sign-up metadata (2.2.1 §8).
-- Recorded only for a coach account and only for the current version.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  y smallint := nullif(new.raw_user_meta_data ->> 'birth_year', '')::smallint;
  minor boolean := public.minor_from(y, (new.raw_user_meta_data ->> 'is_minor')::boolean);
  r text := case when new.raw_user_meta_data ->> 'role' = 'coach' and minor = false then 'coach' else 'athlete' end;
  terms boolean := r = 'coach' and (new.raw_user_meta_data ->> 'coach_terms_version') = public.current_coach_terms();
begin
  if y is not null and extract(year from now())::int - y < 13 then
    raise exception 'Not eligible.';
  end if;
  insert into public.profiles (id, name, role, position, birth_year, is_minor, coach_terms_version, coach_terms_accepted_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    -- Coach accounts are for adults 18 and older.
    r,
    new.raw_user_meta_data ->> 'position',
    y,
    minor,
    case when terms then public.current_coach_terms() end,
    case when terms then now() end
  );
  return new;
end $$;

-- Recording parent consent needs the current Coach Terms (Terms §2, §4.3).
create or replace function public.record_consent(
  t uuid, athlete uuid, participation boolean, checkins boolean, share_checkins boolean,
  boards boolean, attendance boolean, testing boolean
) returns void
language plpgsql security definer set search_path = public as $$
declare
  tm team_members;
begin
  if auth.uid() is null or not public.is_team_coach(t) then
    raise exception 'Only the team coach can record consent.';
  end if;
  if not public.coach_terms_ok(auth.uid()) then
    raise exception 'Accept the Coach Terms first.';
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
    where team_id = t and user_id = athlete
    returning * into tm;
  if not found then
    raise exception 'That athlete isn''t on the team.';
  end if;
  insert into consent_archive (athlete_user_id, athlete_name, birth_year, team_id, team_name, coach_user_id, coach_name,
      consent_version, c_participation, c_checkins, c_share_checkins, c_boards, c_attendance, c_testing, recorded_at)
    select athlete, pa.name, pa.birth_year, t, tt.name, auth.uid(), pc.name,
      tm.consent_version, tm.c_participation, tm.c_checkins, tm.c_share_checkins, tm.c_boards, tm.c_attendance, tm.c_testing, now()
    from teams tt
    left join profiles pa on pa.id = athlete
    left join profiles pc on pc.id = auth.uid()
    where tt.id = t;
end $$;

-- Confirming testing-day supervision (which starts strength checks) needs the current Coach Terms (Terms §2, §4.5).
drop policy if exists "coach confirms supervision" on public.test_sessions;
create policy "coach confirms supervision" on public.test_sessions
  for insert to authenticated with check (
    coach_id = auth.uid() and public.is_team_coach(team_id) and public.coach_terms_ok(auth.uid())
  );

revoke execute on function public.accept_coach_terms(text) from public, anon;
revoke execute on function public.my_coach_terms() from public, anon;
revoke execute on function public.coach_terms_ok(uuid) from public, anon;
revoke execute on function public.record_consent(uuid, uuid, boolean, boolean, boolean, boolean, boolean, boolean) from public, anon;
grant execute on function public.accept_coach_terms(text) to authenticated;
grant execute on function public.my_coach_terms() to authenticated;
grant execute on function public.coach_terms_ok(uuid) to authenticated;
grant execute on function public.record_consent(uuid, uuid, boolean, boolean, boolean, boolean, boolean, boolean) to authenticated;

-- ---------- §6 J1: member_levels returns only the adjusted exercises ----------
-- `ex` is the coach app's table for this team's program: { key: [exercise at level 1, at level 2, at level 3] }
-- (null = left out). For each athlete whose exercises resolve lower than this team's level because of another team,
-- `adjusted` = { key: the exercise they get } for the keys that change. No level value, team, coach or reason.
drop function if exists public.member_levels(uuid);
drop function if exists public.member_levels(uuid, jsonb);
create function public.member_levels(t uuid, ex jsonb default '{}'::jsonb)
returns table (user_id uuid, team_level smallint, confirmed boolean, set_at timestamptz, adjusted jsonb)
language sql stable security definer set search_path = public as $$
  select m.user_id, m.level, (m.level_set_by is not null), m.level_set_at,
    case when m.level is not null and r.lvl < m.level then
      coalesce((
        select jsonb_object_agg(e.key, e.value -> (r.lvl - 1))
        from jsonb_each(case when jsonb_typeof(ex) = 'object' then ex else '{}'::jsonb end) e
        where jsonb_typeof(e.value) = 'array' and jsonb_array_length(e.value) = 3
          and (e.value -> (r.lvl - 1)) is distinct from (e.value -> (m.level - 1))
      ), '{}'::jsonb)
    else '{}'::jsonb end
  from team_members m
  cross join lateral (select public.resolve_level_of(m.user_id)::int as lvl) r
  where m.team_id = t and public.is_team_coach(t);
$$;
revoke execute on function public.member_levels(uuid, jsonb) from public, anon;
grant execute on function public.member_levels(uuid, jsonb) to authenticated;

-- ---------- §6 J3: team_effort without `ranked` ----------
-- Coach: every row on boards (members_following_other tells the coach app who isn't ranked). Teammates: only athletes
-- who follow this team's lift program, plus the caller's own row. Logs carry only time, session name, minutes and kind.
-- Never weights, lift results, estimates, check-ins, levels or nutrition.
drop function if exists public.team_effort(uuid, date);
create function public.team_effort(t uuid, since date)
returns table (user_id uuid, board_name text, group_id uuid, is_me boolean, logs json, attendance json, jump_gain numeric)
language sql stable security definer set search_path = public as $$
  with allowed as (
    select public.is_team_coach(t) as coach,
           public.is_team_coach(t)
        or (public.is_team_member(t) and coalesce((select effort_board from teams where id = t), true)) as ok
  ),
  rows as (
    select m.user_id, m.group_id, p.name, p.board_name_mode, (m.user_id = auth.uid()) as me
    from team_members m join profiles p on p.id = m.user_id, allowed
    where m.team_id = t and allowed.ok
      and (public.on_boards(t, m.user_id) or m.user_id = auth.uid())
      and (allowed.coach or m.user_id = auth.uid() or public.lift_team_of(m.user_id) = t)
  )
  select r.user_id,
    coalesce(public.board_name(r.name, case when r.me and r.board_name_mode = 'hidden' then 'short' else r.board_name_mode end), 'Athlete'),
    r.group_id,
    r.me,
    coalesce((select json_agg(json_build_object('at', l.logged_at, 'session', l.session_name, 'minutes', l.duration_min, 'kind', l.kind) order by l.logged_at)
              from workout_logs l where l.team_id = t and l.user_id = r.user_id and l.logged_at >= since::timestamptz - interval '1 day'), '[]'::json),
    case when public.has_perm(t, r.user_id, 'attendance') then
      coalesce((select json_agg(json_build_object('day', a.day, 'kind', a.kind, 'minutes', a.minutes) order by a.day)
                from attendance a where a.team_id = t and a.user_id = r.user_id and a.day >= since and a.minutes > 0), '[]'::json)
    end,
    case when public.has_perm(t, r.user_id, 'testing') then (
      select round(sum(g.gain), 1) from (
        select last_value(x.value) over w - first_value(x.value) over w as gain,
               row_number() over (partition by x.test_id order by x.day desc, x.created_at desc) as rn,
               count(*) over (partition by x.test_id) as n
        from test_results x
        where x.team_id = t and x.user_id = r.user_id and x.test_id in ('touch', 'broad') and not x.voided and x.day >= since
        window w as (partition by x.test_id order by x.day, x.created_at rows between unbounded preceding and unbounded following)
      ) g where g.rn = 1 and g.n >= 2
    ) end
  from rows r;
$$;
revoke execute on function public.team_effort(uuid, date) from public, anon;
grant execute on function public.team_effort(uuid, date) to authenticated;

-- ==================== 2.3.0 Phase A (migration 009) ====================
-- Approach Strength 2.3.0 Phase A: trainer teams (docs/specs/trainer-mode.md v0.3 §A1–A6; compliance § Trainer mode
-- T1–T6). Safe to re-run. Run after 008 in the Supabase SQL editor. Also folded into supabase/schema.sql.
--
-- New server fields (all listed in compliance T4; nothing else):
--   teams.kind ('volleyball' | 'general'; existing teams = volleyball; locked once the team has members)
--   teams.trainer_terms_version, trainer_terms_accepted_at, trainer_terms_accepted_by, trainer_confirmations (T2)
--   teams.trainer_verified_at, trainer_verified_by (T3, the TM-19 gate; service role writes only)
--   team_programs.target_user_id (A4: a program for one client)
-- Volleyball teams don't change.

-- ---------- Team type ----------
alter table public.teams add column if not exists kind text not null default 'volleyball';
alter table public.teams drop constraint if exists teams_kind_check;
alter table public.teams add constraint teams_kind_check check (kind in ('volleyball', 'general'));

-- ---------- Trainer Terms record (T2) and the TM-19 gate (T3) ----------
alter table public.teams add column if not exists trainer_terms_version text;
alter table public.teams add column if not exists trainer_terms_accepted_at timestamptz;
alter table public.teams add column if not exists trainer_terms_accepted_by uuid references public.profiles (id) on delete set null;
alter table public.teams add column if not exists trainer_confirmations jsonb;
alter table public.teams add column if not exists trainer_verified_at timestamptz;
alter table public.teams add column if not exists trainer_verified_by text;

-- The current Trainer Terms (Terms §4T, soft-launch notice v2.5 of 11/15).
create or replace function public.current_trainer_terms() returns text
language sql immutable as $$ select '2026-11-15'::text $$;

create or replace function public.team_kind(t uuid) returns text
language sql stable security definer set search_path = public as $$
  select kind from teams where id = t;
$$;

-- Only the service role (Ryan, Supabase dashboard or an admin script) may set or clear verification. A team's kind
-- can't change once it has members (a minors' team can never become a general team).
create or replace function public.guard_team_fields() returns trigger
language plpgsql as $$
declare
  privileged boolean := current_user in ('postgres', 'supabase_admin', 'service_role')
    or coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role';
begin
  if (new.trainer_verified_at is distinct from old.trainer_verified_at or new.trainer_verified_by is distinct from old.trainer_verified_by)
     and not privileged then
    raise exception 'Only Approach Strength can open a trainer''s team.';
  end if;
  if new.kind is distinct from old.kind and exists (select 1 from team_members where team_id = old.id) then
    raise exception 'A team''s type can''t change once it has members.';
  end if;
  return new;
end $$;
drop trigger if exists teams_guard_fields on public.teams;
create trigger teams_guard_fields before update on public.teams
  for each row execute function public.guard_team_fields();

-- Column grants: members see the team's public columns only; the Terms record and verification are read through
-- my_team_status (the trainer) or the service role. Users update only the settings columns.
revoke select on public.teams from authenticated;
grant select (id, name, join_code, coach_id, created_at, practice_min, match_min, tournament_min, effort_board, board_effort_panel,
  team_goal, med_ball_lb, accent_color, kind) on public.teams to authenticated;
revoke update on public.teams from authenticated;
grant update (name, practice_min, match_min, tournament_min, effort_board, board_effort_panel, team_goal, med_ball_lb, accent_color)
  on public.teams to authenticated;
revoke insert on public.teams from authenticated;
grant insert (name, join_code, coach_id) on public.teams to authenticated;

-- Volleyball teams are still created with a plain insert (kind defaults to volleyball). General teams only through
-- create_general_team, which records the three confirmations.
drop policy if exists "coaches create teams" on public.teams;
create policy "coaches create teams" on public.teams
  for insert to authenticated with check (
    coach_id = auth.uid()
    and kind = 'volleyball'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
  );

-- F31 / T2: three separate confirmations, all required, recorded with the Terms version and a timestamp each.
create or replace function public.create_general_team(team_name text, join_code text, terms_version text, confirmations jsonb)
returns json
language plpgsql security definer set search_path = public as $$
declare
  t teams;
  k text;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if not exists (select 1 from profiles where id = auth.uid() and role = 'coach' and is_minor is not true) then
    raise exception 'Only coach and trainer accounts can create a team.';
  end if;
  if terms_version is distinct from public.current_trainer_terms() then
    raise exception 'Those aren''t the current Trainer Terms.';
  end if;
  foreach k in array array['terms', 'adults_responsible', 'no_cobranding'] loop
    if jsonb_typeof(confirmations -> k) is distinct from 'string' then
      raise exception 'All three confirmations are required.';
    end if;
  end loop;
  if char_length(trim(team_name)) not between 1 and 40 then raise exception 'Use a team name of 1 to 40 characters.'; end if;
  insert into teams (name, join_code, coach_id, kind, effort_board, trainer_terms_version, trainer_terms_accepted_at,
      trainer_terms_accepted_by, trainer_confirmations)
    values (trim(team_name), upper(join_code), auth.uid(), 'general', false, terms_version, now(), auth.uid(),
      jsonb_build_object('terms', confirmations -> 'terms', 'adults_responsible', confirmations -> 'adults_responsible',
        'no_cobranding', confirmations -> 'no_cobranding'))
    returning * into t;
  return json_build_object('id', t.id, 'name', t.name, 'join_code', t.join_code, 'coach_id', t.coach_id,
    'created_at', t.created_at, 'kind', t.kind, 'effort_board', t.effort_board);
end $$;

-- The trainer's own view of the gate and the Terms version (F31 banner, F32 states). Coach of the team only.
create or replace function public.my_team_status(t uuid)
returns table (kind text, verified_at timestamptz, terms_version text, current_terms text)
language sql stable security definer set search_path = public as $$
  select tt.kind, tt.trainer_verified_at, tt.trainer_terms_version, public.current_trainer_terms()
  from teams tt where tt.id = t and tt.coach_id = auth.uid();
$$;

-- F31: accept a changed Trainer Terms (checkbox 1 again).
create or replace function public.accept_trainer_terms(t uuid, terms_version text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if terms_version is distinct from public.current_trainer_terms() then raise exception 'Those aren''t the current Trainer Terms.'; end if;
  update teams set trainer_terms_version = terms_version, trainer_terms_accepted_at = now(), trainer_terms_accepted_by = auth.uid(),
      trainer_confirmations = coalesce(trainer_confirmations, '{}'::jsonb) || jsonb_build_object('terms', to_jsonb(now()::text))
    where id = t and coach_id = auth.uid() and kind = 'general';
  if not found then raise exception 'Only the trainer can do that.'; end if;
end $$;

-- A general team can take clients and posts only when verified and on the current Terms.
create or replace function public.general_team_open(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from teams where id = t and kind = 'general' and trainer_verified_at is not null);
$$;

-- Posting in a general team: open (verified) and the trainer is on the current Trainer Terms (F31, F32a, T3.6).
create or replace function public.general_team_can_post(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from teams where id = t and kind = 'general' and trainer_verified_at is not null
    and trainer_terms_version = public.current_trainer_terms());
$$;

-- ---------- Join (T1, T3): adults only, and only once the team is open ----------
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
  if t.kind = 'general' then
    -- is_minor decides, not the team someone came from (T1). Unknown age counts as a minor.
    if minor is distinct from false then
      raise exception 'This team is for adults 18 and older.';
    end if;
    if t.trainer_verified_at is null then
      raise exception 'This trainer''s team isn''t open yet.';
    end if;
  end if;
  update profiles p set lift_program_team_id = public.lift_team_of(auth.uid())
    where p.id = auth.uid() and p.lift_program_team_id is null
      and exists (select 1 from team_members where user_id = auth.uid() and team_id <> t.id);
  -- General teams: participation on; check-ins, sharing, boards, attendance and testing off until the client chooses
  -- (T5, T6). Volleyball: as before.
  insert into team_members (team_id, user_id, c_participation)
    values (t.id, auth.uid(), minor = false)
    on conflict do nothing;
  return json_build_object(
    'id', t.id, 'name', t.name, 'join_code', t.join_code, 'coach_id', t.coach_id,
    'created_at', t.created_at, 'coach_name', (select name from profiles where id = t.coach_id), 'kind', t.kind
  );
end $$;

-- Backstop: no path can put a minor (or someone of unknown age) on a general team (T1).
create or replace function public.guard_general_member() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.team_kind(new.team_id) = 'general'
     and (select is_minor from profiles where id = new.user_id) is distinct from false then
    raise exception 'This team is for adults 18 and older.';
  end if;
  return new;
end $$;
drop trigger if exists team_members_guard_general on public.team_members;
create trigger team_members_guard_general before insert on public.team_members
  for each row execute function public.guard_general_member();

-- No parent consent in general teams (T1): clients choose for themselves in "Your choices".
create or replace function public.reject_consent_general() returns trigger
language plpgsql as $$
begin
  if public.team_kind(new.team_id) = 'general' and new.consent_recorded_by is distinct from new.user_id
     and new.consent_recorded_by is distinct from old.consent_recorded_by then
    raise exception 'Clients choose these themselves.';
  end if;
  return new;
end $$;
drop trigger if exists team_members_no_consent_general on public.team_members;
create trigger team_members_no_consent_general before update of consent_recorded_by on public.team_members
  for each row execute function public.reject_consent_general();

-- ---------- Programs for one client (A4, T4) ----------
alter table public.team_programs add column if not exists target_user_id uuid references public.profiles (id) on delete cascade;
-- One program per target: whole team ('all'), a group (its id), or one client (group_key = 'client:' || user id).
alter table public.team_programs drop constraint if exists team_programs_target_key;
alter table public.team_programs add constraint team_programs_target_key
  check ((target_user_id is null and group_key not like 'client:%') or (target_user_id is not null and group_key = 'client:' || target_user_id::text));

create or replace function public.my_group(t uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select group_id from team_members where team_id = t and user_id = auth.uid();
$$;

-- A client sees only programs for the whole team, their own group, or themselves (never another client's, even its
-- title). Volleyball teams: members see every group's workout, as before.
drop policy if exists "team sees posted workout" on public.team_programs;
create policy "team sees posted workout" on public.team_programs
  for select to authenticated using (
    public.is_team_coach(team_id)
    or (public.is_team_member(team_id) and (
      public.team_kind(team_id) = 'volleyball'
      or target_user_id = auth.uid()
      or (target_user_id is null and (group_key = 'all' or group_key = public.my_group(team_id)::text))
    ))
  );
-- Posting needs an open team on the current Terms in general teams (F32a, T3.6, F31). Volleyball: as before.
drop policy if exists "coach posts workout" on public.team_programs;
create policy "coach posts workout" on public.team_programs
  for insert to authenticated with check (
    public.is_team_coach(team_id)
    and (public.team_kind(team_id) = 'volleyball' or (
      public.general_team_can_post(team_id)
      and (target_user_id is null or public.is_current_member(team_id, target_user_id))
    ))
  );
drop policy if exists "coach updates workout" on public.team_programs;
create policy "coach updates workout" on public.team_programs
  for update to authenticated using (public.is_team_coach(team_id)) with check (
    public.is_team_coach(team_id)
    and (public.team_kind(team_id) = 'volleyball' or (
      public.general_team_can_post(team_id)
      and (target_user_id is null or public.is_current_member(team_id, target_user_id))
    ))
  );

-- ---------- Groups (T4): in general teams a client sees only their own group's name ----------
drop policy if exists "coach or member sees groups" on public.team_groups;
create policy "coach or member sees groups" on public.team_groups
  for select to authenticated using (
    public.is_team_coach(team_id)
    or (public.is_team_member(team_id) and (public.team_kind(team_id) = 'volleyball' or id = public.my_group(team_id)))
  );

-- ---------- No testing in general teams (adult rules A2) ----------
drop policy if exists "coach confirms supervision" on public.test_sessions;
create policy "coach confirms supervision" on public.test_sessions
  for insert to authenticated with check (
    coach_id = auth.uid() and public.is_team_coach(team_id) and public.coach_terms_ok(auth.uid())
    and public.team_kind(team_id) = 'volleyball'
  );
drop policy if exists "enter test results" on public.test_results;
create policy "enter test results" on public.test_results
  for insert to authenticated with check (
    entered_by = auth.uid() and public.has_perm(team_id, user_id, 'testing') and not voided
    and public.team_kind(team_id) = 'volleyball'
    and (user_id = auth.uid() or (public.is_team_coach(team_id) and public.is_current_member(team_id, user_id)))
    and (
      (test_id in ('touch', 'broad', 'throw') and reps is null)
      or (reps is not null and day between current_date - 1 and current_date + 1
          and public.supervised(team_id, day) and public.can_load_test(user_id, day, team_id))
    )
  );

revoke execute on function public.create_general_team(text, text, text, jsonb) from public, anon;
revoke execute on function public.my_team_status(uuid) from public, anon;
revoke execute on function public.accept_trainer_terms(uuid, text) from public, anon;
grant execute on function public.create_general_team(text, text, text, jsonb) to authenticated;
grant execute on function public.my_team_status(uuid) to authenticated;
grant execute on function public.accept_trainer_terms(uuid, text) to authenticated;
grant execute on function public.team_kind(uuid) to authenticated;
grant execute on function public.general_team_open(uuid) to authenticated;
grant execute on function public.general_team_can_post(uuid) to authenticated;
grant execute on function public.my_group(uuid) to authenticated;
revoke execute on function public.join_team(text) from public, anon;
grant execute on function public.join_team(text) to authenticated;

-- =====================================================================
-- 2.3.0 Phase B (migration 010)
-- =====================================================================
-- Approach Strength 2.3.0, Phase B (spec docs/specs/trainer-mode.md v0.3 §B4, §B7; compliance T4, T5).
-- Safe to run more than once. Run after 009_trainer_a.sql. Volleyball teams don't change.
--
-- New server field (compliance T4 row "Gym equipment profile (per team)"): teams.gym_equipment.
-- Program goal, weeks and cardio prescriptions live inside the existing team_programs.program JSON; cardio logs keep
-- minutes only inside the existing workout_logs.entries JSON (T4 "Cardio logs: minutes only"). Templates stay on the
-- trainer's device (T4 "Templates (trainer-private)"; no table).

-- ---------- F40 gym equipment profile (general teams only; gym equipment ids only, no personal data) ----------
alter table public.teams add column if not exists gym_equipment text[];
alter table public.teams drop constraint if exists teams_gym_equipment_known;
alter table public.teams add constraint teams_gym_equipment_known check (
  gym_equipment is null or gym_equipment <@ array[
    'barbell', 'trap-bar', 'dumbbells', 'kettlebells', 'bench', 'cable', 'pullup-bar', 'box', 'med-ball', 'bands',
    'leg-press', 'leg-curl-machine', 'leg-extension-machine', 'chest-press-machine', 'shoulder-press-machine',
    'assisted-pullup-machine', 'sled', 'bike', 'rower', 'treadmill', 'elliptical', 'stair-climber', 'jump-rope'
  ]::text[]
);

-- Volleyball teams keep no gym profile (their equipment stays per program, as built).
create or replace function public.guard_gym_equipment() returns trigger
language plpgsql as $$
begin
  if new.gym_equipment is not null and new.kind <> 'general' then
    raise exception 'Only trainer teams have a gym equipment profile.';
  end if;
  return new;
end $$;
drop trigger if exists teams_guard_gym on public.teams;
create trigger teams_guard_gym before insert or update of gym_equipment, kind on public.teams
  for each row execute function public.guard_gym_equipment();

-- Members read it (resolution uses it); only the team's trainer updates it (existing "coach edits team" policy).
grant select (gym_equipment) on public.teams to authenticated;
grant update (gym_equipment) on public.teams to authenticated;

-- ---------- F43 / compliance T5: clients delete their check-in history (all entries) ----------
drop policy if exists "athlete deletes own check-ins" on public.readiness;
create policy "athlete deletes own check-ins" on public.readiness
  for delete to authenticated using (user_id = auth.uid());
grant delete on public.readiness to authenticated;

create or replace function public.delete_my_checkins() returns integer
language plpgsql security invoker set search_path = public as $$
declare
  n integer;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  delete from readiness where user_id = auth.uid();
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.delete_my_checkins() from public, anon;
grant execute on function public.delete_my_checkins() to authenticated;

-- ==================== 2.4.0 Training v3 Part 1 (migration 011) ====================
-- New server fields (compliance V4; none is health data, none is about athletes):
--   * warmup_templates (id, team_id, created_by, name, items jsonb, created_at): a coach's or trainer's saved warm-ups.
--     Coach-private: only the team's own coach reads or writes them. No athlete data.
--   * teams.default_warmup ('approach' | 'template' | 'none') and teams.default_warmup_template_id.
--   * teams.limited_space (the team's "Limited space: in-place Raise drills" setting).
-- Everything else in Part 1 lives inside the existing team_programs.program JSON (session.source, levelAdjust,
-- levelAdjustOffFor, warmup, sessionMinutes, minutesByWeekday, targetMinutes, fitLog), the existing team calendar JSON
-- (CalendarEvent.roomMinutes) and the existing workout_logs.entries JSON (ramp-up sets marked warmup: true).

-- ---------- warm-up templates (F49) ----------
create table if not exists public.warmup_templates (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  items jsonb not null default '{}'::jsonb check (jsonb_typeof(items) = 'object'),
  created_at timestamptz not null default now()
);
create index if not exists warmup_templates_team on public.warmup_templates (team_id, created_at desc);
alter table public.warmup_templates enable row level security;

-- Only the team's coach (or trainer), and only their own templates.
drop policy if exists "coach reads own warm-up templates" on public.warmup_templates;
create policy "coach reads own warm-up templates" on public.warmup_templates
  for select to authenticated using (
    created_by = auth.uid() and exists (select 1 from public.teams t where t.id = team_id and t.coach_id = auth.uid())
  );
drop policy if exists "coach writes own warm-up templates" on public.warmup_templates;
create policy "coach writes own warm-up templates" on public.warmup_templates
  for insert to authenticated with check (
    created_by = auth.uid() and exists (select 1 from public.teams t where t.id = team_id and t.coach_id = auth.uid())
  );
drop policy if exists "coach updates own warm-up templates" on public.warmup_templates;
create policy "coach updates own warm-up templates" on public.warmup_templates
  for update to authenticated using (
    created_by = auth.uid() and exists (select 1 from public.teams t where t.id = team_id and t.coach_id = auth.uid())
  ) with check (
    created_by = auth.uid() and exists (select 1 from public.teams t where t.id = team_id and t.coach_id = auth.uid())
  );
drop policy if exists "coach deletes own warm-up templates" on public.warmup_templates;
create policy "coach deletes own warm-up templates" on public.warmup_templates
  for delete to authenticated using (
    created_by = auth.uid() and exists (select 1 from public.teams t where t.id = team_id and t.coach_id = auth.uid())
  );
revoke all on public.warmup_templates from anon;
grant select, insert, delete on public.warmup_templates to authenticated;
grant update (name, items) on public.warmup_templates to authenticated;

-- ---------- team warm-up default and limited space (F50) ----------
alter table public.teams add column if not exists default_warmup text not null default 'approach';
alter table public.teams drop constraint if exists teams_default_warmup_check;
alter table public.teams add constraint teams_default_warmup_check check (default_warmup in ('approach', 'template', 'none'));
alter table public.teams add column if not exists default_warmup_template_id uuid references public.warmup_templates(id) on delete set null;
alter table public.teams add column if not exists limited_space boolean not null default false;

-- The default template must be one of this team's templates.
create or replace function public.guard_default_warmup() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.default_warmup_template_id is not null and not exists (
    select 1 from warmup_templates w where w.id = new.default_warmup_template_id and w.team_id = new.id
  ) then
    raise exception 'That warm-up template belongs to another team.';
  end if;
  return new;
end $$;
drop trigger if exists teams_guard_default_warmup on public.teams;
create trigger teams_guard_default_warmup before insert or update of default_warmup_template_id on public.teams
  for each row execute function public.guard_default_warmup();

-- Settings columns: readable by the team (no personal data), updatable by the team's coach (existing "coach edits team" policy).
grant select (default_warmup, default_warmup_template_id, limited_space) on public.teams to authenticated;
grant update (default_warmup, default_warmup_template_id, limited_space) on public.teams to authenticated;

-- ---------- F47 board tile state "Warming up" (no new column: one more allowed value of live_progress.state) ----------
-- The tile shows only the state, never warm-up items. Ramp-up progress ("Ramp-up 2 of 3") uses the existing group_label.
alter table public.live_progress drop constraint if exists live_progress_state_check;
alter table public.live_progress add constraint live_progress_state_check check (state in ('idle', 'warming_up', 'lifting', 'resting', 'done'));

-- ==================== 2.4.0 Training v3 Part 2 (migration 012) ====================
-- New server field (compliance V4): live_progress.position_index (the athlete's current position in a rack rotation;
-- a small number, never a load or level). The group's shared clock uses the existing station_runs row (rotate_at).
-- Catalog v3 exercises and rack-rotation blocks live inside the existing team_programs.program JSON
-- (session.format = 'rack_rotation', session.rotation). The 5 new equipment ids are allowed in a trainer's gym profile.

-- ---------- §2.2 rack rotation: the athlete's current position (board ring, F55) ----------
alter table public.live_progress add column if not exists position_index smallint;
alter table public.live_progress drop constraint if exists live_progress_position_index_check;
alter table public.live_progress add constraint live_progress_position_index_check check (position_index is null or position_index between 0 and 11);

-- ---------- §2.1 catalog v3 equipment (all teams) in the trainer gym profile ----------
alter table public.teams drop constraint if exists teams_gym_equipment_known;
alter table public.teams add constraint teams_gym_equipment_known check (
  gym_equipment is null or gym_equipment <@ array[
    'barbell', 'trap-bar', 'dumbbells', 'kettlebells', 'bench', 'cable', 'pullup-bar', 'box', 'med-ball', 'bands',
    'leg-press', 'leg-curl-machine', 'leg-extension-machine', 'chest-press-machine', 'shoulder-press-machine',
    'assisted-pullup-machine', 'sled', 'bike', 'rower', 'treadmill', 'elliptical', 'stair-climber', 'jump-rope',
    'ssb', 'ghd', 'suspension', 'sliders', 'hurdles'
  ]::text[]
);

-- ---------- §2.2 stagger: the athlete's order in their rack group (derived, nothing new stored) ----------
-- Start position = the athlete's order in the rack group, ordered by user id (the same order the coach's board uses).
drop function if exists public.my_rack(uuid);
create function public.my_rack(t uuid)
returns table (group_id uuid, rack_name text, partners int, partner_names text[], others int, my_index int)
language sql stable security definer set search_path = public as $$
  select g.id, g.name,
    (select count(*)::int from rack_group_members o where o.group_id = g.id and o.user_id <> auth.uid()),
    case when public.rack_partner_names() then
      (select array_agg(public.board_name(p.name, p.board_name_mode) order by p.name)
       from rack_group_members o join profiles p on p.id = o.user_id
       where o.group_id = g.id and o.user_id <> auth.uid() and public.on_boards(t, o.user_id))
    end,
    case when public.rack_partner_names() then
      (select count(*)::int from rack_group_members o
       where o.group_id = g.id and o.user_id <> auth.uid() and not public.on_boards(t, o.user_id))
    end,
    (select count(*)::int from rack_group_members o where o.group_id = g.id and o.user_id::text < auth.uid()::text)
  from rack_group_members me join rack_groups g on g.id = me.group_id
  where me.team_id = t and me.user_id = auth.uid();
$$;
revoke execute on function public.my_rack(uuid) from public, anon;
grant execute on function public.my_rack(uuid) to authenticated;

-- ==================== 2.4.0 Training v3 Part 3 (migration 013): no schema change ====================
