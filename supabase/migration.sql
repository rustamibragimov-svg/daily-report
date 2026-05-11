-- Daily Report schema
-- Run this in your Supabase SQL Editor (Project: daily-report)

create table if not exists public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null,
  week_number text not null,

  -- Section 1: Operational Control
  data_accuracy text not null default 'Все данные в трекер занесены своевременно и корректно',
  accuracy_rows jsonb not null default '[]',
  incidents_status text not null default 'Без инцидентов',
  incidents_rows jsonb not null default '[]',

  -- Section 2: Customer Service
  cs_total integer not null default 0,
  cs_overdue integer not null default 0,
  cs_overdue_reason text not null default '',
  cs_avg_week text not null default 'Нет данных',
  cs_avg_month numeric(6,2) not null default 0,

  -- Section 3: UZUM Crossborder
  uzum_sh_count integer not null default 0,
  uzum_hk_count integer not null default 0,
  uzum_sh_weight numeric(10,2) not null default 0,
  uzum_hk_weight numeric(10,2) not null default 0,
  uzum_sh_mko numeric(10,2) not null default 0,
  uzum_hk_mko numeric(10,2) not null default 0,
  uzum_sh_mpo numeric(10,2) not null default 0,
  uzum_hk_mpo numeric(10,2) not null default 0,
  uzum_sh_auto numeric(10,2) not null default 0,
  uzum_hk_auto numeric(10,2) not null default 0,
  uzum_sh_ratio text not null default 'Нет данных',
  uzum_hk_ratio text not null default 'Нет данных',
  uzum_china_status text not null default 'Без инцидентов',
  uzum_china_incident text not null default '',
  uzum_transit_status text not null default 'Без инцидентов',
  uzum_transit_incident text not null default '',
  uzum_lastmile_status text not null default 'Без инцидентов',
  uzum_lastmile_incident text not null default '',

  -- Section 4: Cainiao
  cainiao_sh_count integer not null default 0,
  cainiao_hk_count integer not null default 0,
  cainiao_sh_weight numeric(10,2) not null default 0,
  cainiao_hk_weight numeric(10,2) not null default 0,
  cainiao_sh_mko numeric(10,2) not null default 0,
  cainiao_hk_mko numeric(10,2) not null default 0,
  cainiao_sh_mpo numeric(10,2) not null default 0,
  cainiao_hk_mpo numeric(10,2) not null default 0,
  cainiao_sh_auto numeric(10,2) not null default 0,
  cainiao_hk_auto numeric(10,2) not null default 0,
  cainiao_sh_ratio text not null default 'Нет данных',
  cainiao_hk_ratio text not null default 'Нет данных',
  cainiao_china_status text not null default 'Без инцидентов',
  cainiao_china_incident text not null default '',
  cainiao_transit_status text not null default 'Без инцидентов',
  cainiao_transit_incident text not null default '',
  cainiao_lastmile_status text not null default 'Без инцидентов',
  cainiao_lastmile_incident text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint daily_reports_date_unique unique (report_date)
);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger daily_reports_updated_at
  before update on public.daily_reports
  for each row execute function public.set_updated_at();

-- RLS: enable but allow all (internal tool)
alter table public.daily_reports enable row level security;
create policy "allow_all" on public.daily_reports for all using (true) with check (true);
