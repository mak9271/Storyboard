-- FilmBoard v5.13 · Structured Screenplay Format
-- Safe additive migration. Run once in Supabase SQL Editor.

alter table public.project_scripts
  add column if not exists screenplay_title text not null default '',
  add column if not exists character_list jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'project_scripts_screenplay_title_limit'
      and conrelid = 'public.project_scripts'::regclass
  ) then
    alter table public.project_scripts
      add constraint project_scripts_screenplay_title_limit
      check (char_length(screenplay_title) <= 240);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'project_scripts_character_list_array'
      and conrelid = 'public.project_scripts'::regclass
  ) then
    alter table public.project_scripts
      add constraint project_scripts_character_list_array
      check (
        jsonb_typeof(character_list) = 'array'
        and jsonb_array_length(character_list) <= 120
        and octet_length(character_list::text) <= 48000
      );
  end if;
end;
$$;

notify pgrst, 'reload schema';
