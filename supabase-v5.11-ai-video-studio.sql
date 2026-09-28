-- FilmBoard v5.11 — AI Video Studio (Runway + Veo)
-- Supabase SQL Editor saved-query name:
-- FilmBoard v5.11 - AI Video Studio (Runway + Veo)
-- Run once after supabase-v5.1-spatial-bible-lighting.sql.
-- Save this query: YES
-- Safe to run again. Additive only; it does not delete projects, shots or media.

begin;

create table if not exists public.shot_video_generations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  scene_id uuid null references public.scenes(id) on delete set null,
  shot_id uuid not null references public.shots(id) on delete cascade,
  lighting_diagram_id uuid null references public.lighting_diagrams(id) on delete set null,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  provider text not null check (provider in ('runway', 'veo')),
  model text not null,
  status text not null default 'queued'
    check (status in ('queued','preparing','submitted','processing','succeeded','failed','canceled')),
  progress integer not null default 0 check (progress between 0 and 100),
  prompt text not null,
  negative_prompt text null,
  diagram_snapshot jsonb not null default '{}'::jsonb,
  reference_manifest jsonb not null default '{}'::jsonb,
  provider_task_id text null,
  control_video_path text null,
  first_frame_path text null,
  last_frame_path text null,
  output_video_path text null,
  thumbnail_path text null,
  duration_seconds numeric(6,2) not null,
  aspect_ratio text not null default '16:9',
  resolution text not null default '720p',
  fps integer not null default 24 check (fps between 1 and 120),
  error_message text null,
  provider_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz null,
  check (control_video_path is null or control_video_path like project_id::text || '/ai-video/%'),
  check (first_frame_path is null or first_frame_path like project_id::text || '/ai-video/%'),
  check (last_frame_path is null or last_frame_path like project_id::text || '/ai-video/%'),
  check (output_video_path is null or output_video_path like project_id::text || '/ai-video/%'),
  check (thumbnail_path is null or thumbnail_path like project_id::text || '/ai-video/%')
);

create index if not exists shot_video_generations_project_idx
  on public.shot_video_generations(project_id, created_at desc);
create index if not exists shot_video_generations_shot_idx
  on public.shot_video_generations(shot_id, created_at desc);
create index if not exists shot_video_generations_diagram_idx
  on public.shot_video_generations(lighting_diagram_id, created_at desc);
create index if not exists shot_video_generations_active_idx
  on public.shot_video_generations(status, updated_at)
  where status in ('queued','preparing','submitted','processing');

create or replace function public.storyboard_v511_video_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  new.updated_at := now();
  if new.status = 'succeeded' and old.status is distinct from 'succeeded' then
    new.completed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists shot_video_generations_updated_at
  on public.shot_video_generations;
create trigger shot_video_generations_updated_at
before update on public.shot_video_generations
for each row execute function public.storyboard_v511_video_updated_at();

alter table public.shot_video_generations enable row level security;

drop policy if exists "filmboard v5.11 users view video jobs"
  on public.shot_video_generations;
create policy "filmboard v5.11 users view video jobs"
on public.shot_video_generations for select to authenticated
using (public.storyboard_v48_can_access_project(project_id, auth.uid()));

drop policy if exists "filmboard v5.11 editors create video jobs"
  on public.shot_video_generations;
create policy "filmboard v5.11 editors create video jobs"
on public.shot_video_generations for insert to authenticated
with check (
  created_by = auth.uid()
  and public.storyboard_v48_can_edit_project(project_id, auth.uid())
);

drop policy if exists "filmboard v5.11 editors update video jobs"
  on public.shot_video_generations;
create policy "filmboard v5.11 editors update video jobs"
on public.shot_video_generations for update to authenticated
using (public.storyboard_v48_can_edit_project(project_id, auth.uid()))
with check (public.storyboard_v48_can_edit_project(project_id, auth.uid()));

drop policy if exists "filmboard v5.11 editors delete video jobs"
  on public.shot_video_generations;
create policy "filmboard v5.11 editors delete video jobs"
on public.shot_video_generations for delete to authenticated
using (public.storyboard_v48_can_edit_project(project_id, auth.uid()));

grant select, insert, update, delete
  on public.shot_video_generations to authenticated;

create or replace function public.storyboard_v511_video_storage_project(
  p_bucket_id text,
  p_object_name text
)
returns uuid language plpgsql immutable set search_path = public, pg_temp as $$
declare v_project text;
begin
  if p_bucket_id <> 'storyboards'
     or split_part(p_object_name, '/', 2) <> 'ai-video' then
    return null;
  end if;
  v_project := split_part(p_object_name, '/', 1);
  begin return v_project::uuid;
  exception when invalid_text_representation then return null;
  end;
end;
$$;

revoke all on function public.storyboard_v511_video_storage_project(text, text)
  from public, anon;
grant execute on function public.storyboard_v511_video_storage_project(text, text)
  to authenticated;

drop policy if exists "filmboard v5.11 users read ai video files" on storage.objects;
create policy "filmboard v5.11 users read ai video files"
on storage.objects for select to authenticated
using (public.storyboard_v48_can_access_project(
  public.storyboard_v511_video_storage_project(bucket_id, name), auth.uid()
));

drop policy if exists "filmboard v5.11 editors create ai video files" on storage.objects;
create policy "filmboard v5.11 editors create ai video files"
on storage.objects for insert to authenticated
with check (public.storyboard_v48_can_edit_project(
  public.storyboard_v511_video_storage_project(bucket_id, name), auth.uid()
));

drop policy if exists "filmboard v5.11 editors update ai video files" on storage.objects;
create policy "filmboard v5.11 editors update ai video files"
on storage.objects for update to authenticated
using (public.storyboard_v48_can_edit_project(
  public.storyboard_v511_video_storage_project(bucket_id, name), auth.uid()
))
with check (public.storyboard_v48_can_edit_project(
  public.storyboard_v511_video_storage_project(bucket_id, name), auth.uid()
));

drop policy if exists "filmboard v5.11 editors delete ai video files" on storage.objects;
create policy "filmboard v5.11 editors delete ai video files"
on storage.objects for delete to authenticated
using (public.storyboard_v48_can_edit_project(
  public.storyboard_v511_video_storage_project(bucket_id, name), auth.uid()
));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'shot_video_generations'
  ) then
    alter publication supabase_realtime add table public.shot_video_generations;
  end if;
end;
$$;

notify pgrst, 'reload schema';
commit;
