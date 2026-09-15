-- Storyboard Shot Builder v4.1.1
-- Isolates customer projects from the admin's normal dashboard and adds a
-- paginated all-users directory for the dedicated Admin Center.
-- Run once after supabase-v4.1-admin.sql.

begin;

create table if not exists public.storyboard_admin_support_sessions (
  admin_id uuid primary key references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  opened_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '8 hours')
);

create index if not exists storyboard_admin_support_project_idx
  on public.storyboard_admin_support_sessions(project_id, expires_at);

alter table public.storyboard_admin_support_sessions enable row level security;
revoke all on public.storyboard_admin_support_sessions from anon, authenticated;

create or replace function public.storyboard_admin_has_project_access(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
    and public.storyboard_is_admin()
    and exists (
      select 1
      from public.storyboard_admin_support_sessions s
      where s.admin_id = auth.uid()
        and s.project_id = p_project_id
        and s.expires_at > now()
    );
$$;

create or replace function public.storyboard_admin_has_storage_access(
  p_bucket_id text,
  p_object_name text
)
returns boolean
language sql
stable
security definer
set search_path = public, storage, pg_temp
as $$
  select p_bucket_id = 'storyboards'
    and auth.uid() is not null
    and public.storyboard_is_admin()
    and exists (
      select 1
      from public.storyboard_admin_support_sessions s
      where s.admin_id = auth.uid()
        and s.project_id::text = split_part(p_object_name, '/', 1)
        and s.expires_at > now()
    );
$$;

revoke all on function public.storyboard_admin_has_project_access(uuid) from public;
revoke all on function public.storyboard_admin_has_storage_access(text, text) from public;
grant execute on function public.storyboard_admin_has_project_access(uuid) to authenticated;
grant execute on function public.storyboard_admin_has_storage_access(text, text) to authenticated;

create or replace function public.storyboard_admin_list_users(
  p_query text default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  user_id uuid,
  username text,
  display_name text,
  project_count bigint,
  total_count bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_query text := left(btrim(coalesce(p_query, '')), 60);
  v_pattern text;
begin
  if not public.storyboard_is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  v_pattern := '%' || replace(replace(replace(v_query, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%';
  perform public.storyboard_admin_write_audit(
    case when v_query = '' then 'user_list' else 'user_search' end,
    null,
    null,
    jsonb_build_object('query', v_query, 'offset', greatest(coalesce(p_offset, 0), 0))
  );

  return query
  with filtered as (
    select p.id, p.username, p.display_name
    from public.profiles p
    where v_query = ''
      or p.username ilike v_pattern escape E'\\'
      or coalesce(p.display_name, '') ilike v_pattern escape E'\\'
  )
  select
    f.id,
    f.username,
    f.display_name,
    (
      select count(distinct project_access.project_id)
      from (
        select owned.id as project_id
        from public.projects owned
        where owned.owner_id = f.id
        union
        select pm.project_id
        from public.project_members pm
        where pm.user_id = f.id
      ) project_access
    )::bigint,
    count(*) over()::bigint
  from filtered f
  order by lower(coalesce(f.username, '')), f.id
  limit greatest(1, least(coalesce(p_limit, 100), 200))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke all on function public.storyboard_admin_list_users(text, integer, integer) from public;
grant execute on function public.storyboard_admin_list_users(text, integer, integer) to authenticated;

create or replace function public.storyboard_admin_open_project(p_project_id uuid, p_target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_project_name text;
  v_username text;
  v_expires_at timestamptz := now() + interval '8 hours';
begin
  if not public.storyboard_is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.projects p
    where p.id = p_project_id and (
      p.owner_id = p_target_user_id or exists (
        select 1 from public.project_members pm
        where pm.project_id = p.id and pm.user_id = p_target_user_id
      )
    )
  ) then
    raise exception 'TARGET_USER_HAS_NO_PROJECT_ACCESS';
  end if;

  select p.name into v_project_name from public.projects p where p.id = p_project_id;
  select p.username into v_username from public.profiles p where p.id = p_target_user_id;

  insert into public.storyboard_admin_support_sessions(
    admin_id, project_id, target_user_id, opened_at, expires_at
  )
  values (auth.uid(), p_project_id, p_target_user_id, now(), v_expires_at)
  on conflict (admin_id) do update
    set project_id = excluded.project_id,
        target_user_id = excluded.target_user_id,
        opened_at = excluded.opened_at,
        expires_at = excluded.expires_at;

  perform public.storyboard_admin_write_audit(
    'support_opened',
    p_project_id,
    p_target_user_id,
    jsonb_build_object('project_name', v_project_name, 'expires_at', v_expires_at)
  );

  return jsonb_build_object(
    'project_id', p_project_id,
    'project_name', v_project_name,
    'target_user_id', p_target_user_id,
    'username', v_username,
    'expires_at', v_expires_at
  );
end;
$$;

create or replace function public.storyboard_admin_close_project(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_target_user_id uuid;
begin
  if not public.storyboard_is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  select s.target_user_id into v_target_user_id
  from public.storyboard_admin_support_sessions s
  where s.admin_id = auth.uid() and s.project_id = p_project_id;

  perform public.storyboard_admin_write_audit(
    'support_closed', p_project_id, v_target_user_id, '{}'::jsonb
  );

  delete from public.storyboard_admin_support_sessions
  where admin_id = auth.uid() and project_id = p_project_id;
end;
$$;

revoke all on function public.storyboard_admin_open_project(uuid, uuid) from public;
revoke all on function public.storyboard_admin_close_project(uuid) from public;
grant execute on function public.storyboard_admin_open_project(uuid, uuid) to authenticated;
grant execute on function public.storyboard_admin_close_project(uuid) to authenticated;

-- Remove the previous permanent full-access policies. Admin access now exists
-- only for the one project explicitly opened in support mode.
do $$
declare
  v_table text;
  v_scope_column text;
begin
  foreach v_table in array array[
    'projects', 'scenes', 'shots', 'project_members', 'project_messages',
    'lighting_diagrams', 'project_ai_characters', 'project_ai_locations'
  ] loop
    if to_regclass('public.' || v_table) is not null then
      v_scope_column := case when v_table = 'projects' then 'id' else 'project_id' end;
      execute format('drop policy if exists "storyboard admins full access" on public.%I', v_table);
      execute format('drop policy if exists "storyboard admins support session access" on public.%I', v_table);
      execute format(
        'create policy "storyboard admins support session access" on public.%I for all to authenticated using (public.storyboard_admin_has_project_access(%I)) with check (public.storyboard_admin_has_project_access(%I))',
        v_table,
        v_scope_column,
        v_scope_column
      );
    end if;
  end loop;
end;
$$;

drop policy if exists "storyboard admins manage storyboard media" on storage.objects;
create policy "storyboard admins manage storyboard media"
on storage.objects for all to authenticated
using (public.storyboard_admin_has_storage_access(bucket_id, name))
with check (public.storyboard_admin_has_storage_access(bucket_id, name));

commit;
