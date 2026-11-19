-- Approach Strength 2.4.0, Training v3 Part 2 (spec docs/specs/training-v3.md v1.0 §2.1, §2.2; compliance V4).
-- Safe to run more than once. Run after 011_training_v3_p1.sql.
--
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
