-- API/RLS checks for 2.3.0 Phase A (migration 009; spec A6, compliance T1–T4, T10). Run on a scratch Postgres after
-- supabase-stub.sql + schema.sql (or v1 + 002–009), as superuser. Each echo line says what to expect. Total expected errors: 17.
\set VERBOSITY terse
\pset footer off
insert into auth.users (id, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000f1', '{"name":"Trainer Tess","role":"coach","birth_year":"1988","is_minor":"false","coach_terms_version":"2026-11-14"}'),
 ('00000000-0000-0000-0000-0000000000c1', '{"name":"Alex Client","role":"athlete","birth_year":"1990","is_minor":"false"}'),
 ('00000000-0000-0000-0000-0000000000c2', '{"name":"Sam Client","role":"athlete","birth_year":"1985","is_minor":"false"}'),
 ('00000000-0000-0000-0000-0000000000a1', '{"name":"Jordan Minor","role":"athlete","birth_year":"2010","is_minor":"true"}'),
 ('00000000-0000-0000-0000-0000000000ca', '{"name":"Coach Alpha","role":"coach","birth_year":"1985","is_minor":"false","coach_terms_version":"2026-11-14"}');
insert into teams (id, name, join_code, coach_id) values
 ('aaaaaaaa-0000-0000-0000-000000000001','School','AAA111','00000000-0000-0000-0000-0000000000ca');
create function pg_temp.u(x text) returns void language sql as $$ select set_config('request.jwt.claim.sub', x, false) $$;
\set A 'aaaaaaaa-0000-0000-0000-000000000001'
\set TR '00000000-0000-0000-0000-0000000000f1'
\set C1 '00000000-0000-0000-0000-0000000000c1'
\set C2 '00000000-0000-0000-0000-0000000000c2'
\set M '00000000-0000-0000-0000-0000000000a1'
\set CA '00000000-0000-0000-0000-0000000000ca'
set role authenticated;

\echo == A1 existing teams stay volleyball (expect 0 errors)
select pg_temp.u(:'CA'); select name, kind from teams;
\echo == A1b a general team needs create_general_team with all three confirmations (expect 3 errors)
select pg_temp.u(:'TR');
insert into teams (name, join_code, coach_id, kind) values ('Sneaky', 'SNK111', :'TR', 'general');
select create_general_team('My clients', 'GEN111', '2026-11-15', '{"terms":"2026-11-16T10:00:00Z","adults_responsible":"2026-11-16T10:00:01Z"}');
select create_general_team('My clients', 'GEN111', '2025-01-01', '{"terms":"x","adults_responsible":"x","no_cobranding":"x"}');
\echo == A1c created with the three confirmations: recorded with the Terms version; effort board off (expect 0 errors)
select (create_general_team('My clients', 'GEN111', '2026-11-15', '{"terms":"2026-11-16T10:00:00Z","adults_responsible":"2026-11-16T10:00:01Z","no_cobranding":"2026-11-16T10:00:02Z"}') ->> 'kind') as kind;
reset role;
select name, kind, effort_board, trainer_terms_version, trainer_terms_accepted_by = :'TR' as by_trainer, trainer_confirmations ?& array['terms','adults_responsible','no_cobranding'] as three, trainer_verified_at is null as not_open from teams where join_code = 'GEN111';
select id as g from teams where join_code = 'GEN111' \gset
set role authenticated;

\echo == T3a team not open: a client cant join; the trainer cant post; the trainer cant open it herself (expect 3 errors)
select pg_temp.u(:'C1'); select join_team('GEN111');
select pg_temp.u(:'TR');
insert into team_programs (team_id, group_key, program) values (:'g', 'all', '{"name":"Plan"}');
update teams set trainer_verified_at = now(), trainer_verified_by = 'me' where id = :'g';
select kind, verified_at is null as not_open, terms_version from my_team_status(:'g');
\echo == T2 members cant read the Terms record or verification columns; the trainer cant change kind or the record directly (expect 2 errors)
select pg_temp.u(:'CA'); select trainer_confirmations from teams;
select pg_temp.u(:'TR'); update teams set kind = 'volleyball' where id = :'g';

\echo == T3b the service role opens the team: adults join (expect 0 errors)
reset role;
update teams set trainer_verified_at = now(), trainer_verified_by = 'Ryan (service role)' where id = :'g';
set role authenticated;
select pg_temp.u(:'C1'); select join_team('GEN111') ->> 'kind' as kind;
select pg_temp.u(:'C2'); select join_team('GEN111') ->> 'kind' as kind;
\echo == T1 a minor cant join a general team, by code or by a direct insert (expect 2 errors)
select pg_temp.u(:'M'); select join_team('GEN111');
reset role;
insert into team_members (team_id, user_id) values (:'g', :'M');
\echo == T4 kind is locked once the team has members, even for the service role (expect 1 error)
update teams set kind = 'volleyball' where id = :'g';
set role authenticated;
\echo == T5 new clients: participation on; check-ins, sharing, boards off (expect 0 errors)
reset role;
select user_id = :'C1' as alex, c_participation, c_checkins, c_share_checkins, c_boards, c_attendance, c_testing from team_members where team_id = :'g' order by 1;
set role authenticated;
\echo == T1b no parent consent in general teams (expect 1 error)
select pg_temp.u(:'TR'); select record_consent(:'g', :'C1', true, true, true, true, true, true);

\echo == A4 groups and targets: Alex in "Mon/Wed 6am class", Sam in "Alex"... free names (expect 0 errors)
select pg_temp.u(:'TR');
insert into team_groups (team_id, name) values (:'g', 'Mon/Wed 6am class'), (:'g', 'Tue/Thu noon');
reset role;
select id as g1 from team_groups where team_id = :'g' and name = 'Mon/Wed 6am class' \gset
select id as g2 from team_groups where team_id = :'g' and name = 'Tue/Thu noon' \gset
set role authenticated;
select pg_temp.u(:'TR');
update team_members set group_id = :'g1' where team_id = :'g' and user_id = :'C1';
update team_members set group_id = :'g2' where team_id = :'g' and user_id = :'C2';
insert into team_programs (team_id, group_key, program) values (:'g', 'all', '{"name":"Everyone: Warm-up plan"}');
insert into team_programs (team_id, group_key, program) values (:'g', :'g1', '{"name":"Class: Mon/Wed"}');
insert into team_programs (team_id, group_key, program, target_user_id) values (:'g', 'client:' || :'C1', '{"name":"Alex: Strength 8 weeks"}', :'C1');
\echo == T4b a client sees team-wide, their group and their own programs only; never another clients title (expect 0 errors)
select pg_temp.u(:'C1'); select program ->> 'name' as alex_sees from team_programs where team_id = :'g' order by 1;
select pg_temp.u(:'C2'); select program ->> 'name' as sam_sees from team_programs where team_id = :'g' order by 1;
select count(*) as sam_sees_alex_program from team_programs where target_user_id = :'C1';
\echo == T4c group names: a client sees only their own group (expect 0 errors)
select pg_temp.u(:'C2'); select name as sam_sees_group from team_groups where team_id = :'g';
\echo == T4d a program cant target someone who isnt on the team (expect 1 error)
select pg_temp.u(:'TR');
insert into team_programs (team_id, group_key, program, target_user_id) values (:'g', 'client:' || :'CA', '{"name":"x"}', :'CA');

\echo == A2 no testing in general teams (expect 2 errors)
select pg_temp.u(:'TR'); insert into test_sessions (team_id, day, battery) values (:'g', current_date, 'jump');
select pg_temp.u(:'C1'); insert into test_results (team_id, user_id, day, test_id, value, unit) values (:'g', :'C1', current_date, 'touch', 110, 'in');

\echo == T3c verification cleared (lapse): no new clients, no new posts; existing clients keep access (expect 2 errors)
reset role;
update teams set trainer_verified_at = null, trainer_verified_by = null where id = :'g';
insert into auth.users (id, raw_user_meta_data) values ('00000000-0000-0000-0000-0000000000c3', '{"name":"Pat New","role":"athlete","birth_year":"1992","is_minor":"false"}');
set role authenticated;
select pg_temp.u('00000000-0000-0000-0000-0000000000c3'); select join_team('GEN111');
select pg_temp.u(:'TR'); update team_programs set program = '{"name":"edit"}' where team_id = :'g' and group_key = 'all';
select pg_temp.u(:'C1'); select count(*) as alex_still_sees from team_programs where team_id = :'g';

\echo == V volleyball unchanged: members see every groups workout; testing still allowed for the coach (expect 0 errors)
select pg_temp.u(:'CA'); insert into team_programs (team_id, group_key, program) values (:'A', 'all', '{"name":"VB"}');
select kind from teams where id = :'A';
