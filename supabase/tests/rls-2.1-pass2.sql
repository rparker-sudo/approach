-- API/RLS checks for 2.1 pass 2. Run on a scratch Postgres after supabase-stub.sql + schema.sql, as superuser.
-- Each \echo line says how many errors to expect.
\set VERBOSITY terse
\pset footer off
insert into auth.users (id, raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000c', '{"name":"Riley Coach","role":"coach","birth_year":"1985","is_minor":"false"}'),
 ('00000000-0000-0000-0000-0000000000a1', '{"name":"Jordan Miller","role":"athlete","birth_year":"2011","is_minor":"true"}'),
 ('00000000-0000-0000-0000-0000000000a2', '{"name":"Sam Lee","role":"athlete","birth_year":"2011","is_minor":"true"}'),
 ('00000000-0000-0000-0000-0000000000b1', '{"name":"Taylor Adult Smith","role":"athlete","birth_year":"2000","is_minor":"false"}');
insert into teams (id, name, join_code, coach_id) values ('11111111-1111-1111-1111-111111111111','T','ABC123','00000000-0000-0000-0000-00000000000c');
create function pg_temp.u(x text) returns void language sql as $$ select set_config('request.jwt.claim.sub', x, false) $$;
\set T '11111111-1111-1111-1111-111111111111'
\set C '00000000-0000-0000-0000-00000000000c'
\set J '00000000-0000-0000-0000-0000000000a1'
\set S '00000000-0000-0000-0000-0000000000a2'
\set A '00000000-0000-0000-0000-0000000000b1'
set role authenticated;
select pg_temp.u(:'J'); select join_team('ABC123') is not null as j_joined;
select pg_temp.u(:'S'); select join_team('ABC123') is not null as s_joined;
select pg_temp.u(:'A'); select join_team('ABC123') is not null as a_joined;
reset role; select p.name, c_participation p1, c_checkins p2, c_boards p4, consent_version v from team_members m join profiles p on p.id=m.user_id order by p.name; set role authenticated;

\echo == T1 minor with no consent: log + check-in rejected (expect 2 errors)
select pg_temp.u(:'J');
insert into workout_logs (id, team_id, session_name, logged_at) values ('j0', :'T', 'A', now());
insert into readiness (team_id, day, sleep, soreness, energy) values (:'T', current_date, 3,3,3);
\echo == T2 athlete cannot change flags (expect 3 errors)
update team_members set c_boards = true where user_id = auth.uid();
select record_consent(:'T', auth.uid(), true, true, true, true, true, true);
select set_my_choices(true, true, true, true, true);

\echo == T3 coach: box 3 without box 2 is dropped; participation only
select pg_temp.u(:'C');
select record_consent(:'T', :'J', true, false, true, false, false, false);
reset role; select c_participation, c_checkins, c_share_checkins, consent_version, consent_recorded_by is not null as by from team_members where user_id = :'J'; set role authenticated;
\echo == T4 participation only: log ok; readiness, attendance, test, live_progress rejected (expect 4 errors)
select pg_temp.u(:'J');
insert into workout_logs (id, team_id, session_name, logged_at, pr_count, duration_min) values ('j1', :'T', 'Lower A', now(), 1, 55);
insert into readiness (team_id, day, sleep, soreness, energy) values (:'T', current_date, 3,3,3);
insert into attendance (team_id, user_id, day, kind, minutes, marked_by) values (:'T', :'J', current_date, 'practice', 120, :'J');
insert into test_results (team_id, user_id, day, test_id, value, unit) values (:'T', :'J', current_date, 'touch', 110, 'in');
insert into live_progress (team_id, day, sets_done, sets_total, status) values (:'T', current_date, 3, 16, 'in_progress');
\echo == T5 coach cannot set consent for an adult (expect 1 error)
select pg_temp.u(:'C');
select record_consent(:'T', :'A', true, true, true, true, true, true);
\echo == T6 adult chooses for themselves
select pg_temp.u(:'A'); select set_my_choices(true, true, true, true, true);
insert into readiness (team_id, day, sleep, soreness, energy) values (:'T', current_date, 4,4,4);
insert into live_progress (team_id, day, sets_done, sets_total, status) values (:'T', current_date, 16, 16, 'done');
insert into attendance (team_id, user_id, day, kind, minutes, marked_by) values (:'T', :'A', current_date, 'practice', 120, :'A');
insert into workout_logs (id, team_id, session_name, logged_at, duration_min) values ('a1', :'T', 'Lower A', now(), 60);
reset role; select c_participation, c_checkins, c_share_checkins, c_boards, c_attendance, c_testing, consent_version from team_members where user_id = :'A'; set role authenticated;

\echo == T7 coach records all six for Jordan; Sam gets boards only (but hidden)
select pg_temp.u(:'C');
select record_consent(:'T', :'J', true, true, true, true, true, true);
select record_consent(:'T', :'S', true, false, false, true, false, false);
select pg_temp.u(:'S'); update profiles set board_name_mode = 'hidden' where id = auth.uid();
insert into live_progress (team_id, day, sets_done, sets_total, status) values (:'T', current_date, 2, 10, 'in_progress');

\echo == T8 Jordan full: check-in, attendance, jump test ok; load test rejected before supervision (expect 1 error)
select pg_temp.u(:'J');
insert into readiness (team_id, day, sleep, soreness, energy) values (:'T', current_date, 3,3,3);
insert into attendance (team_id, user_id, day, kind, minutes, marked_by) values (:'T', :'J', current_date, 'practice', 120, :'J');
insert into test_results (team_id, user_id, day, test_id, value, unit) values (:'T', :'J', current_date - 20, 'touch', 110, 'in');
insert into test_results (team_id, user_id, day, test_id, value, unit) values (:'T', :'J', current_date, 'touch', 112, 'in');
insert into test_results (team_id, user_id, day, test_id, value, unit) values (:'T', :'J', current_date - 20, 'broad', 90, 'in');
insert into test_results (team_id, user_id, day, test_id, value, unit) values (:'T', :'J', current_date, 'broad', 93, 'in');
insert into test_results (team_id, user_id, day, test_id, value, unit, reps) values (:'T', :'J', current_date, 'trap-bar-deadlift', 200, 'lb', 5);
insert into live_progress (team_id, day, sets_done, sets_total, status) values (:'T', current_date, 9, 16, 'in_progress');
\echo == T9 athlete cannot confirm supervision (expect 1 error); coach confirms; load test ok
insert into test_sessions (team_id, day, battery) values (:'T', current_date, 'full');
select pg_temp.u(:'C'); insert into test_sessions (team_id, day, battery) values (:'T', current_date, 'full');
select pg_temp.u(:'J');
insert into test_results (team_id, user_id, day, test_id, value, unit, reps) values (:'T', :'J', current_date, 'trap-bar-deadlift', 200, 'lb', 5);
select test_id, value, reps, e1rm from test_results where test_id = 'trap-bar-deadlift';
\echo == T10 athlete cannot void own result (expect 0 rows updated); coach can
update test_results set voided = true where test_id = 'touch';
select count(*) filter (where voided) as voided_by_athlete from test_results;
\echo == T11 coach marks Jordan absent (minutes 0) yesterday; Jordan cannot overwrite coach row
select pg_temp.u(:'C'); insert into attendance (team_id, user_id, day, kind, minutes, marked_by) values (:'T', :'J', current_date - 1, 'practice', 0, :'C');
select pg_temp.u(:'J'); update attendance set minutes = 120, marked_by = :'J' where day = current_date - 1;
delete from attendance where day = current_date - 1;
reset role; select day = current_date - 1 as yesterday, minutes, marked_by = :'C' as by_coach from attendance where user_id = :'J' order by day; set role authenticated;

\echo == T12 board members (as Sam, teammate): Jordan + Taylor, not hidden Sam
select pg_temp.u(:'S'); select board_name from board_members(:'T') order by 1;
\echo == T13 teammate cannot read others live progress, tests, attendance, check-ins, logs
select (select count(*) from live_progress where user_id <> auth.uid()) lp, (select count(*) from test_results) tr, (select count(*) from attendance) att, (select count(*) from readiness) rd, (select count(*) from workout_logs) wl;
\echo == T14 effort board as Sam: names, no weights; improvement % for Jordan only
select board_name, is_me, json_array_length(logs) logs, attendance is not null as has_att, improvement from team_effort(:'T', current_date - 30) order by board_name;
\echo == T15 coach board: coach sees live progress of Jordan + Taylor, not hidden Sam
select pg_temp.u(:'C'); select b.board_name, l.status, l.sets_done, l.sets_total from live_progress l join board_members(:'T') b using (user_id) order by 1;
select count(*) as coach_sees_hidden_sam from live_progress where user_id = :'S';
\echo == T16 effort board off: teammate sees nothing, coach still sees
reset role; update teams set effort_board = false; set role authenticated;
select pg_temp.u(:'S'); select count(*) as athlete_rows from team_effort(:'T', current_date - 30);
select pg_temp.u(:'C'); select count(*) as coach_rows from team_effort(:'T', current_date - 30);
\echo == T17 coach revokes sharing → coach no longer sees Jordan check-ins
select record_consent(:'T', :'J', true, true, false, true, true, true);
select count(*) as coach_sees_jordan_checkins from readiness where user_id = :'J';
\echo == T18 stale live progress purged on write
reset role; update live_progress set updated_at = now() - interval '25 hours' where user_id = :'A'; set role authenticated;
select pg_temp.u(:'J'); update live_progress set sets_done = 10 where user_id = auth.uid();
reset role; select count(*) as taylor_rows_left from live_progress where user_id = :'A';
\echo == T19 Jordan deletes account → all their rows gone
set role authenticated; select pg_temp.u(:'J'); select delete_my_account(); reset role;
select (select count(*) from test_results where user_id=:'J') tr, (select count(*) from attendance where user_id=:'J') att, (select count(*) from live_progress where user_id=:'J') lp, (select count(*) from team_members where user_id=:'J') tm;
