-- API/RLS checks for 2.2.1 (migration 008: §6 J1/J3, §8 Coach Terms). Run on a scratch Postgres after
-- supabase-stub.sql + schema.sql (or v1 + 002–008), as superuser. Each echo line says what to expect.
-- Total expected errors: 7.
\set VERBOSITY terse
\pset footer off
insert into auth.users (id, raw_user_meta_data) values
 -- New coach who ticked the Coach Terms box at sign-up (2.2.1 §8).
 ('00000000-0000-0000-0000-0000000000ca', '{"name":"Coach Alpha","role":"coach","birth_year":"1985","is_minor":"false","coach_terms_version":"2026-11-19"}'),
 -- Existing coach without acceptance (a 2.2.0 account).
 ('00000000-0000-0000-0000-0000000000cb', '{"name":"Coach Bravo","role":"coach","birth_year":"1980","is_minor":"false"}'),
 -- An athlete can't get Coach Terms recorded by sending the field at sign-up.
 ('00000000-0000-0000-0000-0000000000a1', '{"name":"Jordan Miller","role":"athlete","birth_year":"2010","is_minor":"true","coach_terms_version":"2026-11-19"}'),
 ('00000000-0000-0000-0000-0000000000b1', '{"name":"Taylor Smith","role":"athlete","birth_year":"2000","is_minor":"false"}'),
 ('00000000-0000-0000-0000-0000000000b2', '{"name":"Uma Lee","role":"athlete","birth_year":"2001","is_minor":"false"}');
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
\set U '00000000-0000-0000-0000-0000000000b2'

\echo == CT1 sign-up: coach A stores version + time; coach B (2.2.0) has none; the athlete has none (expect 0 errors)
select name, role, coach_terms_version, coach_terms_accepted_at is not null as accepted_at_set from profiles order by name;

set role authenticated;
select pg_temp.u(:'J'); select join_team('AAA111') is not null; select join_team('BBB111') is not null;
select pg_temp.u(:'T'); select join_team('AAA111') is not null; select join_team('BBB111') is not null;
select set_my_choices(true, true, true, true, true);
select pg_temp.u(:'U'); select join_team('BBB111') is not null; select set_my_choices(true, true, true, true, true);

\echo == CT2 coach B without acceptance: record consent and confirm supervision are rejected (expect 2 errors)
select pg_temp.u(:'CB');
select version, accepted_at, current_version from my_coach_terms();
select record_consent(:'B', :'J', true, true, true, true, true, true);
insert into test_sessions (team_id, day, battery) values (:'B', current_date, 'full');
\echo == CT3 a wrong version is refused (expect 1 error); then coach B accepts and both work (expect 0 errors)
select accept_coach_terms('2025-01-01');
select accept_coach_terms('2026-11-19');
select version, accepted_at is not null as accepted from my_coach_terms();
select record_consent(:'B', :'J', true, true, true, true, true, true);
insert into test_sessions (team_id, day, battery) values (:'B', current_date, 'full');
select count(*) as supervision_rows from test_sessions where team_id = :'B';
\echo == CT4 nobody can write or clear coach_terms_* directly (expect 3 errors: athlete on coach B, coach B on itself, athlete accept)
select pg_temp.u(:'J');
update profiles set coach_terms_version = null, coach_terms_accepted_at = null where id = :'CB';
select pg_temp.u(:'CB');
update profiles set coach_terms_accepted_at = null where id = :'CB';
select pg_temp.u(:'T'); select accept_coach_terms('2026-11-19');
\echo == CT5 other users cannot read the columns (expect 1 error) and the trigger keeps an acceptance (checked as superuser)
select coach_terms_version from profiles where id = :'CB';
reset role;
do $$ begin
  update profiles set coach_terms_accepted_at = null where id = '00000000-0000-0000-0000-0000000000cb';
  raise notice 'CT5 FAIL: acceptance was cleared';
exception when others then raise notice 'CT5 ok: %', sqlerrm;
end $$;
select name, coach_terms_version, coach_terms_accepted_at is not null as still_accepted from profiles where role = 'coach' or name = 'Jordan Miller' order by name;
set role authenticated;

\echo == J1 levels: A confirms intermediate, B sets beginner. Coach A gets only the adjusted exercises (expect 0 errors)
select pg_temp.u(:'CA'); select set_member_level(:'A', :'J', 2::smallint);
select pg_temp.u(:'CB'); select set_member_level(:'B', :'J', 1::smallint);
select pg_temp.u(:'CA');
select row_to_json(x)::text as coach_a_response
  from member_levels(:'A', '{"main|squat":["goblet-squat","back-squat","back-squat"],"main|row":["db-row","db-row","db-row"]}') x where user_id = :'J';
select string_agg(attname, ',' order by attnum) as member_levels_columns from (
  select unnest(p.proargnames) as attname, generate_subscripts(p.proargnames, 1) as attnum
  from pg_proc p where p.proname = 'member_levels' and p.pronamespace = 'public'::regnamespace) c
 where attname not in ('t', 'ex');
\echo == J1b the response has no level value from team B: no numeric other-team field, no swap_level column (expect 0 errors)
select bool_and(k in ('user_id', 'team_level', 'confirmed', 'set_at', 'adjusted')) as only_allowed_keys
  from member_levels(:'A', '{}') x, json_object_keys(row_to_json(x)) k;

\echo == J3 effort board: T follows School (first team). A Club teammate gets no ranked field and no T (expect 0 errors)
select string_agg(attname, ',' order by attnum) as team_effort_columns from (
  select unnest(p.proargnames) as attname, generate_subscripts(p.proargnames, 1) as attnum
  from pg_proc p where p.proname = 'team_effort' and p.pronamespace = 'public'::regnamespace) c
 where attname not in ('t', 'since');
select pg_temp.u(:'U');
select count(*) filter (where user_id = :'T') as teammate_gets_taylor, count(*) filter (where is_me) as own_row,
       bool_and(not (row_to_json(e)::jsonb ? 'ranked')) as no_ranked_field
  from team_effort(:'B', current_date - 30) e;
\echo == J3b T still sees their own Club row; coach B gets T and marks them with members_following_other (expect 0 errors)
select pg_temp.u(:'T'); select count(*) as taylor_own_club_row from team_effort(:'B', current_date - 30) where user_id = :'T';
select pg_temp.u(:'CB');
select count(*) filter (where user_id = :'T') as coach_gets_taylor from team_effort(:'B', current_date - 30);
select (:'T'::uuid in (select members_following_other(:'B'))) as coach_marks_taylor;
\echo == J3c on School (the program team of T) teammates do get T
select pg_temp.u(:'J'); select count(*) as school_teammate_gets_taylor from team_effort(:'A', current_date - 30) where user_id = :'T';
