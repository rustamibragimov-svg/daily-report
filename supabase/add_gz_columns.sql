alter table daily_reports
  add column if not exists uzum_gz_count     integer      not null default 0,
  add column if not exists uzum_gz_weight    numeric(10,2) not null default 0,
  add column if not exists uzum_gz_mko       numeric(10,2) not null default 0,
  add column if not exists uzum_gz_mpo       numeric(10,2) not null default 0,
  add column if not exists uzum_gz_auto      numeric(10,2) not null default 0,
  add column if not exists uzum_gz_ratio     text          not null default 'Нет данных',
  add column if not exists cainiao_gz_count  integer      not null default 0,
  add column if not exists cainiao_gz_weight numeric(10,2) not null default 0,
  add column if not exists cainiao_gz_mko    numeric(10,2) not null default 0,
  add column if not exists cainiao_gz_mpo    numeric(10,2) not null default 0,
  add column if not exists cainiao_gz_auto   numeric(10,2) not null default 0,
  add column if not exists cainiao_gz_ratio  text          not null default 'Нет данных';
