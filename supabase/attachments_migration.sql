-- Run in Supabase SQL Editor

-- Table for file metadata
create table if not exists public.report_attachments (
  id uuid primary key default gen_random_uuid(),
  report_date date not null,
  file_name text not null,
  file_path text not null,
  file_size bigint not null default 0,
  file_type text not null default '',
  uploaded_at timestamptz not null default now()
);

alter table public.report_attachments enable row level security;
create policy "allow_all" on public.report_attachments for all using (true) with check (true);

-- Storage bucket (run this too)
insert into storage.buckets (id, name, public)
values ('report-files', 'report-files', true)
on conflict do nothing;

create policy "allow_all_storage" on storage.objects
for all using (bucket_id = 'report-files') with check (bucket_id = 'report-files');

-- Supabase Data API change: explicit grants required from May 30 2026
-- (GRANTs are idempotent — safe to re-run)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_attachments TO anon, authenticated, service_role;
