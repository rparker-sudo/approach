-- API/RLS checks for v2.2 pass 3 (migration 007). Run on a scratch Postgres after supabase-stub.sql + schema.sql
-- (or 002–007 on a 1.x base), as superuser.
\set VERBOSITY terse
\pset footer off
insert into auth.users (id, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000ca', '{"name":"Coach Alpha","role":"coach","birth_year":"1985","is_minor":"false","coach_terms_version":"2026-11-19"}'),
 ('00000000-0000-0000-0000-0000000000cb', '{"name":"Coach Bravo","role":"coach","birth_year":"1980","is_minor":"false","coach_terms_version":"2026-11-19"}'),
 ('00000000-0000-0000-0000-0000000000a1', '{"name":"Jordan Miller","role":"athlete","birth_year":"2010","is_minor":"true"}');
insert into teams (id, name, join_code, coach_id) values
 ('aaaaaaaa-0000-0000-0000-000000000001','School','AAA111','00000000-0000-0000-0000-0000000000ca'),
 ('bbbbbbbb-0000-0000-0000-000000000001','Club','BBB111','00000000-0000-0000-0000-0000000000cb');
create function pg_temp.u(x text) returns void language sql as $$ select set_config('request.jwt.claim.sub', x, false) $$;
\set A 'aaaaaaaa-0000-0000-0000-000000000001'
\set CA '00000000-0000-0000-0000-0000000000ca'
\set CB '00000000-0000-0000-0000-0000000000cb'
\set J '00000000-0000-0000-0000-0000000000a1'
set role authenticated;
select pg_temp.u(:'J'); select join_team('AAA111') is not null;
select pg_temp.u(:'CA'); select record_consent(:'A', :'J', true, true, true, true, true, true);
\echo == S1 schema: new live_progress columns carry no loads, RPE or level
reset role;
select column_name from information_schema.columns where table_schema = 'public' and table_name in ('live_progress', 'station_runs')
  and column_name ~ '(level|weight|load|rpe|e1rm|pain|value)';
set role authenticated;
\echo == T1 coach starts stations; athlete reads the shared timer
select pg_temp.u(:'CA');
insert into station_runs (team_id, day, session_id, round, rounds, station_sec, transition_sec, rotate_at) values (:'A', current_date, 's1', 0, 4, 480, 60, now() + interval '8 minutes');
select pg_temp.u(:'J'); select rounds, station_sec, rotate_at > now() as running from station_runs where team_id = :'A';
\echo == T2 athlete cannot change the timer (expect 0 rows updated, 1 error on insert)
update station_runs set round = 3 where team_id = :'A';
reset role; select round as round_unchanged from station_runs where team_id = :'A'; set role authenticated;
select pg_temp.u(:'J'); insert into station_runs (team_id, day, session_id, rounds, station_sec, rotate_at) values (:'A', current_date + 1, 's1', 4, 480, now());
\echo == T3 another team coach cannot see or change it (expect 0 rows)
select pg_temp.u(:'CB'); select count(*) as coach_b_sees from station_runs where team_id = :'A';
\echo == L1 live progress: superset label and station saved; never loads
select pg_temp.u(:'J');
insert into live_progress (team_id, day, sets_done, sets_total, status, state, group_label, station_id, rotate_at)
 values (:'A', current_date, 4, 12, 'in_progress', 'resting', 'A1 DB Bench · A2 One-Arm Row · Round 2 of 3', 'st-2', now() + interval '3 minutes');
select pg_temp.u(:'CA'); select group_label, station_id from live_progress where user_id = :'J';
