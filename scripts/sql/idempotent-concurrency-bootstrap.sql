-- Only for a named, disposable local PostgreSQL database.
do $local$ begin
 if exists(select 1 from pg_namespace where nspname='auth')
  or exists(select 1 from pg_tables where schemaname='public') then
  raise exception 'Refusing bootstrap: requires a bare disposable PostgreSQL database';
 end if;
 if not exists(select 1 from pg_roles where rolname='anon') then execute 'create role anon nologin'; end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then execute 'create role authenticated nologin'; end if;
end $local$;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
