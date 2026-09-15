-- Storyboard Shot Builder v4.1.1
-- Multi-admin support console, isolated support sessions, audited access and
-- admin AI quota bypass.
-- Run after supabase-v4.0-ai.sql.

begin;

create table if not exists public.storyboard_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'support_admin' check (role in ('support_admin', 'superadmin')),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.storyboard_admin_audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid not null,
  target_user_id uuid,
  project_id uuid,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.storyboard_admin_support_sessions (
  admin_id uuid primary key references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  opened_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '8 hours')
);

create index if not exists storyboard_admin_audit_created_idx
  on public.storyboard_admin_audit_log(created_at desc);
create index if not exists storyboard_admin_audit_project_idx
  on public.storyboard_admin_audit_log(project_id, created_at desc);
create index if not exists storyboard_admin_support_project_idx
  on public.storyboard_admin_support_sessions(project_id, expires_at);

alter table public.storyboard_admins enable row level security;
alter table public.storyboard_admin_audit_log enable row level security;
alter table public.storyboard_admin_support_sessions enable row level security;
revoke all on public.storyboard_admins from anon, authenticated;
revoke all on public.storyboard_admin_audit_log from anon, authenticated;
revoke all on public.storyboard_admin_support_sessions from anon, authenticated;

create or replace function public.storyboard_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1 from public.storyboard_admins a
    where a.user_id = auth.uid() and a.active
  );
$$;

create or replace function public.storyboard_is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1 from public.storyboard_admins a
    where a.user_id = auth.uid() and a.active and a.role = 'superadmin'
  );
$$;

revoke all on function public.storyboard_is_admin() from public;
revoke all on function public.storyboard_is_superadmin() from public;
grant execute on function public.storyboard_is_admin() to authenticated;
grant execute on function public.storyboard_is_superadmin() to authenticated;

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

create or replace function public.storyboard_admin_status()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (
      select jsonb_build_object('is_admin', true, 'role', a.role)
      from public.storyboard_admins a
      where a.user_id = auth.uid() and a.active
    ),
    jsonb_build_object('is_admin', false, 'role', null)
  );
$$;

revoke all on function public.storyboard_admin_status() from public;
grant execute on function public.storyboard_admin_status() to authenticated;

create or replace function public.storyboard_admin_write_audit(
  p_action text,
  p_project_id uuid default null,
  p_target_user_id uuid default null,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.storyboard_is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  insert into public.storyboard_admin_audit_log(admin_id, target_user_id, project_id, action, details)
  values (auth.uid(), p_target_user_id, p_project_id, left(coalesce(p_action, 'admin_action'), 100), coalesce(p_details, '{}'::jsonb));
end;
$$;

revoke all on function public.storyboard_admin_write_audit(text, uuid, uuid, jsonb) from public;

-- Run this only from Supabase SQL Editor to create or restore the first superadmin.
create or replace function public.storyboard_grant_first_superadmin(p_username text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
begin
  select p.id into v_user_id
  from public.profiles p
  where lower(p.username) = lower(btrim(p_username))
  limit 1;
  if v_user_id is null then
    raise exception 'USERNAME_NOT_FOUND';
  end if;
  insert into public.storyboard_admins(user_id, role, active, created_by, updated_at)
  values (v_user_id, 'superadmin', true, v_user_id, now())
  on conflict (user_id) do update
    set role = 'superadmin', active = true, updated_at = now();
  return v_user_id;
end;
$$;

revoke all on function public.storyboard_grant_first_superadmin(text) from public, anon, authenticated;

create or replace function public.storyboard_admin_list_admins()
returns table (
  user_id uuid,
  username text,
  display_name text,
  role text,
  active boolean,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.storyboard_is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  return query
  select a.user_id, p.username, p.display_name, a.role, a.active, a.created_at
  from public.storyboard_admins a
  left join public.profiles p on p.id = a.user_id
  where a.active
  order by (a.role = 'superadmin') desc, lower(coalesce(p.username, ''));
end;
$$;

create or replace function public.storyboard_admin_upsert(p_username text, p_role text default 'support_admin')
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_target uuid;
  v_role text := lower(btrim(coalesce(p_role, 'support_admin')));
  v_previous_role text;
  v_superadmins integer;
begin
  if not public.storyboard_is_superadmin() then
    raise exception 'SUPERADMIN_REQUIRED' using errcode = '42501';
  end if;
  if v_role not in ('support_admin', 'superadmin') then
    raise exception 'INVALID_ADMIN_ROLE';
  end if;
  select p.id into v_target from public.profiles p
  where lower(p.username) = lower(btrim(p_username)) limit 1;
  if v_target is null then raise exception 'USERNAME_NOT_FOUND'; end if;

  select a.role into v_previous_role from public.storyboard_admins a where a.user_id = v_target and a.active;
  if v_previous_role = 'superadmin' and v_role <> 'superadmin' then
    select count(*) into v_superadmins from public.storyboard_admins a where a.active and a.role = 'superadmin';
    if v_superadmins <= 1 then raise exception 'LAST_SUPERADMIN_CANNOT_BE_DEMOTED'; end if;
  end if;

  insert into public.storyboard_admins(user_id, role, active, created_by, updated_at)
  values (v_target, v_role, true, auth.uid(), now())
  on conflict (user_id) do update set role = excluded.role, active = true, updated_at = now();

  perform public.storyboard_admin_write_audit('admin_upsert', null, v_target, jsonb_build_object('role', v_role));
end;
$$;

create or replace function public.storyboard_admin_remove(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_target_role text;
  v_superadmins integer;
begin
  if not public.storyboard_is_superadmin() then
    raise exception 'SUPERADMIN_REQUIRED' using errcode = '42501';
  end if;
  select a.role into v_target_role from public.storyboard_admins a where a.user_id = p_user_id and a.active;
  if v_target_role is null then raise exception 'ADMIN_NOT_FOUND'; end if;
  if v_target_role = 'superadmin' then
    select count(*) into v_superadmins from public.storyboard_admins a where a.active and a.role = 'superadmin';
    if v_superadmins <= 1 then raise exception 'LAST_SUPERADMIN_CANNOT_BE_REMOVED'; end if;
  end if;
  perform public.storyboard_admin_write_audit('admin_removed', null, p_user_id, jsonb_build_object('previous_role', v_target_role));
  delete from public.storyboard_admin_support_sessions where admin_id = p_user_id;
  update public.storyboard_admins set active = false, updated_at = now() where user_id = p_user_id;
end;
$$;

revoke all on function public.storyboard_admin_list_admins() from public;
revoke all on function public.storyboard_admin_upsert(text, text) from public;
revoke all on function public.storyboard_admin_remove(uuid) from public;
grant execute on function public.storyboard_admin_list_admins() to authenticated;
grant execute on function public.storyboard_admin_upsert(text, text) to authenticated;
grant execute on function public.storyboard_admin_remove(uuid) to authenticated;

create or replace function public.storyboard_admin_search_users(p_query text)
returns table (
  user_id uuid,
  username text,
  display_name text,
  project_count bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_query text := left(btrim(coalesce(p_query, '')), 30);
begin
  if not public.storyboard_is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  if char_length(v_query) < 2 then raise exception 'SEARCH_QUERY_TOO_SHORT'; end if;
  perform public.storyboard_admin_write_audit('user_search', null, null, jsonb_build_object('query', v_query));
  return query
  select p.id, p.username, p.display_name,
    (
      select count(distinct access.project_id)
      from (
        select own.id as project_id from public.projects own where own.owner_id = p.id
        union
        select pm.project_id from public.project_members pm where pm.user_id = p.id
      ) access
    )::bigint
  from public.profiles p
  where p.username ilike '%' || replace(replace(replace(v_query, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%' escape E'\\'
  order by (lower(p.username) = lower(v_query)) desc, lower(p.username)
  limit 20;
end;
$$;

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
        select owned.id as project_id from public.projects owned where owned.owner_id = f.id
        union
        select pm.project_id from public.project_members pm where pm.user_id = f.id
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

create or replace function public.storyboard_admin_list_user_projects(p_user_id uuid)
returns table (
  id uuid,
  owner_id uuid,
  name text,
  aspect text,
  style text,
  folder text,
  updated_at timestamptz,
  access_role text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.storyboard_is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  return query
  select distinct p.id, p.owner_id, p.name, p.aspect, p.style, coalesce(p.folder, 'General'), p.updated_at,
    case when p.owner_id = p_user_id then 'owner'::text else 'shared'::text end
  from public.projects p
  left join public.project_members pm on pm.project_id = p.id and pm.user_id = p_user_id
  where p.owner_id = p_user_id or pm.user_id = p_user_id
  order by p.updated_at desc;
end;
$$;

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
  ) then raise exception 'TARGET_USER_HAS_NO_PROJECT_ACCESS'; end if;
  select p.name into v_project_name from public.projects p where p.id = p_project_id;
  select p.username into v_username from public.profiles p where p.id = p_target_user_id;

  insert into public.storyboard_admin_support_sessions(admin_id, project_id, target_user_id, opened_at, expires_at)
  values (auth.uid(), p_project_id, p_target_user_id, now(), v_expires_at)
  on conflict (admin_id) do update
    set project_id = excluded.project_id,
        target_user_id = excluded.target_user_id,
        opened_at = excluded.opened_at,
        expires_at = excluded.expires_at;

  perform public.storyboard_admin_write_audit(
    'support_opened', p_project_id, p_target_user_id,
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
  if not public.storyboard_is_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  select s.target_user_id into v_target_user_id
  from public.storyboard_admin_support_sessions s
  where s.admin_id = auth.uid() and s.project_id = p_project_id;
  perform public.storyboard_admin_write_audit('support_closed', p_project_id, v_target_user_id, '{}'::jsonb);
  delete from public.storyboard_admin_support_sessions
  where admin_id = auth.uid() and project_id = p_project_id;
end;
$$;

revoke all on function public.storyboard_admin_search_users(text) from public;
revoke all on function public.storyboard_admin_list_user_projects(uuid) from public;
revoke all on function public.storyboard_admin_open_project(uuid, uuid) from public;
revoke all on function public.storyboard_admin_close_project(uuid) from public;
grant execute on function public.storyboard_admin_search_users(text) to authenticated;
grant execute on function public.storyboard_admin_list_user_projects(uuid) to authenticated;
grant execute on function public.storyboard_admin_open_project(uuid, uuid) to authenticated;
grant execute on function public.storyboard_admin_close_project(uuid) to authenticated;

create or replace function public.storyboard_admin_recent_activity(p_limit integer default 40)
returns table (
  id bigint,
  admin_username text,
  target_username text,
  project_name text,
  action text,
  details jsonb,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.storyboard_is_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  return query
  select l.id, ap.username, tp.username, pr.name, l.action, l.details, l.created_at
  from public.storyboard_admin_audit_log l
  left join public.profiles ap on ap.id = l.admin_id
  left join public.profiles tp on tp.id = l.target_user_id
  left join public.projects pr on pr.id = l.project_id
  order by l.created_at desc
  limit greatest(1, least(coalesce(p_limit, 40), 100));
end;
$$;

revoke all on function public.storyboard_admin_recent_activity(integer) from public;
grant execute on function public.storyboard_admin_recent_activity(integer) to authenticated;

-- Ordinary users keep the existing owner/member policies. Admin access is
-- restricted to the one project explicitly opened in support mode.
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
      execute format('alter table public.%I enable row level security', v_table);
      execute format('drop policy if exists "storyboard admins full access" on public.%I', v_table);
      execute format('drop policy if exists "storyboard admins support session access" on public.%I', v_table);
      v_scope_column := case when v_table = 'projects' then 'id' else 'project_id' end;
      execute format(
        'create policy "storyboard admins support session access" on public.%I for all to authenticated using (public.storyboard_admin_has_project_access(%I)) with check (public.storyboard_admin_has_project_access(%I))',
        v_table,
        v_scope_column,
        v_scope_column
      );
      execute format('grant select, insert, update, delete on public.%I to authenticated', v_table);
    end if;
  end loop;
end;
$$;

do $$
begin
  if to_regclass('public.profiles') is not null then
    drop policy if exists "storyboard admins read profiles" on public.profiles;
    create policy "storyboard admins read profiles"
      on public.profiles for select to authenticated
      using (public.storyboard_is_admin());
    grant select on public.profiles to authenticated;
  end if;
end;
$$;

drop policy if exists "storyboard admins manage storyboard media" on storage.objects;
create policy "storyboard admins manage storyboard media"
on storage.objects for all to authenticated
using (public.storyboard_admin_has_storage_access(bucket_id, name))
with check (public.storyboard_admin_has_storage_access(bucket_id, name));

-- Conflict-aware scene and shot updates for support mode.
create or replace function public.storyboard_admin_update_scene(
  p_scene_id uuid,
  p_expected_version integer,
  p_title text,
  p_description text
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_version integer;
begin
  if not public.storyboard_is_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  update public.scenes
  set title = coalesce(p_title, ''), description = coalesce(p_description, ''), version = coalesce(version, 1) + 1
  where id = p_scene_id and coalesce(version, 1) = coalesce(p_expected_version, 1)
  returning version into v_version;
  if v_version is null then
    if exists (select 1 from public.scenes where id = p_scene_id) then raise exception 'EDIT_CONFLICT'; end if;
    raise exception 'SCENE_NOT_FOUND';
  end if;
  return v_version;
end;
$$;

create or replace function public.storyboard_admin_update_shot(
  p_shot_id uuid,
  p_expected_version integer,
  p_data jsonb
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_version integer;
begin
  if not public.storyboard_is_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  update public.shots
  set data = coalesce(p_data, '{}'::jsonb), version = coalesce(version, 1) + 1
  where id = p_shot_id and coalesce(version, 1) = coalesce(p_expected_version, 1)
  returning version into v_version;
  if v_version is null then
    if exists (select 1 from public.shots where id = p_shot_id) then raise exception 'EDIT_CONFLICT'; end if;
    raise exception 'SHOT_NOT_FOUND';
  end if;
  return v_version;
end;
$$;

revoke all on function public.storyboard_admin_update_scene(uuid, integer, text, text) from public;
revoke all on function public.storyboard_admin_update_shot(uuid, integer, jsonb) from public;
grant execute on function public.storyboard_admin_update_scene(uuid, integer, text, text) to authenticated;
grant execute on function public.storyboard_admin_update_shot(uuid, integer, jsonb) to authenticated;

create or replace function public.storyboard_admin_add_project_member(
  p_project_id uuid,
  p_username text,
  p_role text,
  p_permissions jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
begin
  if not public.storyboard_is_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  select p.id into v_user_id from public.profiles p where lower(p.username) = lower(btrim(p_username)) limit 1;
  if v_user_id is null then raise exception 'USERNAME_NOT_FOUND'; end if;
  if exists (select 1 from public.projects p where p.id = p_project_id and p.owner_id = v_user_id) then raise exception 'USER_IS_PROJECT_OWNER'; end if;
  insert into public.project_members(project_id, user_id, role, permissions)
  values (p_project_id, v_user_id, p_role, coalesce(p_permissions, '{}'::jsonb))
  on conflict (project_id, user_id) do update set role = excluded.role, permissions = excluded.permissions;
  perform public.storyboard_admin_write_audit('project_member_added', p_project_id, v_user_id, jsonb_build_object('role', p_role));
end;
$$;

create or replace function public.storyboard_admin_update_project_member(
  p_project_id uuid,
  p_user_id uuid,
  p_role text,
  p_permissions jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.storyboard_is_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  update public.project_members set role = p_role, permissions = coalesce(p_permissions, '{}'::jsonb)
  where project_id = p_project_id and user_id = p_user_id;
  if not found then raise exception 'PROJECT_MEMBER_NOT_FOUND'; end if;
  perform public.storyboard_admin_write_audit('project_member_updated', p_project_id, p_user_id, jsonb_build_object('role', p_role));
end;
$$;

create or replace function public.storyboard_admin_remove_project_member(p_project_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.storyboard_is_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  delete from public.project_members where project_id = p_project_id and user_id = p_user_id;
  if not found then raise exception 'PROJECT_MEMBER_NOT_FOUND'; end if;
  perform public.storyboard_admin_write_audit('project_member_removed', p_project_id, p_user_id, '{}'::jsonb);
end;
$$;

revoke all on function public.storyboard_admin_add_project_member(uuid, text, text, jsonb) from public;
revoke all on function public.storyboard_admin_update_project_member(uuid, uuid, text, jsonb) from public;
revoke all on function public.storyboard_admin_remove_project_member(uuid, uuid) from public;
grant execute on function public.storyboard_admin_add_project_member(uuid, text, text, jsonb) to authenticated;
grant execute on function public.storyboard_admin_update_project_member(uuid, uuid, text, jsonb) to authenticated;
grant execute on function public.storyboard_admin_remove_project_member(uuid, uuid) to authenticated;

-- Creates the same kind of share token as the existing collaboration flow while
-- tolerating optional invitee/inviter/expiry columns used by earlier migrations.
create or replace function public.storyboard_admin_create_project_invite(
  p_project_id uuid,
  p_invitee_email text,
  p_role text,
  p_permissions jsonb
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_token text := gen_random_uuid()::text;
  v_columns text := 'project_id, token, role, permissions';
  v_values text := '$1, ';
  v_token_expr text;
begin
  if not public.storyboard_is_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  if to_regclass('public.project_invites') is null then raise exception 'PROJECT_INVITES_NOT_CONFIGURED'; end if;
  select case when c.udt_name = 'uuid' then '$2::uuid' else '$2::text' end into v_token_expr
  from information_schema.columns c
  where c.table_schema = 'public' and c.table_name = 'project_invites' and c.column_name = 'token';
  if v_token_expr is null then raise exception 'PROJECT_INVITE_TOKEN_COLUMN_MISSING'; end if;
  v_values := v_values || v_token_expr || ', $3, $4';

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='project_invites' and column_name='invitee_email') then
    v_columns := v_columns || ', invitee_email'; v_values := v_values || ', $5';
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='project_invites' and column_name='invited_by') then
    v_columns := v_columns || ', invited_by'; v_values := v_values || ', $6';
  elsif exists (select 1 from information_schema.columns where table_schema='public' and table_name='project_invites' and column_name='created_by') then
    v_columns := v_columns || ', created_by'; v_values := v_values || ', $6';
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='project_invites' and column_name='expires_at') then
    v_columns := v_columns || ', expires_at'; v_values := v_values || ', now() + interval ''7 days''';
  end if;

  execute format('insert into public.project_invites (%s) values (%s)', v_columns, v_values)
    using p_project_id, v_token, p_role, coalesce(p_permissions, '{}'::jsonb), nullif(lower(btrim(p_invitee_email)), ''), auth.uid();
  perform public.storyboard_admin_write_audit('project_invite_created', p_project_id, null, jsonb_build_object('role', p_role, 'email_restricted', p_invitee_email is not null));
  return v_token;
end;
$$;

revoke all on function public.storyboard_admin_create_project_invite(uuid, text, text, jsonb) from public;
grant execute on function public.storyboard_admin_create_project_invite(uuid, text, text, jsonb) to authenticated;

create or replace function public.storyboard_admin_delete_project(p_project_id uuid, p_target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text;
begin
  if not public.storyboard_is_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  select p.name into v_name from public.projects p where p.id = p_project_id;
  if v_name is null then raise exception 'PROJECT_NOT_FOUND'; end if;
  perform public.storyboard_admin_write_audit('project_deleted', p_project_id, p_target_user_id, jsonb_build_object('project_name', v_name));
  delete from public.projects where id = p_project_id;
  return found;
end;
$$;

revoke all on function public.storyboard_admin_delete_project(uuid, uuid) from public;
grant execute on function public.storyboard_admin_delete_project(uuid, uuid) to authenticated;

-- Automatic row-level audit for every project mutation performed by an admin.
create or replace function public.storyboard_admin_audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row jsonb;
  v_project_id uuid;
  v_target_user_id uuid;
begin
  if not public.storyboard_is_admin() then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  if tg_table_name = 'projects' then
    v_project_id := nullif(v_row->>'id', '')::uuid;
    v_target_user_id := nullif(v_row->>'owner_id', '')::uuid;
  else
    v_project_id := nullif(v_row->>'project_id', '')::uuid;
    select p.owner_id into v_target_user_id from public.projects p where p.id = v_project_id;
  end if;
  perform public.storyboard_admin_write_audit(
    'row_' || lower(tg_op), v_project_id, v_target_user_id,
    jsonb_build_object('table', tg_table_name, 'row_id', v_row->>'id')
  );
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

revoke all on function public.storyboard_admin_audit_row_change() from public;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'projects', 'scenes', 'shots', 'project_members', 'project_messages',
    'lighting_diagrams', 'project_ai_characters', 'project_ai_locations'
  ] loop
    if to_regclass('public.' || v_table) is not null then
      execute format('drop trigger if exists storyboard_admin_audit_change on public.%I', v_table);
      execute format(
        'create trigger storyboard_admin_audit_change before insert or update or delete on public.%I for each row execute function public.storyboard_admin_audit_row_change()',
        v_table
      );
    end if;
  end loop;
end;
$$;

-- Extend AI visibility/media checks so the Worker can keep using the signed-in
-- admin JWT. No secret/service-role key is introduced.
create or replace function public.storyboard_ai_can_view(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and (
    public.storyboard_is_admin()
    or exists (select 1 from public.projects p where p.id = p_project_id and p.owner_id = auth.uid())
    or exists (select 1 from public.project_members pm where pm.project_id = p_project_id and pm.user_id = auth.uid())
  );
$$;

create or replace function public.storyboard_ai_can_manage_media(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and (
    public.storyboard_is_admin()
    or exists (select 1 from public.projects p where p.id = p_project_id and p.owner_id = auth.uid())
    or exists (
      select 1 from public.project_members pm
      where pm.project_id = p_project_id and pm.user_id = auth.uid()
        and coalesce(pm.permissions, '{}'::jsonb) @> '{"media": true}'::jsonb
    )
  );
$$;

create or replace function public.reserve_ai_generation(p_project_id uuid)
returns table (
  allowed boolean,
  used integer,
  remaining integer,
  global_remaining integer,
  daily_limit integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := (timezone('utc', now()))::date;
  v_daily_limit constant integer := 20;
  v_global_limit constant integer := 70;
  v_used integer := 0;
  v_global_used integer := 0;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if not public.storyboard_ai_can_manage_media(p_project_id) then raise exception 'MEDIA_PERMISSION_REQUIRED' using errcode = '42501'; end if;

  -- Admin generations do not consume the user or shared free pools.
  if public.storyboard_is_admin() then
    perform public.storyboard_admin_write_audit('ai_generation_reserved', p_project_id, null, jsonb_build_object('quota_bypass', true));
    return query select true, 0, -1, -1, -1;
    return;
  end if;

  perform pg_advisory_xact_lock(40000001);
  select coalesce(sum(u.attempts), 0)::integer into v_global_used
  from public.ai_generation_usage u where u.usage_date = v_today;
  select coalesce(u.attempts, 0) into v_used
  from public.ai_generation_usage u where u.user_id = v_user_id and u.usage_date = v_today;

  if v_used >= v_daily_limit or v_global_used >= v_global_limit then
    return query select false, v_used, greatest(v_daily_limit - v_used, 0), greatest(v_global_limit - v_global_used, 0), v_daily_limit;
    return;
  end if;

  insert into public.ai_generation_usage(user_id, usage_date, attempts, last_project_id, updated_at)
  values (v_user_id, v_today, 1, p_project_id, now())
  on conflict (user_id, usage_date) do update
    set attempts = public.ai_generation_usage.attempts + 1,
        last_project_id = excluded.last_project_id,
        updated_at = now()
  returning attempts into v_used;

  return query select true, v_used, greatest(v_daily_limit - v_used, 0), greatest(v_global_limit - (v_global_used + 1), 0), v_daily_limit;
end;
$$;

revoke all on function public.reserve_ai_generation(uuid) from public;
grant execute on function public.reserve_ai_generation(uuid) to authenticated;

commit;

-- REQUIRED ONE-TIME BOOTSTRAP (run separately after COMMIT and replace the value):
-- select public.storyboard_grant_first_superadmin('YOUR_APP_USERNAME');
