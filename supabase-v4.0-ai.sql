-- Storyboard Shot Builder v4.0.0
-- AI Visual Bible, continuity references and atomic daily quota.
-- Run once in Supabase SQL Editor after the v3.9 security migration.

begin;

create or replace function public.storyboard_ai_can_view(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and (
    exists (
      select 1 from public.projects p
      where p.id = p_project_id and p.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.project_members pm
      where pm.project_id = p_project_id and pm.user_id = auth.uid()
    )
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
    exists (
      select 1 from public.projects p
      where p.id = p_project_id and p.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.project_members pm
      where pm.project_id = p_project_id
        and pm.user_id = auth.uid()
        and coalesce(pm.permissions, '{}'::jsonb) @> '{"media": true}'::jsonb
    )
  );
$$;

revoke all on function public.storyboard_ai_can_view(uuid) from public;
revoke all on function public.storyboard_ai_can_manage_media(uuid) from public;
grant execute on function public.storyboard_ai_can_view(uuid) to authenticated;
grant execute on function public.storyboard_ai_can_manage_media(uuid) to authenticated;

create table if not exists public.project_ai_characters (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text not null check (char_length(btrim(description)) between 1 and 2000),
  reference_path text unique,
  style_snapshot text,
  locked boolean not null default false,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_ai_characters_locked_reference check (not locked or (reference_path is not null and nullif(btrim(style_snapshot), '') is not null)),
  constraint project_ai_characters_path_scope check (reference_path is null or reference_path like project_id::text || '/ai/characters/%')
);

create table if not exists public.project_ai_locations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text not null check (char_length(btrim(description)) between 1 and 2400),
  reference_path text unique,
  style_snapshot text,
  locked boolean not null default false,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_ai_locations_locked_reference check (not locked or (reference_path is not null and nullif(btrim(style_snapshot), '') is not null)),
  constraint project_ai_locations_path_scope check (reference_path is null or reference_path like project_id::text || '/ai/locations/%')
);

alter table public.project_ai_characters add column if not exists style_snapshot text;
alter table public.project_ai_locations add column if not exists style_snapshot text;

create index if not exists project_ai_characters_project_idx on public.project_ai_characters(project_id, created_at);
create index if not exists project_ai_locations_project_idx on public.project_ai_locations(project_id, created_at);

alter table public.project_ai_characters enable row level security;
alter table public.project_ai_locations enable row level security;

drop policy if exists "ai characters visible to project members" on public.project_ai_characters;
create policy "ai characters visible to project members"
on public.project_ai_characters for select to authenticated
using (public.storyboard_ai_can_view(project_id));

drop policy if exists "ai characters writable with media permission" on public.project_ai_characters;
create policy "ai characters writable with media permission"
on public.project_ai_characters for insert to authenticated
with check (public.storyboard_ai_can_manage_media(project_id) and created_by = auth.uid());

drop policy if exists "ai characters editable with media permission" on public.project_ai_characters;
create policy "ai characters editable with media permission"
on public.project_ai_characters for update to authenticated
using (public.storyboard_ai_can_manage_media(project_id))
with check (public.storyboard_ai_can_manage_media(project_id));

drop policy if exists "ai characters deletable with media permission" on public.project_ai_characters;
create policy "ai characters deletable with media permission"
on public.project_ai_characters for delete to authenticated
using (public.storyboard_ai_can_manage_media(project_id));

drop policy if exists "ai locations visible to project members" on public.project_ai_locations;
create policy "ai locations visible to project members"
on public.project_ai_locations for select to authenticated
using (public.storyboard_ai_can_view(project_id));

drop policy if exists "ai locations writable with media permission" on public.project_ai_locations;
create policy "ai locations writable with media permission"
on public.project_ai_locations for insert to authenticated
with check (public.storyboard_ai_can_manage_media(project_id) and created_by = auth.uid());

drop policy if exists "ai locations editable with media permission" on public.project_ai_locations;
create policy "ai locations editable with media permission"
on public.project_ai_locations for update to authenticated
using (public.storyboard_ai_can_manage_media(project_id))
with check (public.storyboard_ai_can_manage_media(project_id));

drop policy if exists "ai locations deletable with media permission" on public.project_ai_locations;
create policy "ai locations deletable with media permission"
on public.project_ai_locations for delete to authenticated
using (public.storyboard_ai_can_manage_media(project_id));

grant select, insert, update, delete on public.project_ai_characters to authenticated;
grant select, insert, update, delete on public.project_ai_locations to authenticated;

create or replace function public.storyboard_ai_touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.storyboard_ai_keep_asset_scope()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.project_id is distinct from old.project_id or new.created_by is distinct from old.created_by then
    raise exception 'AI_ASSET_SCOPE_IS_IMMUTABLE' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists project_ai_characters_keep_scope on public.project_ai_characters;
create trigger project_ai_characters_keep_scope
before update on public.project_ai_characters
for each row execute function public.storyboard_ai_keep_asset_scope();

drop trigger if exists project_ai_locations_keep_scope on public.project_ai_locations;
create trigger project_ai_locations_keep_scope
before update on public.project_ai_locations
for each row execute function public.storyboard_ai_keep_asset_scope();

drop trigger if exists project_ai_characters_touch_updated_at on public.project_ai_characters;
create trigger project_ai_characters_touch_updated_at
before update on public.project_ai_characters
for each row execute function public.storyboard_ai_touch_updated_at();

drop trigger if exists project_ai_locations_touch_updated_at on public.project_ai_locations;
create trigger project_ai_locations_touch_updated_at
before update on public.project_ai_locations
for each row execute function public.storyboard_ai_touch_updated_at();

create table if not exists public.ai_generation_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  attempts integer not null default 0 check (attempts >= 0),
  last_project_id uuid references public.projects(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

alter table public.ai_generation_usage enable row level security;
drop policy if exists "users see their own ai usage" on public.ai_generation_usage;
create policy "users see their own ai usage"
on public.ai_generation_usage for select to authenticated
using (user_id = auth.uid());

revoke all on public.ai_generation_usage from anon, authenticated;
grant select on public.ai_generation_usage to authenticated;

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
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if not public.storyboard_ai_can_manage_media(p_project_id) then
    raise exception 'MEDIA_PERMISSION_REQUIRED' using errcode = '42501';
  end if;

  -- One lock makes the account-wide free-tier guard atomic across all users.
  perform pg_advisory_xact_lock(40000001);

  select coalesce(sum(u.attempts), 0)::integer into v_global_used
  from public.ai_generation_usage u
  where u.usage_date = v_today;

  select coalesce(u.attempts, 0) into v_used
  from public.ai_generation_usage u
  where u.user_id = v_user_id and u.usage_date = v_today;

  if v_used >= v_daily_limit or v_global_used >= v_global_limit then
    return query select false, v_used,
      greatest(v_daily_limit - v_used, 0),
      greatest(v_global_limit - v_global_used, 0),
      v_daily_limit;
    return;
  end if;

  insert into public.ai_generation_usage(user_id, usage_date, attempts, last_project_id, updated_at)
  values (v_user_id, v_today, 1, p_project_id, now())
  on conflict (user_id, usage_date) do update
    set attempts = public.ai_generation_usage.attempts + 1,
        last_project_id = excluded.last_project_id,
        updated_at = now()
  returning attempts into v_used;

  return query select true, v_used,
    greatest(v_daily_limit - v_used, 0),
    greatest(v_global_limit - (v_global_used + 1), 0),
    v_daily_limit;
end;
$$;

revoke all on function public.reserve_ai_generation(uuid) from public;
grant execute on function public.reserve_ai_generation(uuid) to authenticated;

-- Remove stale JSON links from shots if a Visual Bible item is deleted.
create or replace function public.storyboard_ai_unlink_deleted_asset()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_table_name = 'project_ai_characters' then
    update public.shots s
    set data = jsonb_set(
      coalesce(s.data, '{}'::jsonb),
      '{aiCharacterIds}',
      coalesce((
        select jsonb_agg(item.value)
        from jsonb_array_elements_text(coalesce(s.data->'aiCharacterIds', '[]'::jsonb)) as item(value)
        where item.value <> old.id::text
      ), '[]'::jsonb),
      true
    ),
    version = coalesce(s.version, 1) + 1
    where s.project_id = old.project_id
      and coalesce(s.data->'aiCharacterIds', '[]'::jsonb) ? old.id::text;
  else
    update public.shots s
    set data = jsonb_set(coalesce(s.data, '{}'::jsonb), '{aiLocationId}', '""'::jsonb, true),
        version = coalesce(s.version, 1) + 1
    where s.project_id = old.project_id
      and s.data->>'aiLocationId' = old.id::text;
  end if;
  return old;
end;
$$;

drop trigger if exists project_ai_characters_unlink_shots on public.project_ai_characters;
create trigger project_ai_characters_unlink_shots
after delete on public.project_ai_characters
for each row execute function public.storyboard_ai_unlink_deleted_asset();

drop trigger if exists project_ai_locations_unlink_shots on public.project_ai_locations;
create trigger project_ai_locations_unlink_shots
after delete on public.project_ai_locations
for each row execute function public.storyboard_ai_unlink_deleted_asset();

-- Add Visual Bible tables to Realtime once. Existing projects/scenes/shots stay unchanged.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'project_ai_characters'
  ) then
    alter publication supabase_realtime add table public.project_ai_characters;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'project_ai_locations'
  ) then
    alter publication supabase_realtime add table public.project_ai_locations;
  end if;
end;
$$;

commit;
