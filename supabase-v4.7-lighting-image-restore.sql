-- Storyboard Shot Builder v4.7.0
-- Restores Lighting Diagram persistence and keeps the pre-crop shot image.
-- Supabase SQL Editor query name:
-- Storyboard v4.7 - Lighting & Image Restore
-- Save this query: YES
-- Run after the saved v4.6 query. Safe to run again.
-- This migration does not delete projects, scenes, shots, images or diagrams.

begin;

-- ---------------------------------------------------------------------------
-- 1. Keep one pre-crop image path so a user can restore the original image.
-- Image binaries stay in the private storyboards Storage bucket.
-- ---------------------------------------------------------------------------

alter table public.shots
  add column if not exists original_image_path text;

create index if not exists shots_original_image_path_idx
  on public.shots(original_image_path)
  where original_image_path is not null;

grant select, insert, update, delete
  on public.shots
  to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Editing permission used by Lighting Diagram policies. Owners, members
-- with Shots or Project Settings permission, and an active admin support
-- session may edit. Other project members may still view diagrams.
-- ---------------------------------------------------------------------------

create or replace function public.storyboard_v47_can_edit_project(
  p_project_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if p_user_id is null then
    return false;
  end if;

  if exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and p.owner_id = p_user_id
  ) then
    return true;
  end if;

  if exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = p_user_id
      and (
        coalesce(pm.permissions ->> 'shots', 'false') = 'true'
        or coalesce(pm.permissions ->> 'project_settings', 'false') = 'true'
      )
  ) then
    return true;
  end if;

  if p_user_id = auth.uid() then
    return public.storyboard_admin_has_project_access(p_project_id);
  end if;

  return false;
end;
$$;

revoke all on function public.storyboard_v47_can_edit_project(uuid, uuid)
  from public, anon;
grant execute on function public.storyboard_v47_can_edit_project(uuid, uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Lighting Studio persistence from the last Lighting-enabled build.
-- ---------------------------------------------------------------------------

create table if not exists public.lighting_diagrams (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null
    references public.projects(id) on delete cascade,
  scene_id uuid null
    references public.scenes(id) on delete set null,
  shot_id uuid null
    references public.shots(id) on delete set null,
  created_by uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  name text not null default 'Lighting Diagram',
  data jsonb not null default
    '{"canvas":{"width":1200,"height":800,"metersPer100px":1},"objects":[],"notes":""}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lighting_diagrams_project_idx
  on public.lighting_diagrams(project_id);
create index if not exists lighting_diagrams_shot_idx
  on public.lighting_diagrams(shot_id);
create index if not exists lighting_diagrams_updated_idx
  on public.lighting_diagrams(project_id, updated_at desc);

alter table public.lighting_diagrams enable row level security;

-- Remove policy names used by the older standalone Lighting migration so the
-- restored table has one clear set of current policies.
drop policy if exists lighting_diagrams_select on public.lighting_diagrams;
drop policy if exists lighting_diagrams_insert on public.lighting_diagrams;
drop policy if exists lighting_diagrams_update on public.lighting_diagrams;
drop policy if exists lighting_diagrams_delete on public.lighting_diagrams;

drop policy if exists "storyboard v4.7 users view lighting diagrams"
  on public.lighting_diagrams;
create policy "storyboard v4.7 users view lighting diagrams"
on public.lighting_diagrams for select to authenticated
using (
  public.storyboard_v46_can_access_project(project_id, auth.uid())
);

drop policy if exists "storyboard v4.7 editors create lighting diagrams"
  on public.lighting_diagrams;
create policy "storyboard v4.7 editors create lighting diagrams"
on public.lighting_diagrams for insert to authenticated
with check (
  created_by = auth.uid()
  and public.storyboard_v47_can_edit_project(project_id, auth.uid())
);

drop policy if exists "storyboard v4.7 editors update lighting diagrams"
  on public.lighting_diagrams;
create policy "storyboard v4.7 editors update lighting diagrams"
on public.lighting_diagrams for update to authenticated
using (
  public.storyboard_v47_can_edit_project(project_id, auth.uid())
)
with check (
  public.storyboard_v47_can_edit_project(project_id, auth.uid())
);

drop policy if exists "storyboard v4.7 editors delete lighting diagrams"
  on public.lighting_diagrams;
create policy "storyboard v4.7 editors delete lighting diagrams"
on public.lighting_diagrams for delete to authenticated
using (
  public.storyboard_v47_can_edit_project(project_id, auth.uid())
);

grant select, insert, update, delete
  on public.lighting_diagrams
  to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'lighting_diagrams'
  ) then
    alter publication supabase_realtime
      add table public.lighting_diagrams;
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
