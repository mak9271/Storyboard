-- Storyboard v5.1 — Spatial Bible & Lighting Studio
-- Supabase SQL Editor saved-query name:
-- Spatial Bible & Lighting Studio v5.1
-- Run once after supabase-v5.0-virtual-locations.sql.
-- Save this query: YES
-- Safe to run again. This migration is additive and does not delete project data.

begin;

-- A Bible location can point to the reusable 3D scan that defines its geometry.
alter table public.project_ai_locations
  add column if not exists location_scan_id uuid null;

alter table public.project_ai_locations
  add column if not exists spatial_reference_path text null;

-- A Bible character can keep a GLB/USDZ face scan plus an AI-readable render.
alter table public.project_ai_characters
  add column if not exists face_scan_path text null;

alter table public.project_ai_characters
  add column if not exists face_scan_format text null;

alter table public.project_ai_characters
  add column if not exists face_scan_metadata jsonb not null default '{}'::jsonb;

alter table public.project_ai_characters
  add column if not exists spatial_reference_path text null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'project_ai_locations_location_scan_id_fkey'
      and conrelid = 'public.project_ai_locations'::regclass
  ) then
    alter table public.project_ai_locations
      add constraint project_ai_locations_location_scan_id_fkey
      foreign key (location_scan_id)
      references public.location_scans(id)
      on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'project_ai_characters_face_scan_format_check'
      and conrelid = 'public.project_ai_characters'::regclass
  ) then
    alter table public.project_ai_characters
      add constraint project_ai_characters_face_scan_format_check
      check (
        (face_scan_path is null and face_scan_format is null)
        or (face_scan_path is not null and face_scan_format in ('glb', 'usdz'))
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'project_ai_characters_face_scan_path_scope'
      and conrelid = 'public.project_ai_characters'::regclass
  ) then
    alter table public.project_ai_characters
      add constraint project_ai_characters_face_scan_path_scope
      check (
        face_scan_path is null
        or face_scan_path like project_id::text || '/ai/characters/%'
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'project_ai_characters_spatial_reference_scope'
      and conrelid = 'public.project_ai_characters'::regclass
  ) then
    alter table public.project_ai_characters
      add constraint project_ai_characters_spatial_reference_scope
      check (
        spatial_reference_path is null
        or spatial_reference_path like project_id::text || '/ai/characters/%'
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'project_ai_locations_spatial_reference_scope'
      and conrelid = 'public.project_ai_locations'::regclass
  ) then
    alter table public.project_ai_locations
      add constraint project_ai_locations_spatial_reference_scope
      check (
        spatial_reference_path is null
        or spatial_reference_path like project_id::text || '/ai/locations/%'
      );
  end if;
end;
$$;

create unique index if not exists project_ai_characters_face_scan_path_uidx
  on public.project_ai_characters(face_scan_path)
  where face_scan_path is not null;

create unique index if not exists project_ai_characters_spatial_reference_uidx
  on public.project_ai_characters(spatial_reference_path)
  where spatial_reference_path is not null;

create unique index if not exists project_ai_locations_spatial_reference_uidx
  on public.project_ai_locations(spatial_reference_path)
  where spatial_reference_path is not null;

create index if not exists project_ai_locations_location_scan_idx
  on public.project_ai_locations(location_scan_id)
  where location_scan_id is not null;

-- Prevent a Bible record from linking to a scan owned by another project.
create or replace function public.storyboard_v51_keep_location_scan_in_project()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.location_scan_id is not null and not exists (
    select 1
    from public.location_scans ls
    where ls.id = new.location_scan_id
      and ls.project_id = new.project_id
  ) then
    raise exception 'LOCATION_SCAN_PROJECT_MISMATCH'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists project_ai_locations_keep_scan_scope
  on public.project_ai_locations;
create trigger project_ai_locations_keep_scan_scope
before insert or update of project_id, location_scan_id
on public.project_ai_locations
for each row execute function public.storyboard_v51_keep_location_scan_in_project();

grant select, insert, update, delete
  on public.project_ai_characters, public.project_ai_locations
  to authenticated;

-- Restrict the new 3D face and spatial-render files to project members. The
-- first path segment is always the project UUID and the second must be "ai".
create or replace function public.storyboard_v51_spatial_storage_project(
  p_bucket_id text,
  p_object_name text
)
returns uuid
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  v_project text;
begin
  if p_bucket_id <> 'storyboards'
     or split_part(p_object_name, '/', 2) <> 'ai'
     or split_part(p_object_name, '/', 3) not in ('characters', 'locations') then
    return null;
  end if;

  v_project := split_part(p_object_name, '/', 1);
  begin
    return v_project::uuid;
  exception when invalid_text_representation then
    return null;
  end;
end;
$$;

revoke all on function public.storyboard_v51_spatial_storage_project(text, text)
  from public, anon;
grant execute on function public.storyboard_v51_spatial_storage_project(text, text)
  to authenticated;

drop policy if exists "storyboard v5.1 users read spatial bible files"
  on storage.objects;
create policy "storyboard v5.1 users read spatial bible files"
on storage.objects for select to authenticated
using (
  public.storyboard_ai_can_view(
    public.storyboard_v51_spatial_storage_project(bucket_id, name)
  )
);

drop policy if exists "storyboard v5.1 editors create spatial bible files"
  on storage.objects;
create policy "storyboard v5.1 editors create spatial bible files"
on storage.objects for insert to authenticated
with check (
  public.storyboard_ai_can_manage_media(
    public.storyboard_v51_spatial_storage_project(bucket_id, name)
  )
);

drop policy if exists "storyboard v5.1 editors update spatial bible files"
  on storage.objects;
create policy "storyboard v5.1 editors update spatial bible files"
on storage.objects for update to authenticated
using (
  public.storyboard_ai_can_manage_media(
    public.storyboard_v51_spatial_storage_project(bucket_id, name)
  )
)
with check (
  public.storyboard_ai_can_manage_media(
    public.storyboard_v51_spatial_storage_project(bucket_id, name)
  )
);

drop policy if exists "storyboard v5.1 editors delete spatial bible files"
  on storage.objects;
create policy "storyboard v5.1 editors delete spatial bible files"
on storage.objects for delete to authenticated
using (
  public.storyboard_ai_can_manage_media(
    public.storyboard_v51_spatial_storage_project(bucket_id, name)
  )
);

notify pgrst, 'reload schema';

commit;
