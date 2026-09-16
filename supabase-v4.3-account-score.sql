-- Storyboard Shot Builder v4.3.0
-- Editable account profile, two-month username cooldown and persistent creator score.
-- Run after the existing v4.0 AI, v4.1 Admin, v4.1.3 Admin Users Fix,
-- and v4.1.7 AI Usage Counter queries. Safe to run again.

begin;

-- -------------------------------------------------------------------
-- 1) Account preferences and username cooldown
-- -------------------------------------------------------------------

alter table public.profiles
  add column if not exists username_changed_at timestamptz,
  add column if not exists preferred_language text,
  add column if not exists preferred_layout text;

alter table public.profiles
  drop constraint if exists profiles_preferred_language_check;
alter table public.profiles
  add constraint profiles_preferred_language_check
  check (preferred_language is null or preferred_language in ('fa', 'en'));

alter table public.profiles
  drop constraint if exists profiles_preferred_layout_check;
alter table public.profiles
  add constraint profiles_preferred_layout_check
  check (preferred_layout is null or preferred_layout in ('auto', 'mobile', 'desktop'));

create or replace function public.storyboard_update_my_profile(
  p_username text,
  p_display_name text,
  p_preferred_language text default null,
  p_preferred_layout text default null
)
returns table (
  username text,
  display_name text,
  username_changed_at timestamptz,
  username_next_change_at timestamptz,
  can_change_username boolean,
  preferred_language text,
  preferred_layout text
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_username text := lower(btrim(coalesce(p_username, '')));
  v_display_name text := nullif(btrim(coalesce(p_display_name, '')), '');
  v_current_username text;
  v_changed_at timestamptz;
  v_username_is_changing boolean := false;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if v_username !~ '^[a-z0-9_.-]{3,30}$' then
    raise exception 'USERNAME_INVALID';
  end if;

  if char_length(coalesce(v_display_name, '')) > 80 then
    raise exception 'DISPLAY_NAME_TOO_LONG';
  end if;

  if p_preferred_language is not null and p_preferred_language not in ('fa', 'en') then
    raise exception 'LANGUAGE_INVALID';
  end if;

  if p_preferred_layout is not null and p_preferred_layout not in ('auto', 'mobile', 'desktop') then
    raise exception 'LAYOUT_INVALID';
  end if;

  select p.username, p.username_changed_at
  into v_current_username, v_changed_at
  from public.profiles p
  where p.id = v_user_id
  for update;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  v_username_is_changing := lower(coalesce(v_current_username, '')) <> v_username;

  if v_username_is_changing then
    if v_changed_at is not null and v_changed_at + interval '2 months' > now() then
      raise exception 'USERNAME_COOLDOWN_UNTIL:%', (v_changed_at + interval '2 months')::text;
    end if;

    -- Serializes competing requests for the same normalized username.
    perform pg_advisory_xact_lock(hashtextextended(v_username, 4300));

    if exists (
      select 1 from public.profiles p
      where lower(p.username) = v_username
        and p.id <> v_user_id
    ) then
      raise exception 'USERNAME_TAKEN';
    end if;
  end if;

  update public.profiles p
  set username = v_username,
      display_name = v_display_name,
      username_changed_at = case when v_username_is_changing then now() else p.username_changed_at end,
      preferred_language = coalesce(p_preferred_language, p.preferred_language),
      preferred_layout = coalesce(p_preferred_layout, p.preferred_layout)
  where p.id = v_user_id;

  -- Keep auth metadata in sync for admin fallbacks and future sessions.
  update auth.users u
  set raw_user_meta_data = jsonb_set(
    jsonb_set(coalesce(u.raw_user_meta_data, '{}'::jsonb), '{username}', to_jsonb(v_username), true),
    '{display_name}', to_jsonb(coalesce(v_display_name, '')), true
  )
  where u.id = v_user_id;

  return query
  select
    p.username::text,
    p.display_name::text,
    p.username_changed_at,
    case when p.username_changed_at is null then null else p.username_changed_at + interval '2 months' end,
    (p.username_changed_at is null or p.username_changed_at + interval '2 months' <= now()),
    p.preferred_language::text,
    p.preferred_layout::text
  from public.profiles p
  where p.id = v_user_id;
end;
$$;

revoke all on function public.storyboard_update_my_profile(text, text, text, text) from public, anon;
grant execute on function public.storyboard_update_my_profile(text, text, text, text) to authenticated;

-- -------------------------------------------------------------------
-- 2) Persistent creator score ledger
-- -------------------------------------------------------------------

create table if not exists public.storyboard_score_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('shot_created', 'shot_ai_generated')),
  source_id uuid not null,
  project_id uuid not null,
  points smallint not null default 1 check (points = 1),
  created_at timestamptz not null default now(),
  unique (user_id, event_type, source_id)
);

create index if not exists storyboard_score_events_user_idx
  on public.storyboard_score_events(user_id, created_at desc);
create index if not exists storyboard_score_events_daily_idx
  on public.storyboard_score_events(created_at desc, user_id);

alter table public.storyboard_score_events enable row level security;
revoke all on public.storyboard_score_events from anon, authenticated;

-- Existing owned shots count toward all-time totals. They use an old timestamp
-- so installing this migration does not falsely decide today's top creator.
insert into public.storyboard_score_events
  (user_id, event_type, source_id, project_id, points, created_at)
select p.owner_id, 'shot_created', s.id, s.project_id, 1, timestamptz '2000-01-01 00:00:00+00'
from public.shots s
join public.projects p on p.id = s.project_id
where p.owner_id is not null
on conflict (user_id, event_type, source_id) do nothing;

-- Backfill only images that carry the app's AI-generation metadata. Manually
-- uploaded storyboard images do not receive an AI point.
insert into public.storyboard_score_events
  (user_id, event_type, source_id, project_id, points, created_at)
select p.owner_id, 'shot_ai_generated', s.id, s.project_id, 1, timestamptz '2000-01-01 00:00:00+00'
from public.shots s
join public.projects p on p.id = s.project_id
where p.owner_id is not null
  and s.image_path is not null
  and nullif(s.data #>> '{aiGeneration,provider}', '') is not null
on conflict (user_id, event_type, source_id) do nothing;

create or replace function public.storyboard_score_new_owned_shot()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner_id uuid;
begin
  select p.owner_id into v_owner_id
  from public.projects p
  where p.id = new.project_id;

  -- Shared collaborators and admins working in support mode do not score.
  if v_owner_id is not null and v_owner_id = auth.uid() then
    insert into public.storyboard_score_events
      (user_id, event_type, source_id, project_id, points)
    values
      (v_owner_id, 'shot_created', new.id, new.project_id, 1)
    on conflict (user_id, event_type, source_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists storyboard_score_new_owned_shot on public.shots;
create trigger storyboard_score_new_owned_shot
after insert on public.shots
for each row execute function public.storyboard_score_new_owned_shot();

create or replace function public.storyboard_record_shot_generation(
  p_project_id uuid,
  p_shot_id uuid,
  p_prompt_hash text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_owner_id uuid;
  v_image_path text;
  v_saved_prompt_hash text;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select p.owner_id, s.image_path, s.data #>> '{aiGeneration,promptHash}'
  into v_owner_id, v_image_path, v_saved_prompt_hash
  from public.shots s
  join public.projects p on p.id = s.project_id
  where s.id = p_shot_id
    and s.project_id = p_project_id;

  -- Only the owner earns points, and only after the AI image plus matching
  -- generation metadata have been saved to the shot.
  if v_owner_id is distinct from v_user_id
     or nullif(v_image_path, '') is null
     or p_prompt_hash !~ '^[0-9a-f]{20}$'
     or v_saved_prompt_hash is distinct from p_prompt_hash then
    return false;
  end if;

  insert into public.storyboard_score_events
    (user_id, event_type, source_id, project_id, points)
  values
    (v_user_id, 'shot_ai_generated', p_shot_id, p_project_id, 1)
  on conflict (user_id, event_type, source_id) do nothing;

  return true;
end;
$$;

revoke all on function public.storyboard_record_shot_generation(uuid, uuid, text) from public, anon;
grant execute on function public.storyboard_record_shot_generation(uuid, uuid, text) to authenticated;

create or replace function public.storyboard_score_status()
returns table (
  total_score bigint,
  overall_rank bigint,
  total_users bigint,
  today_score bigint,
  shots_created bigint,
  ai_images_generated bigint,
  leader_username text,
  leader_display_name text,
  leader_score bigint
)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  with accounts as (
    select
      u.id as user_id,
      coalesce(nullif(p.username, ''), nullif(u.raw_user_meta_data ->> 'username', ''), 'user-' || left(u.id::text, 8))::text as username,
      coalesce(nullif(p.display_name, ''), nullif(u.raw_user_meta_data ->> 'display_name', ''), '')::text as display_name
    from auth.users u
    left join public.profiles p on p.id = u.id
  ), totals as (
    select
      a.user_id,
      a.username,
      a.display_name,
      coalesce(sum(e.points), 0)::bigint as total_score,
      coalesce(count(*) filter (where e.event_type = 'shot_created'), 0)::bigint as shots_created,
      coalesce(count(*) filter (where e.event_type = 'shot_ai_generated'), 0)::bigint as ai_images_generated
    from accounts a
    left join public.storyboard_score_events e on e.user_id = a.user_id
    group by a.user_id, a.username, a.display_name
  ), ranked as (
    select
      t.*,
      rank() over (order by t.total_score desc) as overall_rank,
      count(*) over () as total_users
    from totals t
  ), daily as (
    select e.user_id, coalesce(sum(e.points), 0)::bigint as today_score
    from public.storyboard_score_events e
    where e.created_at >= (date_trunc('day', timezone('utc', now())) at time zone 'UTC')
      and e.created_at < ((date_trunc('day', timezone('utc', now())) + interval '1 day') at time zone 'UTC')
    group by e.user_id
  ), daily_leader as (
    select t.username, t.display_name, d.today_score, t.total_score
    from daily d
    join totals t on t.user_id = d.user_id
    where d.today_score > 0
    order by d.today_score desc, t.total_score desc, lower(t.username), t.user_id
    limit 1
  )
  select
    r.total_score,
    r.overall_rank,
    r.total_users,
    coalesce(d.today_score, 0)::bigint,
    r.shots_created,
    r.ai_images_generated,
    l.username::text,
    l.display_name::text,
    coalesce(l.today_score, 0)::bigint
  from ranked r
  left join daily d on d.user_id = r.user_id
  left join daily_leader l on true
  where r.user_id = auth.uid();
$$;

revoke all on function public.storyboard_score_status() from public, anon;
grant execute on function public.storyboard_score_status() to authenticated;

notify pgrst, 'reload schema';

commit;
