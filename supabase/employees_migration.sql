-- Справочник сотрудников (ответственных за нарушения).
-- Run in Supabase SQL Editor. Идемпотентно — безопасно запускать повторно.

create table if not exists public.employees (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null,
  short_name    text not null default '',
  color         text not null default '#6B7280',
  is_active     boolean not null default true,
  terminated_on date,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Имя — естественный ключ: в отчётах ответственный хранится текстом в jsonb,
-- а не ссылкой, поэтому два сотрудника с одинаковым ФИО неразличимы.
create unique index if not exists employees_full_name_key
  on public.employees (full_name);

create index if not exists employees_active_idx
  on public.employees (is_active, sort_order);

alter table public.employees drop constraint if exists employees_color_hex_chk;
alter table public.employees
  add constraint employees_color_hex_chk check (color ~ '^#[0-9A-Fa-f]{6}$');

alter table public.employees drop constraint if exists employees_full_name_not_blank_chk;
alter table public.employees
  add constraint employees_full_name_not_blank_chk check (btrim(full_name) <> '');

-- Auto-update updated_at.
-- ВНИМАНИЕ: копия функции из migration.sql — тела должны совпадать дословно,
-- иначе тот файл, который выполнили последним, молча поменяет поведение
-- триггера и для daily_reports тоже.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists employees_updated_at on public.employees;
create trigger employees_updated_at
  before update on public.employees
  for each row execute function public.set_updated_at();

-- RLS: enable but allow all (internal tool)
alter table public.employees enable row level security;
drop policy if exists "allow_all" on public.employees;
create policy "allow_all" on public.employees for all using (true) with check (true);

-- Supabase Data API change: explicit grants required from May 30 2026
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO anon, authenticated, service_role;

-- ── Начальное наполнение ──────────────────────────────────────────────────────

insert into public.employees (full_name, short_name, color, sort_order) values
  ('Рустам Ибрагимов',  'Рустам',  '#3B82F6', 1),
  ('Идель Ибрагимов',   'Идель',   '#F97316', 2),
  ('Наталья Матвиенко', 'Наталья', '#A855F7', 3)
on conflict (full_name) do nothing;

-- Подхватить всех ответственных, которые уже встречаются в сохранённых отчётах,
-- но отсутствуют в списке выше — чтобы аналитика не потеряла их.
-- jsonb_typeof-проверки обязательны: если в колонке окажется не массив,
-- jsonb_array_elements упадёт и оборвёт весь insert целиком.
do $$
begin
  if to_regclass('public.daily_reports') is null then
    return;
  end if;

  insert into public.employees (full_name, short_name, color, sort_order)
  select distinct
    src.name,
    split_part(src.name, ' ', 1),
    '#6B7280',
    99
  from (
    select trim(row_json->>'responsible') as name
    from public.daily_reports d
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(coalesce(d.accuracy_rows, '[]'::jsonb)) = 'array'
           then coalesce(d.accuracy_rows, '[]'::jsonb) else '[]'::jsonb end
      ||
      case when jsonb_typeof(coalesce(d.incidents_rows, '[]'::jsonb)) = 'array'
           then coalesce(d.incidents_rows, '[]'::jsonb) else '[]'::jsonb end
    ) as row_json
  ) src
  where src.name is not null and src.name <> ''
  on conflict (full_name) do nothing;
end $$;
