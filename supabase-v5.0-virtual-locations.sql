-- Storyboard v5.0 — Virtual Location scans for Lighting Diagram
-- Run once after supabase-v4.8-lighting-access-repair.sql.
-- Save this query: YES

begin;

create table if not exists public.location_scans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null
    references public.projects(id) on delete cascade,
  created_by uuid default auth.uid()
    references auth.users(id) on delete set null,
  name text not null default 'Virtual Location',
  model_path text not null,
  file_name text not null,
  format text not null
    check (format in ('glb', 'usdz')),
  size_bytes bigint not null default 0
    check (size_bytes >= 0),
  captured_with text not null default 'import',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint location_scans_model_path_scope
    check (model_path like project_id::text || '/virtual-locations/%')
);

create index if not exists location_scans_project_updated_idx
  on public.location_scans(project_id, updated_at desc);

alter table public.lighting_diagrams
  add column if not exists location_scan_id uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'lighting_diagrams_location_scan_id_fkey'
      and conrelid = 'public.lighting_diagrams'::regclass
  ) then
    alter table public.lighting_diagrams
      add constraint lighting_diagrams_location_scan_id_fkey
      foreign key (location_scan_id)
      references public.location_scans(id)
      on delete set null;
  end if;
end;
$$;

create index if not exists lighting_diagrams_location_scan_idx
  on public.lighting_diagrams(location_scan_id)
  where location_scan_id is not null;

alter table public.location_scans enable row level security;

drop policy if exists "storyboard v5 users view location scans"
  on public.location_scans;
create policy "storyboard v5 users view location scans"
on public.location_scans for select to authenticated
using (
  public.storyboard_v48_can_access_project(project_id, auth.uid())
);

drop policy if exists "storyboard v5 editors create location scans"
  on public.location_scans;
create policy "storyboard v5 editors create location scans"
on public.location_scans for insert to authenticated
with check (
  created_by = auth.uid()
  and public.storyboard_v48_can_edit_project(project_id, auth.uid())
);

drop policy if exists "storyboard v5 editors update location scans"
  on public.location_scans;
create policy "storyboard v5 editors update location scans"
on public.location_scans for update to authenticated
using (
  public.storyboard_v48_can_edit_project(project_id, auth.uid())
)
with check (
  public.storyboard_v48_can_edit_project(project_id, auth.uid())
);

drop policy if exists "storyboard v5 editors delete location scans"
  on public.location_scans;
create policy "storyboard v5 editors delete location scans"
on public.location_scans for delete to authenticated
using (
  public.storyboard_v48_can_edit_project(project_id, auth.uid())
);

grant select, insert, update, delete
  on public.location_scans
  to authenticated;

-- Parse only Storyboard's dedicated virtual-location object paths. Returning
-- NULL for every other object keeps these policies isolated from existing
-- image and Bible media policies.
create or replace function public.storyboard_v50_location_storage_project(
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
     or split_part(p_object_name, '/', 2) <> 'virtual-locations' then
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

revoke all on function public.storyboard_v50_location_storage_project(text, text)
  from public, anon;
grant execute on function public.storyboard_v50_location_storage_project(text, text)
  to authenticated;

drop policy if exists "storyboard v5 users read virtual location files"
  on storage.objects;
create policy "storyboard v5 users read virtual location files"
on storage.objects for select to authenticated
using (
  public.storyboard_v48_can_access_project(
    public.storyboard_v50_location_storage_project(bucket_id, name),
    auth.uid()
  )
);

drop policy if exists "storyboard v5 editors create virtual location files"
  on storage.objects;
create policy "storyboard v5 editors create virtual location files"
on storage.objects for insert to authenticated
with check (
  public.storyboard_v48_can_edit_project(
    public.storyboard_v50_location_storage_project(bucket_id, name),
    auth.uid()
  )
);

drop policy if exists "storyboard v5 editors update virtual location files"
  on storage.objects;
create policy "storyboard v5 editors update virtual location files"
on storage.objects for update to authenticated
using (
  public.storyboard_v48_can_edit_project(
    public.storyboard_v50_location_storage_project(bucket_id, name),
    auth.uid()
  )
)
with check (
  public.storyboard_v48_can_edit_project(
    public.storyboard_v50_location_storage_project(bucket_id, name),
    auth.uid()
  )
);

drop policy if exists "storyboard v5 editors delete virtual location files"
  on storage.objects;
create policy "storyboard v5 editors delete virtual location files"
on storage.objects for delete to authenticated
using (
  public.storyboard_v48_can_edit_project(
    public.storyboard_v50_location_storage_project(bucket_id, name),
    auth.uid()
  )
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'location_scans'
  ) then
    alter publication supabase_realtime
      add table public.location_scans;
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
