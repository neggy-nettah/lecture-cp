-- Read-only checks for the production Supabase project.
-- Run these after connecting the project; they do not modify schema or data.

select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
  and c.relname in ('children','progress')
  and c.relkind='r'
order by c.relname;

select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname='public'
  and tablename in ('children','progress')
order by tablename, policyname;

select
  conrelid::regclass as table_name,
  conname,
  contype,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid in ('public.children'::regclass,'public.progress'::regclass)
order by table_name::text, conname;

select
  table_schema,
  table_name,
  privilege_type,
  grantee
from information_schema.role_table_grants
where table_schema='public'
  and table_name in ('children','progress')
  and grantee in ('anon','authenticated')
order by table_name, grantee, privilege_type;
