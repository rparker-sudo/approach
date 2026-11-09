-- Load & Launch: team sync database
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
