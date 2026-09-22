-- Storyboard Shot Builder v4.5.0
-- Bible script import, AI scene breakdown, scene time/location settings,
-- and arbitrary script-range links to storyboard shots.
-- Supabase SQL Editor query name:
-- Storyboard v4.5 - Bible Script & Scene Breakdown
-- Save this query: YES
-- Run after all saved v4.4 queries. Safe to run again.
-- This migration does not delete projects, scenes, shots, references, or media.

begin;

-- ---------------------------------------------------------------------------
-- 1. Scene-level story/shooting information and Bible assignments.
-- ---------------------------------------------------------------------------

alter table public.scenes
  add column if not exists story_location text not null default '',
  add column if not exists story_time text not null default 'Unspecified',
  add column if not exists shoot_time text not null default 'Unspecified',
  add column if not exists time_strategy text not null default 'natural',
  add column if not exists ai_location_id uuid null
    references public.project_ai_locations(id) on delete set null,
  add column if not exists ai_character_ids uuid[] not null default '{}'::uuid[],
  add column if not exists script_scene_key text null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'storyboard_scene_story_time_valid'
      and conrelid = 'public.scenes'::regclass
  ) then
    alter table public.scenes
      add constraint storyboard_scene_story_time_valid
      check (story_time in ('Unspecified','Dawn','Morning','Day','Sunset','Twilight','Night'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'storyboard_scene_shoot_time_valid'
      and conrelid = 'public.scenes'::regclass
  ) then
    alter table public.scenes
      add constraint storyboard_scene_shoot_time_valid
      check (shoot_time in ('Unspecified','Dawn','Morning','Day','Sunset','Twilight','Night'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'storyboard_scene_time_strategy_valid'
      and conrelid = 'public.scenes'::regclass
  ) then
    alter table public.scenes
      add constraint storyboard_scene_time_strategy_valid
      check (time_strategy in ('natural','day_for_night','night_for_day'));
  end if;
end;
$$;

create unique index if not exists scenes_project_script_key_uidx
  on public.scenes(project_id, script_scene_key);

create or replace function public.storyboard_validate_scene_bible_links()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_character_id uuid;
begin
  if new.ai_location_id is not null and not exists (
    select 1
    from public.project_ai_locations l
    where l.id = new.ai_location_id and l.project_id = new.project_id
  ) then
    raise exception 'SCENE_LOCATION_OUTSIDE_PROJECT' using errcode = '23514';
  end if;

  new.ai_character_ids := coalesce(
    (
      select array_agg(x.id order by x.first_seen)
      from (
        select id, min(ord) as first_seen
        from unnest(coalesce(new.ai_character_ids, '{}'::uuid[])) with ordinality as u(id, ord)
        group by id
      ) x
    ),
    '{}'::uuid[]
  );

  foreach v_character_id in array new.ai_character_ids loop
    if not exists (
      select 1
      from public.project_ai_characters c
      where c.id = v_character_id and c.project_id = new.project_id
    ) then
      raise exception 'SCENE_CHARACTER_OUTSIDE_PROJECT' using errcode = '23514';
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists storyboard_validate_scene_bible_links_trigger
  on public.scenes;
create trigger storyboard_validate_scene_bible_links_trigger
before insert or update of project_id, ai_location_id, ai_character_ids
on public.scenes
for each row execute function public.storyboard_validate_scene_bible_links();

-- ---------------------------------------------------------------------------
-- 2. One editable screenplay per project and exact text-range → shot links.
-- Offsets are zero-based Unicode-character positions and end_offset is
-- exclusive. The browser converts textarea UTF-16 positions before saving.
-- ---------------------------------------------------------------------------

create table if not exists public.project_scripts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique
    references public.projects(id) on delete cascade,
  created_by uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  file_name text not null default 'script.txt',
  file_type text not null default 'text/plain',
  content text not null default '',
  analysis jsonb null,
  analysis_model text null,
  analyzed_at timestamptz null,
  applied_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_scripts_file_name_length
    check (char_length(file_name) between 1 and 240),
  constraint project_scripts_content_limit
    check (octet_length(content) <= 900000),
  constraint project_scripts_analysis_object
    check (analysis is null or jsonb_typeof(analysis) = 'object')
);

create table if not exists public.script_shot_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null
    references public.projects(id) on delete cascade,
  script_id uuid not null
    references public.project_scripts(id) on delete cascade,
  scene_id uuid not null
    references public.scenes(id) on delete cascade,
  shot_id uuid not null
    references public.shots(id) on delete cascade,
  start_offset integer not null,
  end_offset integer not null,
  selected_text text not null default '',
  created_by uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint script_shot_links_range_valid
    check (start_offset >= 0 and end_offset > start_offset),
  constraint script_shot_links_excerpt_limit
    check (octet_length(selected_text) <= 16000),
  unique(script_id, shot_id, start_offset, end_offset)
);

create index if not exists script_shot_links_script_range_idx
  on public.script_shot_links(script_id, start_offset, end_offset);
create index if not exists script_shot_links_shot_idx
  on public.script_shot_links(shot_id);

create or replace function public.storyboard_script_can_edit(p_project_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    return false;
  end if;

  if exists (
    select 1 from public.projects p
    where p.id = p_project_id and p.owner_id = auth.uid()
  ) then
    return true;
  end if;

  if exists (
    select 1 from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = auth.uid()
      and (
        coalesce((pm.permissions ->> 'project_settings')::boolean, false)
        or coalesce((pm.permissions ->> 'scenes')::boolean, false)
        or coalesce((pm.permissions ->> 'shots')::boolean, false)
      )
  ) then
    return true;
  end if;

  return public.storyboard_admin_has_project_access(p_project_id);
end;
$$;

revoke all on function public.storyboard_script_can_edit(uuid) from public;
grant execute on function public.storyboard_script_can_edit(uuid) to authenticated;

create or replace function public.storyboard_touch_project_script()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.content is distinct from old.content then
    -- Exact offsets are meaningful only for the exact saved text. Clearing the
    -- links and old analysis in this same transaction prevents stale ranges.
    delete from public.script_shot_links where script_id = old.id;
    new.analysis := null;
    new.analysis_model := null;
    new.analyzed_at := null;
    new.applied_at := null;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.storyboard_touch_project_script() from public;

drop trigger if exists storyboard_touch_project_script_trigger
  on public.project_scripts;
create trigger storyboard_touch_project_script_trigger
before update on public.project_scripts
for each row execute function public.storyboard_touch_project_script();

create or replace function public.storyboard_validate_script_shot_link()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_script_project uuid;
  v_content text;
  v_shot_scene uuid;
begin
  select s.project_id, s.content
    into v_script_project, v_content
  from public.project_scripts s
  where s.id = new.script_id;

  if v_script_project is null or v_script_project <> new.project_id then
    raise exception 'SCRIPT_PROJECT_MISMATCH' using errcode = '23514';
  end if;

  select sh.scene_id into v_shot_scene
  from public.shots sh
  where sh.id = new.shot_id and sh.project_id = new.project_id;

  if v_shot_scene is null or v_shot_scene <> new.scene_id then
    raise exception 'SHOT_SCENE_MISMATCH' using errcode = '23514';
  end if;

  if not exists (
    select 1 from public.scenes sc
    where sc.id = new.scene_id and sc.project_id = new.project_id
  ) then
    raise exception 'SCENE_PROJECT_MISMATCH' using errcode = '23514';
  end if;

  if new.end_offset > char_length(v_content) then
    raise exception 'SCRIPT_RANGE_OUT_OF_BOUNDS' using errcode = '22023';
  end if;

  -- Keep only a compact preview; the authoritative range remains the two
  -- offsets against project_scripts.content.
  new.selected_text := left(
    substring(
      v_content from new.start_offset + 1 for new.end_offset - new.start_offset
    ),
    3000
  );
  return new;
end;
$$;

drop trigger if exists storyboard_validate_script_shot_link_trigger
  on public.script_shot_links;
create trigger storyboard_validate_script_shot_link_trigger
before insert or update
on public.script_shot_links
for each row execute function public.storyboard_validate_script_shot_link();

alter table public.project_scripts enable row level security;
alter table public.script_shot_links enable row level security;

drop policy if exists "storyboard project scripts visible" on public.project_scripts;
create policy "storyboard project scripts visible"
on public.project_scripts for select to authenticated
using (public.storyboard_ai_can_view(project_id));

drop policy if exists "storyboard project scripts insert" on public.project_scripts;
create policy "storyboard project scripts insert"
on public.project_scripts for insert to authenticated
with check (
  public.storyboard_script_can_edit(project_id)
  and created_by = auth.uid()
);

drop policy if exists "storyboard project scripts update" on public.project_scripts;
create policy "storyboard project scripts update"
on public.project_scripts for update to authenticated
using (public.storyboard_script_can_edit(project_id))
with check (public.storyboard_script_can_edit(project_id));

drop policy if exists "storyboard project scripts delete" on public.project_scripts;
create policy "storyboard project scripts delete"
on public.project_scripts for delete to authenticated
using (public.storyboard_script_can_edit(project_id));

drop policy if exists "storyboard script links visible" on public.script_shot_links;
create policy "storyboard script links visible"
on public.script_shot_links for select to authenticated
using (public.storyboard_ai_can_view(project_id));

drop policy if exists "storyboard script links insert" on public.script_shot_links;
create policy "storyboard script links insert"
on public.script_shot_links for insert to authenticated
with check (
  public.storyboard_script_can_edit(project_id)
  and created_by = auth.uid()
);

drop policy if exists "storyboard script links update" on public.script_shot_links;
create policy "storyboard script links update"
on public.script_shot_links for update to authenticated
using (public.storyboard_script_can_edit(project_id))
with check (public.storyboard_script_can_edit(project_id));

drop policy if exists "storyboard script links delete" on public.script_shot_links;
create policy "storyboard script links delete"
on public.script_shot_links for delete to authenticated
using (public.storyboard_script_can_edit(project_id));

grant select, insert, update, delete
  on public.project_scripts, public.script_shot_links
  to authenticated;

-- ---------------------------------------------------------------------------
-- 3. One conflict-aware RPC saves all Scene Settings in a single transaction.
-- ---------------------------------------------------------------------------

create or replace function public.storyboard_update_scene_v45(
  p_scene_id uuid,
  p_expected_version integer,
  p_title text,
  p_description text,
  p_story_location text,
  p_story_time text,
  p_shoot_time text,
  p_time_strategy text,
  p_ai_location_id uuid,
  p_ai_character_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_project_id uuid;
  v_version integer;
begin
  select project_id into v_project_id
  from public.scenes
  where id = p_scene_id;

  if v_project_id is null then
    raise exception 'SCENE_NOT_FOUND';
  end if;

  if not public.storyboard_script_can_edit(v_project_id) then
    raise exception 'SCENE_PERMISSION_REQUIRED' using errcode = '42501';
  end if;

  update public.scenes
  set title = coalesce(p_title, ''),
      description = coalesce(p_description, ''),
      story_location = coalesce(p_story_location, ''),
      story_time = coalesce(nullif(p_story_time, ''), 'Unspecified'),
      shoot_time = coalesce(nullif(p_shoot_time, ''), 'Unspecified'),
      time_strategy = coalesce(nullif(p_time_strategy, ''), 'natural'),
      ai_location_id = p_ai_location_id,
      ai_character_ids = coalesce(p_ai_character_ids, '{}'::uuid[]),
      version = coalesce(version, 1) + 1
  where id = p_scene_id
    and coalesce(version, 1) = coalesce(p_expected_version, 1)
  returning version into v_version;

  if v_version is null then
    raise exception 'EDIT_CONFLICT';
  end if;

  return v_version;
end;
$$;

revoke all on function public.storyboard_update_scene_v45(
  uuid, integer, text, text, text, text, text, text, uuid, uuid[]
) from public;
grant execute on function public.storyboard_update_scene_v45(
  uuid, integer, text, text, text, text, text, text, uuid, uuid[]
) to authenticated;

-- Realtime refreshes Bible/Script panels when collaborators update them.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'project_scripts'
  ) then
    alter publication supabase_realtime add table public.project_scripts;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'script_shot_links'
  ) then
    alter publication supabase_realtime add table public.script_shot_links;
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
