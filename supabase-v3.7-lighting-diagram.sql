-- Storyboard Shot Builder v3.7 — Lighting Diagram Workspace
-- Run once in Supabase SQL Editor. Safe to run again.

create or replace function public.can_access_storyboard_project(p_project_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    exists (
      select 1 from public.projects p
      where p.id = p_project_id and p.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.project_members m
      where m.project_id = p_project_id and m.user_id = auth.uid()
    );
$$;

revoke all on function public.can_access_storyboard_project(uuid) from public;
grant execute on function public.can_access_storyboard_project(uuid) to authenticated;


create or replace function public.can_edit_storyboard_project(p_project_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    exists (
      select 1 from public.projects p
      where p.id = p_project_id and p.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.project_members m
      where m.project_id = p_project_id
        and m.user_id = auth.uid()
        and (
          coalesce((m.permissions ->> 'shots')::boolean, false)
          or coalesce((m.permissions ->> 'project_settings')::boolean, false)
        )
    );
$$;

revoke all on function public.can_edit_storyboard_project(uuid) from public;
grant execute on function public.can_edit_storyboard_project(uuid) to authenticated;


create table if not exists public.lighting_diagrams (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  scene_id uuid null references public.scenes(id) on delete set null,
  shot_id uuid null references public.shots(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Lighting Diagram',
  data jsonb not null default
    '{"canvas":{"width":1200,"height":800,"metersPer100px":1},"objects":[],"notes":""}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lighting_diagrams_project_idx on public.lighting_diagrams(project_id);
create index if not exists lighting_diagrams_shot_idx on public.lighting_diagrams(shot_id);
create index if not exists lighting_diagrams_updated_idx on public.lighting_diagrams(project_id, updated_at desc);

alter table public.lighting_diagrams enable row level security;

drop policy if exists lighting_diagrams_select on public.lighting_diagrams;
create policy lighting_diagrams_select
on public.lighting_diagrams for select to authenticated
using (public.can_access_storyboard_project(project_id));

drop policy if exists lighting_diagrams_insert on public.lighting_diagrams;
create policy lighting_diagrams_insert
on public.lighting_diagrams for insert to authenticated
with check (
  created_by = auth.uid()
  and public.can_edit_storyboard_project(project_id)
);

drop policy if exists lighting_diagrams_update on public.lighting_diagrams;
create policy lighting_diagrams_update
on public.lighting_diagrams for update to authenticated
using (public.can_edit_storyboard_project(project_id))
with check (public.can_edit_storyboard_project(project_id));

drop policy if exists lighting_diagrams_delete on public.lighting_diagrams;
create policy lighting_diagrams_delete
on public.lighting_diagrams for delete to authenticated
using (public.can_edit_storyboard_project(project_id));

grant select, insert, update, delete on table public.lighting_diagrams to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'lighting_diagrams'
  ) then
    alter publication supabase_realtime add table public.lighting_diagrams;
  end if;
end $$;
