-- Only for a bare, ephemeral local PostgreSQL container. Refuses Supabase.
do $local$ begin
 if exists(select 1 from pg_namespace where nspname='auth')
  or exists(select 1 from pg_tables where schemaname='public') then
  raise exception 'Refusing bootstrap: requires a bare disposable PostgreSQL container';
 end if;
end $local$;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create role anon nologin;
create role authenticated nologin;
