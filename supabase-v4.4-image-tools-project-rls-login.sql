-- Storyboard Shot Builder v4.4.0
-- Image crop/source support, project creation RLS repair, and reliable username login.
-- Supabase SQL Editor query name:
-- Storyboard v4.4 - Image Tools, Project RLS & Login Reliability
-- Save this query: YES
-- Safe to run again. It does not delete projects, users, references, scores, or login rows.

begin;

-- ---------------------------------------------------------------------------
-- 1. Separate source images for Visual Bible characters and locations.
-- ---------------------------------------------------------------------------

alter table public.project_ai_characters
  add column if not exists source_path text;

alter table public.project_ai_locations
  add column if not exists source_path text;

create unique index if not exists project_ai_characters_source_path_uidx
  on public.project_ai_characters(source_path)
  where source_path is not null;

create unique index if not exists project_ai_locations_source_path_uidx
  on public.project_ai_locations(source_path)
  where source_path is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'project_ai_characters_source_path_scope'
      and conrelid = 'public.project_ai_characters'::regclass
  ) then
    alter table public.project_ai_characters
      add constraint project_ai_characters_source_path_scope
      check (
        source_path is null
        or source_path like project_id::text || '/ai/characters/%'
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'project_ai_locations_source_path_scope'
      and conrelid = 'public.project_ai_locations'::regclass
  ) then
    alter table public.project_ai_locations
      add constraint project_ai_locations_source_path_scope
      check (
        source_path is null
        or source_path like project_id::text || '/ai/locations/%'
      );
  end if;
end;
$$;

grant select, insert, update, delete
  on public.project_ai_characters, public.project_ai_locations
  to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Restore explicit owner policies needed to create and read a new project.
-- Existing member and temporary admin-support policies remain in place.
-- ---------------------------------------------------------------------------

alter table public.projects enable row level security;
alter table public.scenes enable row level security;
alter table public.shots enable row level security;

drop policy if exists "storyboard v4.4 owners select projects" on public.projects;
create policy "storyboard v4.4 owners select projects"
on public.projects for select to authenticated
using (owner_id = auth.uid());

drop policy if exists "storyboard v4.4 owners insert projects" on public.projects;
create policy "storyboard v4.4 owners insert projects"
on public.projects for insert to authenticated
with check (owner_id = auth.uid());

drop policy if exists "storyboard v4.4 owners update projects" on public.projects;
create policy "storyboard v4.4 owners update projects"
on public.projects for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "storyboard v4.4 owners delete projects" on public.projects;
create policy "storyboard v4.4 owners delete projects"
on public.projects for delete to authenticated
using (owner_id = auth.uid());

drop policy if exists "storyboard v4.4 owners manage scenes" on public.scenes;
create policy "storyboard v4.4 owners manage scenes"
on public.scenes for all to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = scenes.project_id and p.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.projects p
    where p.id = scenes.project_id and p.owner_id = auth.uid()
  )
);

drop policy if exists "storyboard v4.4 owners manage shots" on public.shots;
create policy "storyboard v4.4 owners manage shots"
on public.shots for all to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = shots.project_id and p.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.projects p
    where p.id = shots.project_id and p.owner_id = auth.uid()
  )
);

grant select, insert, update, delete
  on public.projects, public.scenes, public.shots
  to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Atomic rate limiting for the public username-login Edge Function.
-- Only service_role can call these functions.
-- ---------------------------------------------------------------------------

create table if not exists public.auth_login_rate_limits (
  key_hash text primary key,
  attempts integer not null default 0,
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz null,
  updated_at timestamptz not null default now()
);

alter table public.auth_login_rate_limits enable row level security;
revoke all on table public.auth_login_rate_limits from public, anon, authenticated;

create or replace function public.consume_username_login_attempt(p_key_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.auth_login_rate_limits%rowtype;
  v_now timestamptz := now();
  v_attempts integer;
begin
  if p_key_hash is null
     or char_length(p_key_hash) < 16
     or char_length(p_key_hash) > 200 then
    raise exception 'INVALID_RATE_LIMIT_KEY';
  end if;

  insert into public.auth_login_rate_limits (
    key_hash, attempts, window_started_at, blocked_until, updated_at
  ) values (
    p_key_hash, 0, v_now, null, v_now
  )
  on conflict (key_hash) do nothing;

  select *
    into v_row
  from public.auth_login_rate_limits
  where key_hash = p_key_hash
  for update;

  if v_row.blocked_until is not null and v_row.blocked_until > v_now then
    return jsonb_build_object(
      'allowed', false,
      'retry_after', greatest(
        1,
        ceil(extract(epoch from (v_row.blocked_until - v_now)))::integer
      )
    );
  end if;

  if v_row.window_started_at < v_now - interval '15 minutes'
     or (v_row.blocked_until is not null and v_row.blocked_until <= v_now) then
    update public.auth_login_rate_limits
    set attempts = 1,
        window_started_at = v_now,
        blocked_until = null,
        updated_at = v_now
    where key_hash = p_key_hash;

    return jsonb_build_object('allowed', true, 'retry_after', 0);
  end if;

  v_attempts := v_row.attempts + 1;

  if v_attempts > 8 then
    update public.auth_login_rate_limits
    set attempts = v_attempts,
        blocked_until = v_now + interval '15 minutes',
        updated_at = v_now
    where key_hash = p_key_hash;

    return jsonb_build_object('allowed', false, 'retry_after', 900);
  end if;

  update public.auth_login_rate_limits
  set attempts = v_attempts,
      updated_at = v_now
  where key_hash = p_key_hash;

  return jsonb_build_object('allowed', true, 'retry_after', 0);
end;
$$;

create or replace function public.clear_username_login_attempt(p_key_hash text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.auth_login_rate_limits
  where key_hash = p_key_hash;
$$;

revoke all on function public.consume_username_login_attempt(text)
  from public, anon, authenticated;
revoke all on function public.clear_username_login_attempt(text)
  from public, anon, authenticated;
grant execute on function public.consume_username_login_attempt(text)
  to service_role;
grant execute on function public.clear_username_login_attempt(text)
  to service_role;

notify pgrst, 'reload schema';

commit;
