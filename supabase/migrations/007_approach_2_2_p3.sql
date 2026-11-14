-- Approach 2.2 pass 3: supersets/circuits and station rotation on the live board.
-- Existing projects: run 002–006 first, then paste this whole file into
-- Supabase → SQL Editor → New query → Run (once). New projects: supabase/schema.sql includes it.
-- Safe to run more than once. Runs as one transaction: if anything fails, nothing changes.
-- Home workouts need no server change: home equipment stays on the athlete's device (G-3), and home sessions are part of
-- the posted program (team_programs.program). Session.format / stations[] live in the program JSON too (Legal §5).

begin;

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

commit;
