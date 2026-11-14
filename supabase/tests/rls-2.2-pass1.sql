-- API/RLS checks for v2.2 pass 1 (migration 005). Run on a scratch Postgres after supabase-stub.sql + schema.sql, as superuser.
-- Each echo line says how many errors to expect.
\set VERBOSITY terse
\pset footer off
insert into auth.users (id, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000ca', '{"name":"Coach Alpha","role":"coach","birth_year":"1985","is_minor":"false"}'),
 ('00000000-0000-0000-0000-0000000000cb', '{"name":"Coach Bravo","role":"coach","birth_year":"1980","is_minor":"false"}'),
 ('00000000-0000-0000-0000-0000000000a1', '{"name":"Jordan Miller","role":"athlete","birth_year":"2010","is_minor":"true"}'),
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
\set T '00000000-0000-0000-0000-0000000000b1'
set role authenticated;
select pg_temp.u(:'J'); select join_team('AAA111') is not null; select join_team('BBB111') is not null;
select my_lift_program() = :'A'::uuid as program_stays_first_team;
\echo == L1 self level fills once; athlete cannot change it (expect 1 error)
select set_my_self_level(:'A', 3::smallint); select set_my_self_level(:'B', 3::smallint);
select set_my_self_level(:'A', 1::smallint);
update team_members set level = 1 where user_id = auth.uid();
reset role; select team_id = :'A'::uuid as team_a, level, level_set_by is null as self from team_members where user_id = :'J' order by 1 desc; set role authenticated;
\echo == L2 coach A confirms intermediate; coach B sets beginner; coach A sees resolve 1 but no team/coach names
select pg_temp.u(:'CA'); select set_member_level(:'A', :'J', 2::smallint);
select pg_temp.u(:'CB'); select set_member_level(:'B', :'J', 1::smallint);
select pg_temp.u(:'CA'); select team_level, confirmed, resolve_level from member_levels(:'A') where user_id = :'J';
\echo == L3 coach A cannot see team B membership row, lift program column, or set B level (expect 2 errors)
select count(*) as coach_a_sees_team_b_rows from team_members where team_id = :'B';
select lift_program_team_id from profiles where id = :'J';
select set_member_level(:'B', :'J', 3::smallint);
\echo == L4 lift program: J follows A; coach B sees "following another team"
select pg_temp.u(:'CB'); select count(*) as following_other from members_following_other(:'B') x where x = :'J'::uuid;
select pg_temp.u(:'CA'); select count(*) as following_other_a from members_following_other(:'A');
\echo == T1 consent + testing perms for J on A; adult T on A; supervision today
select record_consent(:'A', :'J', true, true, true, true, true, true);
reset role; insert into test_sessions (team_id, day, coach_id, battery) values (:'A', current_date, :'CA', 'full'); set role authenticated;
select pg_temp.u(:'J');
\echo == T2 Q-7: coach B set beginner -> J cannot load test on A (expect 1 error); jump allowed
insert into test_results (team_id, user_id, day, test_id, value, unit, reps) values (:'A', :'J', current_date, 'trap-bar-deadlift', 150, 'lb', 5);
insert into test_results (team_id, user_id, day, test_id, value, unit) values (:'A', :'J', current_date, 'touch', 110, 'in');
\echo == T3 coach B raises to intermediate -> J can load test
select pg_temp.u(:'CB'); select set_member_level(:'B', :'J', 2::smallint);
select pg_temp.u(:'J'); insert into test_results (team_id, user_id, day, test_id, value, unit, reps) values (:'A', :'J', current_date, 'trap-bar-deadlift', 150, 'lb', 5);
\echo == T4 club tournament in 2 days on team B blocks A testing (union calendar)
reset role; insert into team_calendars (team_id, events, light_dates) values (:'B', jsonb_build_array(jsonb_build_object('date', (current_date + 2)::text, 'type', 'tournament')), '{}'::jsonb)
  on conflict (team_id) do update set events = excluded.events; set role authenticated;
select pg_temp.u(:'CA'); select eligible from testing_eligibility(:'A', current_date) where user_id = :'J';
reset role; update team_calendars set events = '[]'::jsonb where team_id = :'B'; set role authenticated;
select pg_temp.u(:'CA'); select eligible as eligible_after_clear from testing_eligibility(:'A', current_date) where user_id = :'J';
\echo == T5 minor with self-reported advanced and no coach confirmation: not eligible
reset role; update team_members set level = 3, level_set_by = null where team_id = :'A' and user_id = :'J'; set role authenticated;
select pg_temp.u(:'CA'); select eligible as self_reported_advanced from testing_eligibility(:'A', current_date) where user_id = :'J';
select set_member_level(:'A', :'J', 2::smallint); select eligible as confirmed_intermediate from testing_eligibility(:'A', current_date) where user_id = :'J';
\echo == T6 break on A today blocks
reset role; insert into team_calendars (team_id, events, light_dates) values (:'A', jsonb_build_array(jsonb_build_object('date', (current_date - 1)::text, 'type', 'break', 'endDate', (current_date + 3)::text)), '{}'::jsonb)
  on conflict (team_id) do update set events = excluded.events; set role authenticated;
select pg_temp.u(:'CA'); select eligible as on_break from testing_eligibility(:'A', current_date) where user_id = :'J';
reset role; update team_calendars set events = '[]'::jsonb where team_id = :'A'; set role authenticated;
\echo == C11 testing-day touch without box 6 rejected (expect 1 error)
select pg_temp.u(:'CA'); select record_consent(:'A', :'J', true, true, true, true, true, false);
select pg_temp.u(:'J'); insert into test_results (team_id, user_id, day, test_id, value, unit) values (:'A', :'J', current_date, 'touch', 111, 'in');
select pg_temp.u(:'CA'); select record_consent(:'A', :'J', true, true, true, true, true, true);
\echo == C12a authenticated users cannot read the archives (expect 2 errors)
select count(*) from consent_archive;
select count(*) from supervision_archive;
reset role;
select count(*) as consent_rows, count(*) filter (where c_testing) as with_testing from consent_archive where athlete_user_id = :'J';
select jsonb_array_length(athletes) as load_testers, coach_name from supervision_archive;
\echo == C12b delete the athlete: archive rows remain with purge_after; no result values anywhere
set role authenticated; select pg_temp.u(:'J'); select delete_my_account(); reset role;
select count(*) as consent_rows_left, bool_and(purge_after is not null) as purge_set from consent_archive where athlete_user_id = :'J';
select bool_and(purge_after is not null) as supervision_marked from supervision_archive where athletes @> jsonb_build_array(jsonb_build_object('user_id', :'J'));
select count(*) as results_left from test_results where user_id = :'J';
select column_name from information_schema.columns where table_name in ('consent_archive','supervision_archive') and column_name ~ 'value|weight|reps|e1rm|result';
\echo == C12c delete coach A: supervision rows remain
set role authenticated; select pg_temp.u(:'CA'); select delete_my_account(); reset role;
select count(*) as supervision_rows_left from supervision_archive where coach_user_id = :'CA';
\echo == C12d purge removes a row with a past purge_after
update consent_archive set purge_after = now() - interval '1 day' where athlete_user_id = :'J';
select purge_archives() as purged;
select count(*) as consent_rows_after_purge from consent_archive where athlete_user_id = :'J';
\echo == G-2 leaving the program team falls back to the remaining team
select pg_temp.u(:'T');
set role authenticated; select pg_temp.u(:'T'); select join_team('BBB111') is not null; select my_lift_program() = :'B'::uuid as adult_on_b;
