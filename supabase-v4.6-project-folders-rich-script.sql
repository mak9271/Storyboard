-- Storyboard Shot Builder v4.6.0
-- Per-user project folders plus persistent Script direction and bold formatting.
-- Supabase SQL Editor query name:
-- Storyboard v4.6 - Project Folders & Rich Script
-- Save this query: YES
-- Run after the saved v4.5 query. Safe to run again.
-- This migration does not delete projects, scenes, shots, images or scripts.

begin;

-- ---------------------------------------------------------------------------
-- 1. Real folders owned by each user. Assignments are per user, so a shared
-- project can be organized without changing the owner's folder organization.
-- General is represented by no assignment row.
-- ---------------------------------------------------------------------------

create table if not exists public.project_folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_folders_name_length
    check (char_length(btrim(name)) between 1 and 60),
  constraint project_folders_name_trimmed
    check (name = btrim(name))
);

create unique index if not exists project_folders_owner_name_uidx
  on public.project_folders(owner_id, lower(name));

create table if not exists public.project_folder_assignments (
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  project_id uuid not null
    references public.projects(id) on delete cascade,
  folder_id uuid not null
    references public.project_folders(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, project_id)
);

create index if not exists project_folder_assignments_folder_idx
  on public.project_folder_assignments(user_id, folder_id);

create or replace function public.storyboard_v46_can_access_project(
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
  ) then
    return true;
  end if;

  if p_user_id = auth.uid() then
    return public.storyboard_admin_has_project_access(p_project_id);
  end if;

  return false;
end;
$$;

revoke all on function public.storyboard_v46_can_access_project(uuid, uuid)
  from public, anon;
grant execute on function public.storyboard_v46_can_access_project(uuid, uuid)
  to authenticated;

-- Preserve the older text-folder organization for project owners. Empty and
-- General values intentionally remain unassigned.
insert into public.project_folders (owner_id, name)
select distinct p.owner_id, btrim(p.folder)
from public.projects p
where p.owner_id is not null
  and nullif(btrim(coalesce(p.folder, '')), '') is not null
  and lower(btrim(p.folder)) <> 'general'
on conflict do nothing;

insert into public.project_folder_assignments (user_id, project_id, folder_id)
select p.owner_id, p.id, f.id
from public.projects p
join public.project_folders f
  on f.owner_id = p.owner_id
 and lower(f.name) = lower(btrim(p.folder))
where p.owner_id is not null
  and nullif(btrim(coalesce(p.folder, '')), '') is not null
  and lower(btrim(p.folder)) <> 'general'
on conflict (user_id, project_id) do nothing;

create or replace function public.storyboard_validate_folder_assignment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or new.user_id <> auth.uid() then
    raise exception 'FOLDER_ASSIGNMENT_USER_MISMATCH' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.project_folders f
    where f.id = new.folder_id
      and f.owner_id = new.user_id
  ) then
    raise exception 'FOLDER_NOT_OWNED_BY_USER' using errcode = '23514';
  end if;

  if not public.storyboard_v46_can_access_project(new.project_id, new.user_id) then
    raise exception 'PROJECT_ACCESS_REQUIRED' using errcode = '42501';
  end if;

  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.storyboard_validate_folder_assignment()
  from public, anon, authenticated;

drop trigger if exists storyboard_validate_folder_assignment_trigger
  on public.project_folder_assignments;
create trigger storyboard_validate_folder_assignment_trigger
before insert or update
on public.project_folder_assignments
for each row execute function public.storyboard_validate_folder_assignment();

create or replace function public.storyboard_touch_project_folder()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.name = btrim(regexp_replace(new.name, '\s+', ' ', 'g'));
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists storyboard_touch_project_folder_trigger
  on public.project_folders;
create trigger storyboard_touch_project_folder_trigger
before insert or update of name
on public.project_folders
for each row execute function public.storyboard_touch_project_folder();

alter table public.project_folders enable row level security;
alter table public.project_folder_assignments enable row level security;

drop policy if exists "storyboard users view own folders"
  on public.project_folders;
create policy "storyboard users view own folders"
on public.project_folders for select to authenticated
using (owner_id = auth.uid());

drop policy if exists "storyboard users create own folders"
  on public.project_folders;
create policy "storyboard users create own folders"
on public.project_folders for insert to authenticated
with check (owner_id = auth.uid());

drop policy if exists "storyboard users update own folders"
  on public.project_folders;
create policy "storyboard users update own folders"
on public.project_folders for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "storyboard users delete own folders"
  on public.project_folders;
create policy "storyboard users delete own folders"
on public.project_folders for delete to authenticated
using (owner_id = auth.uid());

drop policy if exists "storyboard users view own folder assignments"
  on public.project_folder_assignments;
create policy "storyboard users view own folder assignments"
on public.project_folder_assignments for select to authenticated
using (
  user_id = auth.uid()
  and public.storyboard_v46_can_access_project(project_id, user_id)
);

drop policy if exists "storyboard users create own folder assignments"
  on public.project_folder_assignments;
create policy "storyboard users create own folder assignments"
on public.project_folder_assignments for insert to authenticated
with check (
  user_id = auth.uid()
  and public.storyboard_v46_can_access_project(project_id, user_id)
  and exists (
    select 1 from public.project_folders f
    where f.id = folder_id and f.owner_id = auth.uid()
  )
);

drop policy if exists "storyboard users update own folder assignments"
  on public.project_folder_assignments;
create policy "storyboard users update own folder assignments"
on public.project_folder_assignments for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and public.storyboard_v46_can_access_project(project_id, user_id)
  and exists (
    select 1 from public.project_folders f
    where f.id = folder_id and f.owner_id = auth.uid()
  )
);

drop policy if exists "storyboard users delete own folder assignments"
  on public.project_folder_assignments;
create policy "storyboard users delete own folder assignments"
on public.project_folder_assignments for delete to authenticated
using (user_id = auth.uid());

grant select, insert, update, delete
  on public.project_folders, public.project_folder_assignments
  to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Script editor presentation. Plain content stays authoritative for AI and
-- exact shot offsets; sanitized HTML stores only the editor's bold markup.
-- ---------------------------------------------------------------------------

alter table public.project_scripts
  add column if not exists content_html text not null default '',
  add column if not exists text_direction text not null default 'ltr';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'project_scripts_content_html_limit'
      and conrelid = 'public.project_scripts'::regclass
  ) then
    alter table public.project_scripts
      add constraint project_scripts_content_html_limit
      check (octet_length(content_html) <= 1800000);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'project_scripts_text_direction_valid'
      and conrelid = 'public.project_scripts'::regclass
  ) then
    alter table public.project_scripts
      add constraint project_scripts_text_direction_valid
      check (text_direction in ('ltr', 'rtl'));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'project_folders'
  ) then
    alter publication supabase_realtime add table public.project_folders;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'project_folder_assignments'
  ) then
    alter publication supabase_realtime add table public.project_folder_assignments;
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
