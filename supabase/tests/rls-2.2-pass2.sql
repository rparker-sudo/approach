-- API/RLS checks for v2.2 pass 2 (migration 006). Run on a scratch Postgres after supabase-stub.sql + schema.sql
-- (or 002–006 on a 1.x base), as superuser. Each echo line says what to expect.
\set VERBOSITY terse
\pset footer off
insert into auth.users (id, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000ca', '{"name":"Coach Alpha","role":"coach","birth_year":"1985","is_minor":"false"}'),
 ('00000000-0000-0000-0000-0000000000cb', '{"name":"Coach Bravo","role":"coach","birth_year":"1980","is_minor":"false"}'),
 ('00000000-0000-0000-0000-0000000000a1', '{"name":"Jordan Miller","role":"athlete","birth_year":"2010","is_minor":"true"}'),
 ('00000000-0000-0000-0000-0000000000a2', '{"name":"Ava Reed","role":"athlete","birth_year":"2010","is_minor":"true"}'),
 ('00000000-0000-0000-0000-0000000000b1', '{"name":"Taylor Smith","role":"athlete","birth_year":"2000","is_minor":"false"}');
insert into teams (id, name, join_code, coach_id) values
 ('aaaaaaaa-0000-0000-0000-000000000001','School','AAA111','00000000-0000-0000-0000-0000000000ca'),
 ('bbbbbbbb-0000-0000-0000-000000000001','Club','BBB111','00000000-0000-0000-0000-0000000000cb');
create function pg_temp.u(x text) returns void language sql as $$ select set_config('request.jwt.claim.sub', x, false) $$;
\set A 'aaaaaaaa-0000-0000-0000-000000000001'
\set B 'bbbbbbbb-0000-0000-0000-000000000001'
\set CA '00000000-0000-0000-0000-0000000000ca'
\set CB '00000000-0000-0000-0000-0000000000cb'
\set J '00000000-0000-0000-0000-0000000000a1'
\set V '00000000-0000-0000-0000-0000000000a2'
\set T '00000000-0000-0000-0000-0000000000b1'
set role authenticated;
select pg_temp.u(:'J'); select join_team('AAA111') is not null;
select pg_temp.u(:'V'); select join_team('AAA111') is not null;
select pg_temp.u(:'T'); select join_team('AAA111') is not null; select join_team('BBB111') is not null;
select pg_temp.u(:'CA'); select record_consent(:'A', :'J', true, true, true, true, true, true); select record_consent(:'A', :'V', true, true, true, false, true, true);
select pg_temp.u(:'CB');
\echo == S1 schema: live_progress, board functions and rack tables carry no level, loads, RPE, results, check-ins
reset role;
select table_name, column_name from information_schema.columns
 where table_schema = 'public' and table_name in ('live_progress', 'rack_groups', 'rack_group_members')
   and column_name ~ '(level|weight|load|rpe|e1rm|value|pain|sleep|soreness|energy|body)';
select p.proname, pg_get_function_result(p.oid) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname in ('board_members', 'board_tests', 'team_effort', 'my_rack')
   and pg_get_function_result(p.oid) ~ '(level|weight|load|rpe|e1rm|pain|sleep|value)';
set role authenticated;
\echo == L1 live progress: new fields (exercise, set, last reps, rest end) saved for J (box 4); never loads
select pg_temp.u(:'J');
insert into live_progress (team_id, day, session_id, sets_done, sets_total, status, state, exercise_name, set_index, set_count, last_reps, rest_ends_at)
 values (:'A', current_date, 's1', 3, 16, 'in_progress', 'resting', 'Goblet Squat', 2, 4, 8, now() + interval '90 seconds');
select pg_temp.u(:'CA'); select state, exercise_name, set_index, set_count, last_reps, rest_ends_at > now() as resting from live_progress where user_id = :'J';
\echo == L2 V has no boards permission: cannot write live progress (expect 1 error)
select pg_temp.u(:'V'); insert into live_progress (team_id, day, sets_done, sets_total, status, state) values (:'A', current_date, 1, 10, 'in_progress', 'lifting');
\echo == D1 D-027: T follows School (first team); Club board and ranks leave T out; School keeps T
select pg_temp.u(:'T'); select set_my_choices(true, true, true, true, true);
select pg_temp.u(:'CB'); select count(*) as club_board_has_taylor from board_members(:'B') where user_id = :'T';
select ranked as club_ranks_taylor from team_effort(:'B', current_date - 30) where user_id = :'T';
select pg_temp.u(:'CA'); select count(*) as school_board_has_taylor from board_members(:'A') where user_id = :'T';
\echo == E1 extra recovery log kind; effort logs carry kind and no weights
select pg_temp.u(:'J');
insert into workout_logs (id, team_id, session_name, logged_at, sets_done, kind, duration_min) values ('er-1', :'A', 'Full-Body Reset', now(), 10, 'extra_recovery', 12);
insert into workout_logs (id, team_id, session_name, logged_at, sets_done, kind) values ('bad-1', :'A', 'X', now(), 1, 'conditioning');
select pg_temp.u(:'CA'); select logs::text ~ 'extra_recovery' as has_kind, logs::text !~ 'weight' as no_weights from team_effort(:'A', current_date - 1) where user_id = :'J';
\echo == J1 jump gains in inches (never %); board chips: change only, no raw values
reset role;
insert into test_results (team_id, user_id, day, test_id, value, unit, entered_by) values
 (:'A', :'J', current_date - 20, 'touch', 110, 'in', :'J'), (:'A', :'J', current_date, 'touch', 111.5, 'in', :'J'),
 (:'A', :'J', current_date - 20, 'broad', 90, 'in', :'J'), (:'A', :'J', current_date, 'broad', 93, 'in', :'J');
set role authenticated;
select pg_temp.u(:'CA'); select jump_gain from team_effort(:'A', current_date - 30) where user_id = :'J';
select jumps_done, strength_done, changes::text from board_tests(:'A', current_date) where user_id = :'J';
select count(*) as v_on_test_board from board_tests(:'A', current_date) where user_id = :'V';
\echo == B1 only the coach reads board chips (expect 0 rows for an athlete)
select pg_temp.u(:'J'); select count(*) as athlete_sees_chips from board_tests(:'A', current_date);
\echo == R1 coach saves racks; an athlete cannot (expect 1 error); athlete reads own rack (count only)
select pg_temp.u(:'CA'); select save_racks(:'A', jsonb_build_array(jsonb_build_object('name', 'Squat rack', 'users', jsonb_build_array(:'J', :'V', :'T')), jsonb_build_object('name', 'Platform 2', 'users', '[]'::jsonb)));
select pg_temp.u(:'J'); select save_racks(:'A', '[]'::jsonb);
select rack_name, partners, partner_names, others from my_rack(:'A');
\echo == R2 athlete cannot insert rack membership directly (expect 1 error); one rack per athlete per team (expect 1 error)
insert into rack_group_members (group_id, user_id, team_id) select id, :'J', :'A' from rack_groups where team_id = :'A' and name = 'Platform 2';
reset role; insert into rack_group_members (group_id, user_id, team_id) select id, :'J', :'A' from rack_groups where team_id = :'A' and name = 'Platform 2'; set role authenticated;
\echo == R3 coach B cannot see or change team A racks (expect 0 rows, 1 error)
select pg_temp.u(:'CB'); select count(*) as coach_b_sees_a_racks from rack_groups where team_id = :'A';
select save_racks(:'A', '[]'::jsonb);
\echo == R4 leaving the team removes the athlete from the rack; the rack keeps its name
select pg_temp.u(:'V'); delete from team_members where team_id = :'A' and user_id = auth.uid();
reset role; select g.name, count(m.user_id) as members from rack_groups g left join rack_group_members m on m.group_id = g.id where g.team_id = :'A' group by g.name order by g.name; set role authenticated;
\echo == C1 accent color: coach sets a hex; invalid rejected (expect 1 error)
select pg_temp.u(:'CA'); update teams set accent_color = '#000080' where id = :'A';
update teams set accent_color = 'navy' where id = :'A';
select accent_color from teams where id = :'A';
