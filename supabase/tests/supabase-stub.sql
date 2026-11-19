-- Local test stub: a minimal stand-in for Supabase's auth schema and roles.
-- create role anon nologin; create role authenticated nologin;  (once per cluster)
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
create publication supabase_realtime;
-- 2.4.0 (Legal ruling #2): Supabase's `extensions` schema (pgcrypto) and a minimal Vault stand-in. On Supabase both exist,
-- and `vault` isn't readable by anon or authenticated (same here: no grants).
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema vault;
create table vault.secrets (id uuid primary key default gen_random_uuid(), name text unique, description text, secret text not null);
create view vault.decrypted_secrets as select id, name, description, secret, secret as decrypted_secret from vault.secrets;
create function vault.create_secret(new_secret text, new_name text default null, new_description text default '') returns uuid
language sql as $$ insert into vault.secrets (secret, name, description) values (new_secret, new_name, new_description) returning id $$;
