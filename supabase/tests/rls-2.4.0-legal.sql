-- API/RLS checks for the 2.4.0 Legal rulings of 11/19 (compliance § 2.4.0 build rulings #2, #3, #7; migration 011/012).
-- Run on a scratch Postgres after supabase-stub.sql + schema.sql (or v1 + 002–013), as superuser.
-- Each echo line says what to expect. Total expected errors: 8.
\set VERBOSITY terse
\pset footer off
insert into auth.users (id, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000ca', '{"name":"Coach Alpha","role":"coach","birth_year":"1985","is_minor":"false","coach_terms_version":"2026-11-19"}'),
 ('00000000-0000-0000-0000-0000000000c0', '{"name":"Coach Olde","role":"coach","birth_year":"1980","is_minor":"false"}'),
 ('00000000-0000-0000-0000-0000000000f1', '{"name":"Trainer Tess","role":"coach","birth_year":"1988","is_minor":"false","coach_terms_version":"2026-11-19"}'),
 ('00000000-0000-0000-0000-0000000000a1', '{"name":"Ava Athlete","role":"athlete","birth_year":"2010","is_minor":"true"}'),
 ('00000000-0000-0000-0000-0000000000a2', '{"name":"Wes Teammate","role":"athlete","birth_year":"2009","is_minor":"true"}'),
 ('00000000-0000-0000-0000-0000000000a3', '{"name":"Xia Third","role":"athlete","birth_year":"2009","is_minor":"true"}');
-- Coach Olde accepted the 11/14 Coach Terms before 2.4.0.
update profiles set coach_terms_version = '2026-11-14', coach_terms_accepted_at = now() - interval '5 days' where id = '00000000-0000-0000-0000-0000000000c0';
insert into teams (id, name, join_code, coach_id) values
 ('aaaaaaaa-0000-0000-0000-000000000001','Alpha','AAA111','00000000-0000-0000-0000-0000000000ca'),
 ('cccccccc-0000-0000-0000-000000000001','Olde','OOO111','00000000-0000-0000-0000-0000000000c0');
-- A verified trainer team whose trainer accepted the 11/15 Trainer Terms.
insert into teams (id, name, join_code, coach_id, kind, trainer_verified_at, trainer_terms_version, trainer_terms_accepted_at)
values ('99999999-0000-0000-0000-000000000001','Tess Clients','GEN111','00000000-0000-0000-0000-0000000000f1','general', now(), '2026-11-15', now() - interval '4 days');
create function pg_temp.u(x text) returns void language sql as $$ select set_config('request.jwt.claim.sub', x, false) $$;
\set A 'aaaaaaaa-0000-0000-0000-000000000001'
\set O 'cccccccc-0000-0000-0000-000000000001'
\set G '99999999-0000-0000-0000-000000000001'
\set CA '00000000-0000-0000-0000-0000000000ca'
\set CO '00000000-0000-0000-0000-0000000000c0'
\set TR '00000000-0000-0000-0000-0000000000f1'
\set AV '00000000-0000-0000-0000-0000000000a1'
\set AW '00000000-0000-0000-0000-0000000000a2'
\set AX '00000000-0000-0000-0000-0000000000a3'
insert into team_members (team_id, user_id) values (:'A', :'AV'), (:'A', :'AW'), (:'A', :'AX'), (:'O', :'AV');

\echo == #7 versions: both Terms are 2026-11-19 on the server (expect 0 errors)
select public.current_coach_terms() as coach_terms, public.current_trainer_terms() as trainer_terms;

set role authenticated;
\echo == #7 coach on the 11/14 Terms: record consent and confirm supervision are rejected (expect 2 errors)
select pg_temp.u(:'CO');
select version, current_version from my_coach_terms();
select record_consent(:'O', :'AV', true, true, true, true, true, true);
insert into test_sessions (team_id, day, battery) values (:'O', current_date, 'full');
\echo == #7 re-accepting the old version is refused (expect 1 error); accepting 2026-11-19 unblocks both (expect 0 errors)
select accept_coach_terms('2026-11-14');
select accept_coach_terms('2026-11-19');
select version, accepted_at is not null as accepted from my_coach_terms();
select record_consent(:'O', :'AV', true, true, true, true, true, true);
insert into test_sessions (team_id, day, battery) values (:'O', current_date, 'full');
select count(*) as supervision_rows from test_sessions where team_id = :'O';

\echo == #7 trainer on the 11/15 Terms: posting a program is rejected (expect 1 error)
select pg_temp.u(:'TR');
select terms_version, current_terms from my_team_status(:'G');
insert into team_programs (team_id, group_key, program) values (:'G', 'all', '{"id":"p1","sessions":[]}');
\echo == #7 re-accepting the old Trainer Terms is refused (expect 1 error); 2026-11-19 lets the trainer post (expect 0 errors)
select accept_trainer_terms(:'G', '2026-11-15');
select accept_trainer_terms(:'G', '2026-11-19');
insert into team_programs (team_id, group_key, program) values (:'G', 'all', '{"id":"p1","sessions":[]}');
select count(*) as trainer_programs from team_programs where team_id = :'G';

\echo == #2 the coach gets every member's key; the keys differ per athlete and per team (expect 0 errors; 3 rows, 3 distinct)
select pg_temp.u(:'CA');
select count(*) as rows, count(distinct key) as distinct_keys from level_off_keys(array[:'A']::uuid[]);
\echo == #2 the coach posts a program with Ava's adjustment off (only her key in the JSON)
insert into team_programs (team_id, group_key, program)
select :'A', 'all', jsonb_build_object('id', 'p2', 'sessions', '[]'::jsonb, 'levelAdjustOffFor', jsonb_build_array(key))
from level_off_keys(array[:'A']::uuid[]) where user_id = :'AV';

\echo == #2 Ava (the athlete) gets only her own key, and finds it in the program: off (expect 0 errors; 1 row, own = t, off = t)
select pg_temp.u(:'AV');
select count(*) as rows, bool_and(user_id = :'AV') as own from level_off_keys(array[:'A', :'O']::uuid[]) where team_id = :'A';
select (p.program -> 'levelAdjustOffFor') ? k.key as ava_off
from team_programs p, level_off_keys(array[:'A']::uuid[]) k where p.team_id = :'A' and p.group_key = 'all';

\echo == #2 API check as a teammate (Wes): he reads the program, gets only his own key, and can't tell whose key is listed
\echo == (expect 0 errors; 1 own row; wes_off = f; no user id in the JSON; the listed key isn't any plain hash of team id + Ava's id)
select pg_temp.u(:'AW');
select count(*) as rows, bool_and(user_id = :'AW') as own from level_off_keys(array[:'A']::uuid[]);
select (p.program -> 'levelAdjustOffFor') ? k.key as wes_off
from team_programs p, level_off_keys(array[:'A']::uuid[]) k where p.team_id = :'A' and p.group_key = 'all';
select position(:'AV' in p.program::text) = 0 and position(:'AX' in p.program::text) = 0 as no_user_ids
from team_programs p where p.team_id = :'A' and p.group_key = 'all';
-- Plain hashes anyone can compute offline (run as superuser only for the digest functions; the program is what Wes read).
reset role;
select not ((p.program -> 'levelAdjustOffFor') ?| array[
  'k' || left(encode(extensions.digest(:'A' || ':' || :'AV', 'sha256'), 'hex'), 32),
  'k' || left(encode(extensions.digest(:'A' || ':' || :'AV', 'sha1'), 'hex'), 32),
  'k' || left(md5(:'A' || ':' || :'AV'), 32),
  'k' || left(md5(:'A' || ':' || :'AV' || ':level-adjust-off'), 32)
]) as not_recomputable
from team_programs p where p.team_id = :'A' and p.group_key = 'all';
set role authenticated;
\echo == #2 the teammate can't compute another member's key or read the secret (expect 2 errors)
select pg_temp.u(:'AW');
select level_off_key(:'A', :'AV');
select decrypted_secret from vault.decrypted_secrets;
\echo == #2 a non-member gets nothing for another team (expect 0 errors; 0 rows)
select count(*) as rows from level_off_keys(array[:'O']::uuid[]);
reset role;
\echo == #2 anon can't call level_off_keys (expect 1 error)
set role anon;
select count(*) from level_off_keys(array['aaaaaaaa-0000-0000-0000-000000000001']::uuid[]);
reset role;
\echo == #2 the secret is in Vault under 'level_adjust_key', 64 hex characters (expect 0 errors; 1 row, t)
select count(*) as secrets, bool_and(length(decrypted_secret) = 64) as random_32_bytes from vault.decrypted_secrets where name = 'level_adjust_key';

\echo == #3 my_rack: one row, the caller's own index only (expect 0 errors)
set role authenticated;
select pg_temp.u(:'CA'); select save_racks(:'A', jsonb_build_array(jsonb_build_object('name', 'Rack 1', 'users', jsonb_build_array(:'AV', :'AW', :'AX'))));
select pg_temp.u(:'AW');
select count(*) as rows, max(my_index) as wes_index from my_rack(:'A');
reset role;
select (select count(*) from rack_group_members where team_id = :'A' and user_id::text < :'AW') as expected_wes_index;
select array_to_string(proargnames, ',') as my_rack_columns from pg_proc where proname = 'my_rack';
\echo == #3 every member gets a different index, each only their own (expect 0 errors; 3 rows, 3 distinct, 0..2)
create temp table rack_idx (u uuid, i int);
grant all on rack_idx to authenticated;
set role authenticated;
select pg_temp.u(:'AV'); insert into rack_idx select :'AV', my_index from my_rack(:'A');
select pg_temp.u(:'AW'); insert into rack_idx select :'AW', my_index from my_rack(:'A');
select pg_temp.u(:'AX'); insert into rack_idx select :'AX', my_index from my_rack(:'A');
reset role;
select count(*) as rows, count(distinct i) as distinct_idx, min(i) as lo, max(i) as hi from rack_idx;
