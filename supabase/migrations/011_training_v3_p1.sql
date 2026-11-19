-- Approach Strength 2.4.0, Training v3 Part 1 (spec docs/specs/training-v3.md v1.0 §1.3, §1.5; compliance § Training v3
-- review V4). Safe to run more than once. Run after 010_trainer_b.sql.
--
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
