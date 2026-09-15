-- Storyboard Shot Builder v4.1.3
-- Fixes PostgreSQL return-type mismatches in Admin Center RPCs and makes the
-- users directory start from auth.users so accounts with incomplete profiles
-- are still visible. Safe to run again.

begin;

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
  with user_rows as (
    select
      u.id::uuid as account_id,
      coalesce(
        nullif(btrim(p.username::text), ''),
        nullif(btrim(u.raw_user_meta_data ->> 'username'), ''),
        'user-' || left(u.id::text, 8)
      )::text as username_value,
      coalesce(
        nullif(btrim(p.display_name::text), ''),
        nullif(btrim(u.raw_user_meta_data ->> 'display_name'), ''),
        nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
        ''
      )::text as display_name_value
    from auth.users u
    left join public.profiles p on p.id = u.id
  ),
  filtered as (
    select r.account_id, r.username_value, r.display_name_value
    from user_rows r
    where v_query = ''
      or r.username_value ilike v_pattern escape E'\\'
      or r.display_name_value ilike v_pattern escape E'\\'
  )
  select
    f.account_id::uuid,
    f.username_value::text,
    f.display_name_value::text,
    (
      select count(distinct project_access.project_id)
      from (
        select owned.id as project_id
        from public.projects owned
        where owned.owner_id = f.account_id
        union
        select pm.project_id
        from public.project_members pm
        where pm.user_id = f.account_id
      ) project_access
    )::bigint,
    count(*) over()::bigint
  from filtered f
  order by lower(f.username_value), f.account_id
  limit greatest(1, least(coalesce(p_limit, 100), 200))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

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
  v_pattern text;
begin
  if not public.storyboard_is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  if char_length(v_query) < 2 then raise exception 'SEARCH_QUERY_TOO_SHORT'; end if;

  v_pattern := '%' || replace(replace(replace(v_query, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%';
  perform public.storyboard_admin_write_audit('user_search', null, null, jsonb_build_object('query', v_query));

  return query
  with user_rows as (
    select
      u.id::uuid as account_id,
      coalesce(
        nullif(btrim(p.username::text), ''),
        nullif(btrim(u.raw_user_meta_data ->> 'username'), ''),
        'user-' || left(u.id::text, 8)
      )::text as username_value,
      coalesce(
        nullif(btrim(p.display_name::text), ''),
        nullif(btrim(u.raw_user_meta_data ->> 'display_name'), ''),
        nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
        ''
      )::text as display_name_value
    from auth.users u
    left join public.profiles p on p.id = u.id
  )
  select
    r.account_id::uuid,
    r.username_value::text,
    r.display_name_value::text,
    (
      select count(distinct project_access.project_id)
      from (
        select owned.id as project_id from public.projects owned where owned.owner_id = r.account_id
        union
        select pm.project_id from public.project_members pm where pm.user_id = r.account_id
      ) project_access
    )::bigint
  from user_rows r
  where r.username_value ilike v_pattern escape E'\\'
     or r.display_name_value ilike v_pattern escape E'\\'
  order by (lower(r.username_value) = lower(v_query)) desc, lower(r.username_value), r.account_id
  limit 20;
end;
$$;

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
  select
    a.user_id::uuid,
    coalesce(nullif(btrim(p.username::text), ''), nullif(btrim(u.raw_user_meta_data ->> 'username'), ''), 'user-' || left(a.user_id::text, 8))::text,
    coalesce(nullif(btrim(p.display_name::text), ''), nullif(btrim(u.raw_user_meta_data ->> 'display_name'), ''), nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''), '')::text,
    a.role::text,
    a.active::boolean,
    a.created_at::timestamptz
  from public.storyboard_admins a
  left join auth.users u on u.id = a.user_id
  left join public.profiles p on p.id = a.user_id
  where a.active
  order by (a.role = 'superadmin') desc, lower(coalesce(p.username::text, u.raw_user_meta_data ->> 'username', ''));
end;
$$;

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
  select distinct
    p.id::uuid,
    p.owner_id::uuid,
    p.name::text,
    p.aspect::text,
    p.style::text,
    coalesce(p.folder::text, 'General')::text,
    p.updated_at::timestamptz,
    (case when p.owner_id = p_user_id then 'owner' else 'shared' end)::text
  from public.projects p
  left join public.project_members pm on pm.project_id = p.id and pm.user_id = p_user_id
  where p.owner_id = p_user_id or pm.user_id = p_user_id
  order by p.updated_at desc;
end;
$$;

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
  if not public.storyboard_is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  return query
  select
    l.id::bigint,
    ap.username::text,
    tp.username::text,
    pr.name::text,
    l.action::text,
    l.details::jsonb,
    l.created_at::timestamptz
  from public.storyboard_admin_audit_log l
  left join public.profiles ap on ap.id = l.admin_id
  left join public.profiles tp on tp.id = l.target_user_id
  left join public.projects pr on pr.id = l.project_id
  order by l.created_at desc
  limit greatest(1, least(coalesce(p_limit, 40), 100));
end;
$$;

revoke all on function public.storyboard_admin_list_users(text, integer, integer) from public;
revoke all on function public.storyboard_admin_search_users(text) from public;
revoke all on function public.storyboard_admin_list_admins() from public;
revoke all on function public.storyboard_admin_list_user_projects(uuid) from public;
revoke all on function public.storyboard_admin_recent_activity(integer) from public;

grant execute on function public.storyboard_admin_list_users(text, integer, integer) to authenticated;
grant execute on function public.storyboard_admin_search_users(text) to authenticated;
grant execute on function public.storyboard_admin_list_admins() to authenticated;
grant execute on function public.storyboard_admin_list_user_projects(uuid) to authenticated;
grant execute on function public.storyboard_admin_recent_activity(integer) to authenticated;

notify pgrst, 'reload schema';

commit;
