-- Approach 2.2 pass 2: live board fields, team accent color, extra recovery logs, effort board v2 (Overall, Jump gains,
-- two teams), testing-day board chips, and rack groups.
-- Existing projects: run 002–005 first, then paste this whole file into
-- Supabase → SQL Editor → New query → Run (once). New projects: supabase/schema.sql includes it.
-- Safe to run more than once. Runs as one transaction: if anything fails, nothing changes.

begin;

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

commit;
