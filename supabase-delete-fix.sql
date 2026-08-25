-- Storyboard Shot Builder v3.5.1
-- Robust owner-only project deletion.
-- Run once in Supabase SQL Editor.

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
    select 1
    from public.projects
    where id = p_project_id
      and owner_id = auth.uid()
  ) then
    raise exception 'Project not found or you are not the owner.';
  end if;

  delete from public.projects
  where id = p_project_id
    and owner_id = auth.uid();
end;
$$;

revoke all on function public.delete_own_project(uuid) from public;
grant execute on function public.delete_own_project(uuid) to authenticated;

-- Also restore the normal DELETE policy for direct table deletes.
alter table public.projects enable row level security;

drop policy if exists projects_delete on public.projects;
create policy projects_delete
on public.projects
for delete
to authenticated
using ((select auth.uid()) = owner_id);
