-- Storyboard Shot Builder v4.1.7 — Daily AI usage counter
-- Run after supabase-v4.0-ai.sql and supabase-v4.1-admin.sql.
-- Safe to run again. This does not delete or reset usage data.

begin;

create or replace function public.storyboard_ai_usage_status()
returns table (
  used integer,
  remaining integer,
  daily_limit integer,
  personal_remaining integer,
  global_remaining integer,
  unlimited boolean,
  usage_date date
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := (timezone('utc', now()))::date;
  v_daily_limit constant integer := 20;
  v_global_limit constant integer := 70;
  v_used integer := 0;
  v_global_used integer := 0;
  v_personal_remaining integer := 0;
  v_global_remaining integer := 0;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select coalesce(sum(u.attempts), 0)::integer
  into v_global_used
  from public.ai_generation_usage u
  where u.usage_date = v_today;

  v_global_remaining := greatest(v_global_limit - v_global_used, 0);

  if public.storyboard_is_admin() then
    select count(*)::integer
    into v_used
    from public.storyboard_admin_audit_log l
    where l.admin_id = v_user_id
      and l.action = 'ai_generation_reserved'
      and l.created_at >= (v_today::timestamp at time zone 'UTC')
      and l.created_at < ((v_today + 1)::timestamp at time zone 'UTC');

    return query
    select v_used, -1, -1, -1, v_global_remaining, true, v_today;
    return;
  end if;

  select coalesce(max(u.attempts), 0)::integer
  into v_used
  from public.ai_generation_usage u
  where u.user_id = v_user_id
    and u.usage_date = v_today;

  v_personal_remaining := greatest(v_daily_limit - v_used, 0);

  return query
  select
    v_used,
    least(v_personal_remaining, v_global_remaining),
    v_daily_limit,
    v_personal_remaining,
    v_global_remaining,
    false,
    v_today;
end;
$$;

revoke all on function public.storyboard_ai_usage_status() from public, anon;
grant execute on function public.storyboard_ai_usage_status() to authenticated;

notify pgrst, 'reload schema';

commit;
