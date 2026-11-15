-- Approach Strength 2.2.1 (docs/specs/v2.2.1.md §6, §8). Safe to re-run.
-- Run after 007 in the Supabase SQL editor. Also folded into supabase/schema.sql.
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
