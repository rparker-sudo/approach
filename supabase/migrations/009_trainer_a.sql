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
