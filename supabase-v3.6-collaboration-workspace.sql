-- Storyboard Shot Builder v3.6 — Collaboration Chat
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
      where p.id = p_project_id
        and p.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.project_members m
      where m.project_id = p_project_id
        and m.user_id = auth.uid()
    );
$$;

revoke all on function public.can_access_storyboard_project(uuid) from public;
grant execute on function public.can_access_storyboard_project(uuid) to authenticated;

create table if not exists public.project_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  context_type text null,
  context_id uuid null,
  context_label text null,
  created_at timestamptz not null default now()
);

create index if not exists project_messages_project_created_idx
on public.project_messages(project_id, created_at);

alter table public.project_messages enable row level security;

drop policy if exists project_messages_select on public.project_messages;
create policy project_messages_select
on public.project_messages
for select
to authenticated
using (public.can_access_storyboard_project(project_id));

drop policy if exists project_messages_insert on public.project_messages;
create policy project_messages_insert
on public.project_messages
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.can_access_storyboard_project(project_id)
);

drop policy if exists project_messages_delete on public.project_messages;
create policy project_messages_delete
on public.project_messages
for delete
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = auth.uid()
  )
);

grant select, insert, delete on table public.project_messages to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'project_messages'
  ) then
    alter publication supabase_realtime add table public.project_messages;
  end if;
end $$;
