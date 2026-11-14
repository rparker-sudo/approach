-- Approach 2.2 pass 1: coach-set level, one lift program across teams, load-test eligibility
-- across teams (can_load_test), coach helper views, and C12 proof-record retention.
-- Existing projects: run 002–004 first, then paste this whole file into
-- Supabase → SQL Editor → New query → Run (once). New projects: supabase/schema.sql includes it.
-- Safe to run more than once. Runs as one transaction: if anything fails, nothing changes.

begin;

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

-- Coach athlete detail: this team's level (and whether it's confirmed) and the level exercises resolve to.
-- No team names, coach names or other-team details. The coach shows a lower value only as "Adjusted for this athlete".
create or replace function public.member_levels(t uuid)
returns table (user_id uuid, team_level smallint, confirmed boolean, set_at timestamptz, resolve_level smallint)
language sql stable security definer set search_path = public as $$
  select m.user_id, m.level, (m.level_set_by is not null), m.level_set_at, public.resolve_level_of(m.user_id)
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

commit;

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
