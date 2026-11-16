-- API/RLS checks for 2.3.0 Phase B (migration 010; compliance T4, T5, T10). Run on a scratch Postgres after
-- supabase-stub.sql + schema.sql (or v1 + 002–010), as superuser. Each echo line says what to expect. Total expected errors: 3.
\set VERBOSITY terse
\pset footer off
insert into auth.users (id, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000f1', '{"name":"Trainer Tess","role":"coach","birth_year":"1988","is_minor":"false","coach_terms_version":"2026-11-14"}'),
 ('00000000-0000-0000-0000-0000000000c1', '{"name":"Alex Client","role":"athlete","birth_year":"1990","is_minor":"false"}'),
 ('00000000-0000-0000-0000-0000000000c2', '{"name":"Sam Client","role":"athlete","birth_year":"1985","is_minor":"false"}'),
 ('00000000-0000-0000-0000-0000000000ca', '{"name":"Coach Alpha","role":"coach","birth_year":"1985","is_minor":"false","coach_terms_version":"2026-11-14"}');
insert into teams (id, name, join_code, coach_id) values
 ('aaaaaaaa-0000-0000-0000-000000000001','School','AAA111','00000000-0000-0000-0000-0000000000ca');
create function pg_temp.u(x text) returns void language sql as $$ select set_config('request.jwt.claim.sub', x, false) $$;
\set A 'aaaaaaaa-0000-0000-0000-000000000001'
\set TR '00000000-0000-0000-0000-0000000000f1'
\set C1 '00000000-0000-0000-0000-0000000000c1'
\set C2 '00000000-0000-0000-0000-0000000000c2'
\set CA '00000000-0000-0000-0000-0000000000ca'
set role authenticated;
select pg_temp.u(:'TR');
select create_general_team('My clients', 'GEN111', '2026-11-15', '{"terms":"2026-11-16T10:00:00Z","adults_responsible":"2026-11-16T10:00:01Z","no_cobranding":"2026-11-16T10:00:02Z"}') is not null as created;
reset role;
select id as g from teams where join_code = 'GEN111' \gset
update teams set trainer_verified_at = now(), trainer_verified_by = 'Ryan (service role)' where id = :'g';
set role authenticated;
select pg_temp.u(:'C1'); select join_team('GEN111') ->> 'kind' as kind;
select pg_temp.u(:'C2'); select join_team('GEN111') ->> 'kind' as kind;

\echo == B4 gym equipment: the trainer saves a profile; members read it (expect 0 errors)
select pg_temp.u(:'TR'); update teams set gym_equipment = array['dumbbells','bench','cable','leg-press','bike'] where id = :'g';
select pg_temp.u(:'C1'); select gym_equipment from teams where id = :'g';
\echo == B4b unknown items, a volleyball team, or a client cant set it (expect 2 errors, then 0 rows changed for the client)
select pg_temp.u(:'TR'); update teams set gym_equipment = array['heart-rate-monitor'] where id = :'g';
select pg_temp.u(:'CA'); update teams set gym_equipment = array['dumbbells'] where id = :'A';
select pg_temp.u(:'C1'); update teams set gym_equipment = array['bands'] where id = :'g';
reset role; select gym_equipment = array['dumbbells','bench','cable','leg-press','bike'] as unchanged from teams where id = :'g'; set role authenticated;

\echo == T5 check-ins default off: a client cant send one until sharing is on (expect 1 error)
select pg_temp.u(:'C1');
insert into readiness (team_id, user_id, day, sleep, soreness, energy, pain) values (:'g', :'C1', current_date, 4, 2, 4, true);
\echo == T5b Alex turns check-ins and sharing on and checks in with pain; the trainer sees it (expect 0 errors)
select set_my_choices(true, true, false, false, false);
insert into readiness (team_id, user_id, day, sleep, soreness, energy, pain) values (:'g', :'C1', current_date, 4, 2, 4, true);
insert into readiness (team_id, user_id, day, sleep, soreness, energy, pain) values (:'g', :'C1', current_date - 1, 3, 3, 3, false);
select pg_temp.u(:'TR'); select count(*) as trainer_sees, bool_or(pain) as pain_flag from readiness where team_id = :'g';
\echo == T5c sharing off hides past check-ins from the trainer immediately (expect 0 errors; trainer sees 0)
select pg_temp.u(:'C1'); select set_my_choices(true, false, false, false, false);
select pg_temp.u(:'TR'); select count(*) as trainer_sees_after_sharing_off from readiness where team_id = :'g';
select pg_temp.u(:'C1'); select count(*) as alex_still_has_own from readiness where user_id = :'C1';
\echo == T5d delete my check-ins: Alex deletes all of his; Sam cant delete Alexs (expect 0 errors; 0 rows for Sam)
select pg_temp.u(:'C2'); delete from readiness where user_id = :'C1';
reset role; select count(*) as alex_rows_after_sam from readiness where user_id = :'C1'; set role authenticated;
select pg_temp.u(:'C1'); select delete_my_checkins() as deleted;
reset role; select count(*) as alex_rows_left from readiness where user_id = :'C1'; set role authenticated;

\echo == T10 schema: no condition-specific, weight-loss or body-composition columns; no ai_assisted (expect 0 errors; 0 rows)
reset role;
select table_name, column_name from information_schema.columns
 where table_schema = 'public'
   and column_name ~* '(injur|medical|medication|pregnan|condition|rehab|weight_loss|body_fat|bodyfat|body_comp|heart_rate|pace|distance|calorie|ai_assisted)';
set role authenticated;

\echo == V volleyball unchanged: the volleyball coach still edits settings (expect 0 errors)
select pg_temp.u(:'CA'); update teams set practice_min = 100 where id = :'A';
reset role; select practice_min, gym_equipment is null as no_gym from teams where id = :'A';

\echo == A6 the effort board is off by default in a general team, and the trainer can turn it on (expect 0 errors)
reset role; select effort_board as default_on from teams where id = :'g'; set role authenticated;
select pg_temp.u(:'TR'); update teams set effort_board = true where id = :'g';
reset role; select effort_board as now_on from teams where id = :'g';
