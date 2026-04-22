create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('admin', 'engineer');
  end if;

  if not exists (select 1 from pg_type where typname = 'case_status') then
    create type public.case_status as enum ('draft', 'scheduled', 'in_progress', 'completed', 'synced');
  end if;

  if not exists (select 1 from pg_type where typname = 'media_type') then
    create type public.media_type as enum ('image', 'video');
  end if;
end $$;

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  role public.user_role not null default 'engineer',
  department text,
  region text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hospitals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region text not null,
  level text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  model_name text not null,
  category text not null,
  sn_prefix text not null,
  parameter_schema jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinical_cases (
  id uuid primary key default gen_random_uuid(),
  case_no text unique,
  case_date date not null,
  hospital_id uuid not null references public.hospitals (id) on delete restrict,
  doctor_name text not null,
  surgery_type text,
  engineer_id uuid not null references public.users (id) on delete restrict,
  status public.case_status not null default 'draft',
  offline_created_at timestamptz,
  synced_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.case_details (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.clinical_cases (id) on delete cascade,
  device_id uuid not null references public.devices (id) on delete restrict,
  parameters jsonb not null default '{}'::jsonb,
  outcome text,
  complications text,
  abnormal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.consumables (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.clinical_cases (id) on delete cascade,
  item_name text not null,
  quantity numeric(10, 2) not null default 1,
  batch_no text,
  captured_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.clinical_cases (id) on delete cascade,
  file_url text not null,
  type public.media_type not null default 'image',
  captured_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_hospitals_region on public.hospitals (region);
create index if not exists idx_devices_category on public.devices (category);
create index if not exists idx_clinical_cases_date on public.clinical_cases (case_date desc);
create index if not exists idx_clinical_cases_hospital on public.clinical_cases (hospital_id);
create index if not exists idx_clinical_cases_engineer on public.clinical_cases (engineer_id);
create index if not exists idx_case_details_case on public.case_details (case_id);
create index if not exists idx_consumables_case on public.consumables (case_id);
create index if not exists idx_media_case on public.media (case_id);
