-- Approach 2.1: age gate, parent consent on file, no pain notes, account deletion,
-- coach access only to current members.
-- Existing projects: run 002_approach_2.sql first (if you haven't), then paste this
-- whole file into Supabase → SQL Editor → New query → Run (once).
-- New projects: supabase/schema.sql already includes it.

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
