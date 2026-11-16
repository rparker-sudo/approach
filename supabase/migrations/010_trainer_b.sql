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
