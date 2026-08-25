-- Storyboard Shot Builder v3.5 — Production Management
-- Safe to run more than once.

alter table public.projects
  add column if not exists position integer default 0,
  add column if not exists is_favorite boolean default false,
  add column if not exists folder text default 'General',
  add column if not exists tags text[] default '{}',
  add column if not exists metadata jsonb default '{}'::jsonb;

alter table public.scenes
  add column if not exists collapsed boolean default false;

-- position already exists in the original v3 schema, but these are harmless if already present.
alter table public.scenes add column if not exists position integer default 1;
alter table public.shots add column if not exists position integer default 1;

create index if not exists projects_position_idx on public.projects(position);
create index if not exists projects_favorite_idx on public.projects(is_favorite);
create index if not exists scenes_position_idx on public.scenes(position);
create index if not exists shots_position_idx on public.shots(position);

-- Give existing owned projects a stable initial order without overwriting an existing order.
with numbered as (
  select id, row_number() over(partition by owner_id order by created_at asc) as new_position
  from public.projects
)
update public.projects p
set position = n.new_position
from numbered n
where p.id=n.id and coalesce(p.position,0)=0;

-- Re-assert the owner delete permission used by the dashboard.
alter table public.projects enable row level security;
drop policy if exists projects_delete on public.projects;
create policy projects_delete
on public.projects
for delete
to authenticated
using ((select auth.uid()) = owner_id);

grant select, insert, update, delete on table public.projects to authenticated;
grant select, insert, update, delete on table public.scenes to authenticated;
grant select, insert, update, delete on table public.shots to authenticated;

-- Explicit owner-only project deletion. Cascading foreign keys remove scenes, shots,
-- collaborators and invites. The application also removes known shot media first.
create or replace function public.delete_own_project(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  if not exists (
    select 1 from public.projects
    where id=p_project_id and owner_id=auth.uid()
  ) then
    raise exception 'Project not found or you are not the owner.';
  end if;

  delete from public.projects
  where id=p_project_id and owner_id=auth.uid();
end;
$$;

revoke all on function public.delete_own_project(uuid) from public;
grant execute on function public.delete_own_project(uuid) to authenticated;
