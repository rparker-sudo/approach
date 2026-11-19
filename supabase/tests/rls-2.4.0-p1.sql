-- API/RLS checks for 2.4.0 Training v3 Part 1 (migration 011; spec §1.3, §1.5; compliance V4). Run on a scratch Postgres
-- after supabase-stub.sql + schema.sql (or v1 + 002–011), as superuser. Each echo line says what to expect.
-- Total expected errors: 6 (2 coach-private inserts, 2 team-default checks, 1 unknown board state; Part 2: 1 position out of range).
\set VERBOSITY terse
\pset footer off
insert into auth.users (id, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000a1', '{"name":"Coach Alpha","role":"coach","birth_year":"1985","is_minor":"false","coach_terms_version":"2026-11-19"}'),
 ('00000000-0000-0000-0000-0000000000b1', '{"name":"Coach Bravo","role":"coach","birth_year":"1984","is_minor":"false","coach_terms_version":"2026-11-19"}'),
 ('00000000-0000-0000-0000-0000000000d1', '{"name":"Ava Athlete","role":"athlete","birth_year":"2010","is_minor":"true"}');
insert into teams (id, name, join_code, coach_id) values
 ('aaaaaaaa-0000-0000-0000-000000000001','Alpha','AAA111','00000000-0000-0000-0000-0000000000a1'),
 ('bbbbbbbb-0000-0000-0000-000000000001','Bravo','BBB111','00000000-0000-0000-0000-0000000000b1');
create function pg_temp.u(x text) returns void language sql as $$ select set_config('request.jwt.claim.sub', x, false) $$;
\set A 'aaaaaaaa-0000-0000-0000-000000000001'
\set B 'bbbbbbbb-0000-0000-0000-000000000001'
\set CA '00000000-0000-0000-0000-0000000000a1'
\set CB '00000000-0000-0000-0000-0000000000b1'
\set AV '00000000-0000-0000-0000-0000000000d1'
insert into team_members (team_id, user_id) values (:'A', :'AV');
set role authenticated;

\echo == F49 Alpha saves a warm-up template; Alpha reads it (expect 0 errors; 1 row)
select pg_temp.u(:'CA');
insert into warmup_templates (team_id, name, items) values (:'A', 'Our lower warm-up', '{"raise":[{"exerciseId":"a-skip","sets":1,"reps":"2 × 10 yd","effort":"Easy"}],"activate":[],"potentiate":[]}');
select count(*) as alpha_templates from warmup_templates where team_id = :'A';
reset role; select id as t from warmup_templates where team_id = :'A' \gset
set role authenticated;

\echo == coach-private: Bravo and the Alpha athlete see 0 rows; Bravo cannot write into the Alpha team or as Alpha (expect 2 errors)
select pg_temp.u(:'CB'); select count(*) as bravo_sees from warmup_templates;
insert into warmup_templates (team_id, name, items) values (:'A', 'Sneaky', '{}');
insert into warmup_templates (team_id, created_by, name, items) values (:'B', :'CA', 'Spoofed author', '{}');
select pg_temp.u(:'AV'); select count(*) as athlete_sees from warmup_templates;

\echo == Bravo cannot rename or delete the Alpha template (expect 0 errors; 0 rows changed)
select pg_temp.u(:'CB'); update warmup_templates set name = 'Mine now' where id = :'t'; delete from warmup_templates where id = :'t';
reset role; select name = 'Our lower warm-up' as untouched from warmup_templates where id = :'t'; set role authenticated;

\echo == F50 team default: Alpha sets template + limited space; members read the settings (expect 0 errors)
select pg_temp.u(:'CA'); update teams set default_warmup = 'template', default_warmup_template_id = :'t', limited_space = true where id = :'A';
select pg_temp.u(:'AV'); select default_warmup, limited_space from teams where id = :'A';

\echo == F50 checks: unknown default, another team template as default, an athlete changing it (expect 2 errors; then 0 rows changed)
select pg_temp.u(:'CA'); update teams set default_warmup = 'random' where id = :'A';
select pg_temp.u(:'CB'); update teams set default_warmup_template_id = :'t' where id = :'B';
select pg_temp.u(:'AV'); update teams set default_warmup = 'none' where id = :'A';
reset role; select default_warmup = 'template' as athlete_change_ignored from teams where id = :'A'; set role authenticated;

\echo == deleting a template clears the team default (on delete set null) (expect 0 errors)
select pg_temp.u(:'CA'); delete from warmup_templates where id = :'t';
reset role; select default_warmup_template_id is null as cleared from teams where id = :'A'; set role authenticated;

\echo == live board: warming_up is an allowed state; anything else still is not (expect 1 error)
reset role;
insert into live_progress (team_id, user_id, day, state) values (:'A', :'AV', current_date, 'warming_up');
insert into live_progress (team_id, user_id, day, state) values (:'A', :'CA', current_date, 'stretching');
select state from live_progress where team_id = :'A';

\echo == V4: no new columns about athletes (expect 0 errors; only the listed team columns)
select column_name from information_schema.columns where table_schema = 'public' and table_name = 'teams' and column_name in ('default_warmup', 'default_warmup_template_id', 'limited_space') order by 1;
select column_name from information_schema.columns where table_schema = 'public' and table_name = 'warmup_templates' order by ordinal_position;

\echo == 2.4.0 Part 2 (migration 012): position_index 0-11 allowed, 12 rejected; new equipment ids in the gym profile (expect 1 error)
update live_progress set position_index = 3 where team_id = :'A';
update live_progress set position_index = 12 where team_id = :'A';
select position_index from live_progress where team_id = :'A';
\echo == my_rack returns the athlete order in the rack group (expect 0 errors; my_index 0)
set role authenticated;
select pg_temp.u(:'CA'); select save_racks(:'A', jsonb_build_array(jsonb_build_object('name', 'Rack 1', 'users', jsonb_build_array(:'AV'))));
select pg_temp.u(:'AV'); select rack_name, partners, my_index from my_rack(:'A');
reset role;
