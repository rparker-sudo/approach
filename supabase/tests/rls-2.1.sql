-- API/RLS checks for 2.1 (run after supabase-stub.sql + schema.sql on a scratch Postgres, as superuser).
-- Expected errors: under-13 signup, pending insert x2, consent self-update x2, profile edits x2,
-- consent for an adult, training_only check-in, under-13 birth year, anon RPC call.
\set ON_ERROR_STOP 0
\set VERBOSITY terse
-- users: coach (adult), minor athlete, adult athlete, kid under 13, minor wanting coach
insert into auth.users (id, raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000c', '{"name":"Coach","role":"coach","birth_year":"1985","is_minor":"false"}'),
 ('00000000-0000-0000-0000-00000000000a', '{"name":"Minor","role":"athlete","birth_year":"2011","is_minor":"true"}'),
 ('00000000-0000-0000-0000-00000000000b', '{"name":"Adult","role":"athlete","birth_year":"2000","is_minor":"false"}'),
 ('00000000-0000-0000-0000-00000000000e', '{"name":"Kid coach","role":"coach","birth_year":"2010","is_minor":"false"}'),
 ('00000000-0000-0000-0000-00000000000f', '{"name":"Legacy","role":"athlete"}');
\echo -- under 13 signup must fail:
insert into auth.users (raw_user_meta_data) values ('{"birth_year":"2016"}');
select name, role, birth_year, is_minor from profiles order by name;
insert into teams (id, name, join_code, coach_id) values ('11111111-1111-1111-1111-111111111111', 'T', 'ABC123', '00000000-0000-0000-0000-00000000000c');

create function pg_temp.as_user(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false) $$;
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a'); select join_team('abc-123') is not null as minor_joined;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b'); select join_team('ABC123') is not null as adult_joined;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000f'); select join_team('ABC123') is not null as legacy_joined;
reset role; select user_id, consent_status from team_members order by user_id; set role authenticated;

\echo -- pending minor: log + check-in both rejected
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into workout_logs (id, team_id, session_name, logged_at) values ('m1', '11111111-1111-1111-1111-111111111111', 'A', now());
insert into readiness (team_id, day, sleep, soreness, energy) values ('11111111-1111-1111-1111-111111111111', current_date, 3,3,3);
\echo -- athlete tries to change own consent (direct update, then RPC)
update team_members set consent_status = 'full' where user_id = auth.uid();
select record_consent('11111111-1111-1111-1111-111111111111', auth.uid(), 'full');
\echo -- athlete tries to change role / birth year
update profiles set role = 'coach' where id = auth.uid();
update profiles set birth_year = 1990 where id = auth.uid();
select set_my_birth_year(1990::smallint, false) as minor_after_retry;

\echo -- coach records training_only
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select record_consent('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-00000000000a', 'training_only');
select record_consent('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-00000000000b', 'full');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into workout_logs (id, team_id, session_name, logged_at) values ('m2', '11111111-1111-1111-1111-111111111111', 'A', now());
\echo -- training_only check-in rejected:
insert into readiness (team_id, day, sleep, soreness, energy) values ('11111111-1111-1111-1111-111111111111', current_date, 3,3,3);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select record_consent('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-00000000000a', 'full');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into readiness (team_id, day, sleep, soreness, energy, pain) values ('11111111-1111-1111-1111-111111111111', current_date, 3,3,3,true);
\echo -- adult logs & checks in fine
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into workout_logs (id, team_id, session_name, logged_at) values ('b1', '11111111-1111-1111-1111-111111111111', 'A', now());
insert into readiness (team_id, day, sleep, soreness, energy) values ('11111111-1111-1111-1111-111111111111', current_date, 4,4,4);
\echo -- legacy (no birth year) is pending; answers adult
select pg_temp.as_user('00000000-0000-0000-0000-00000000000f');
select member_consent('11111111-1111-1111-1111-111111111111');
select set_my_birth_year(1999::smallint, false);
select member_consent('11111111-1111-1111-1111-111111111111');
select set_my_birth_year(2015::smallint, true);

select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select count(*) as coach_sees_logs from workout_logs; select count(*) as coach_sees_checkins from readiness;
select user_id, consent_status, consent_recorded_by is not null as by from team_members order by user_id;
delete from team_members where user_id = '00000000-0000-0000-0000-00000000000b';
\echo -- after removing adult, coach sees only minor rows
select user_id, count(*) from workout_logs group by 1; select user_id from readiness;
select count(*) as coach_sees_removed_profile from profiles where id = '00000000-0000-0000-0000-00000000000b';

\echo -- anon cannot call RPCs
reset role; set role anon; select delete_my_account(); reset role; set role authenticated;

\echo -- minor deletes account
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a'); select delete_my_account();
reset role;
select (select count(*) from auth.users where id='00000000-0000-0000-0000-00000000000a') u, (select count(*) from profiles where id='00000000-0000-0000-0000-00000000000a') p,
 (select count(*) from workout_logs where user_id='00000000-0000-0000-0000-00000000000a') l, (select count(*) from readiness where user_id='00000000-0000-0000-0000-00000000000a') r,
 (select count(*) from team_members where user_id='00000000-0000-0000-0000-00000000000a') m;
\echo -- coach deletes account: team cascades
set role authenticated; select pg_temp.as_user('00000000-0000-0000-0000-00000000000c'); select delete_my_account(); reset role;
select (select count(*) from teams) teams, (select count(*) from team_members) members, (select count(*) from workout_logs) logs, (select count(*) from readiness) checkins;
select column_name from information_schema.columns where table_name='readiness' and column_name='pain_note';
