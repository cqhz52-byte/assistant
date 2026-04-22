create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  name text not null default '',
  role text not null default 'engineer',
  department text,
  region text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hospitals (
  id text primary key,
  name text not null,
  region text not null,
  level text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.devices (
  id text primary key,
  product_line_id text not null,
  model_name text not null,
  category text not null,
  sn_prefix text not null,
  parameter_schema jsonb not null default '[]'::jsonb,
  default_consumables jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinical_cases (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  case_date date not null,
  hospital_id text references public.hospitals (id) on delete set null,
  hospital_name text not null,
  doctor_name text not null,
  engineer_name text,
  product_line_id text not null,
  product_line_name text not null,
  device_id text references public.devices (id) on delete set null,
  device_name text not null,
  surgery_type text,
  status text not null default '待同步',
  abnormal boolean not null default false,
  notes text,
  outcome text,
  complications text,
  parameters jsonb not null default '{}'::jsonb,
  consumables jsonb not null default '[]'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists hospitals_set_updated_at on public.hospitals;
create trigger hospitals_set_updated_at
before update on public.hospitals
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists devices_set_updated_at on public.devices;
create trigger devices_set_updated_at
before update on public.devices
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists clinical_cases_set_updated_at on public.clinical_cases;
create trigger clinical_cases_set_updated_at
before update on public.clinical_cases
for each row
execute function public.set_current_timestamp_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role', 'engineer')
  )
  on conflict (id) do update set
    email = excluded.email,
    name = case when excluded.name = '' then public.profiles.name else excluded.name end,
    role = case when excluded.role = '' then public.profiles.role else excluded.role end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.hospitals enable row level security;
alter table public.devices enable row level security;
alter table public.clinical_cases enable row level security;

drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "hospitals_select_authenticated" on public.hospitals;
create policy "hospitals_select_authenticated"
on public.hospitals
for select
to authenticated
using (true);

drop policy if exists "devices_select_authenticated" on public.devices;
create policy "devices_select_authenticated"
on public.devices
for select
to authenticated
using (true);

drop policy if exists "cases_select_authenticated" on public.clinical_cases;
create policy "cases_select_authenticated"
on public.clinical_cases
for select
to authenticated
using (true);

drop policy if exists "cases_insert_self" on public.clinical_cases;
create policy "cases_insert_self"
on public.clinical_cases
for insert
to authenticated
with check (auth.uid() = created_by);

drop policy if exists "cases_update_owner_or_admin" on public.clinical_cases;
create policy "cases_update_owner_or_admin"
on public.clinical_cases
for update
to authenticated
using (
  auth.uid() = created_by
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  auth.uid() = created_by
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create index if not exists idx_clinical_cases_created_by on public.clinical_cases (created_by);
create index if not exists idx_clinical_cases_case_date on public.clinical_cases (case_date desc);
create index if not exists idx_clinical_cases_status on public.clinical_cases (status);
create index if not exists idx_clinical_cases_hospital_id on public.clinical_cases (hospital_id);
create index if not exists idx_devices_product_line_id on public.devices (product_line_id);
create index if not exists idx_hospitals_region on public.hospitals (region);

insert into public.hospitals (id, name, region, level)
values
  ('hsp-shzy', '上海中医药大学附属龙华医院', '华东', '三甲'),
  ('hsp-bjxt', '北京协和医院', '华北', '三甲'),
  ('hsp-gzfy', '广州医科大学附属第一医院', '华南', '三甲'),
  ('hsp-cqsw', '重庆市肿瘤医院', '西南', '三甲'),
  ('hsp-whzx', '武汉大学中南医院', '华中', '三甲'),
  ('hsp-xajd', '西安交通大学第一附属医院', '西北', '三甲')
on conflict (id) do update set
  name = excluded.name,
  region = excluded.region,
  level = excluded.level;

insert into public.devices (
  id,
  product_line_id,
  model_name,
  category,
  sn_prefix,
  parameter_schema,
  default_consumables
)
values
  (
    'dev-ctnav-pro',
    'robot',
    'CT-Nav Pro 导航机器人',
    '导航机器人',
    'CTN',
    '[{"key":"plannedDepth","label":"计划进针深度","unit":"mm","placeholder":"82","min":0,"max":300},{"key":"needleAngle","label":"进针角度","unit":"°","placeholder":"26","min":0,"max":90},{"key":"scanCount","label":"扫描次数","unit":"次","placeholder":"3","min":0,"max":20}]'::jsonb,
    '["定位针","穿刺针","导向架"]'::jsonb
  ),
  (
    'dev-ire-2000',
    'ire',
    'IRE-2000 陡脉冲治疗系统',
    'IRE',
    'IRE',
    '[{"key":"outputPower","label":"输出功率","unit":"W","placeholder":"90","min":0,"max":300},{"key":"pulseCount","label":"脉冲次数","unit":"次","placeholder":"90","min":0,"max":300},{"key":"duration","label":"作用时长","unit":"min","placeholder":"25","min":0,"max":240}]'::jsonb,
    '["IRE 电极针","连接线","一次性无菌罩"]'::jsonb
  ),
  (
    'dev-rf-90',
    'rf-ablation',
    'RF-90 射频消融主机',
    '射频消融',
    'RF',
    '[{"key":"outputPower","label":"输出功率","unit":"W","placeholder":"65","min":0,"max":200},{"key":"targetTemp","label":"靶温","unit":"°C","placeholder":"90","min":0,"max":120},{"key":"duration","label":"维持时长","unit":"s","placeholder":"120","min":0,"max":600}]'::jsonb,
    '["射频针","对极板","连接导线"]'::jsonb
  ),
  (
    'dev-biopsy-core',
    'biopsy',
    'CoreBx 活检穿刺系统',
    '活检穿刺',
    'CBX',
    '[{"key":"needleGauge","label":"针径规格","unit":"G","placeholder":"18","min":10,"max":25},{"key":"sampleCount","label":"取样次数","unit":"次","placeholder":"2","min":1,"max":10},{"key":"depth","label":"穿刺深度","unit":"mm","placeholder":"72","min":0,"max":250}]'::jsonb,
    '["活检针","同轴针","标本盒"]'::jsonb
  ),
  (
    'dev-vein-close',
    'vein-rf',
    'VeinClose 静脉闭合系统',
    '静脉射频',
    'VCL',
    '[{"key":"segmentLength","label":"闭合段长","unit":"cm","placeholder":"7","min":0,"max":20},{"key":"cycleCount","label":"闭合周期","unit":"次","placeholder":"6","min":0,"max":30},{"key":"targetTemp","label":"工作温度","unit":"°C","placeholder":"120","min":60,"max":140}]'::jsonb,
    '["静脉闭合导管","鞘管","超声耦合剂"]'::jsonb
  ),
  (
    'dev-es-300',
    'electrosurgical',
    'ES-300 高频电刀',
    '高频电刀',
    'ES',
    '[{"key":"cutPower","label":"切割功率","unit":"W","placeholder":"80","min":0,"max":300},{"key":"coagPower","label":"凝血功率","unit":"W","placeholder":"45","min":0,"max":200},{"key":"modeCount","label":"启用模式","unit":"个","placeholder":"2","min":1,"max":10}]'::jsonb,
    '["电刀笔","负极板","脚踏开关"]'::jsonb
  ),
  (
    'dev-neuro-therm',
    'neuro',
    'NeuroTherm 神经热凝系统',
    '神经热凝',
    'NT',
    '[{"key":"targetTemp","label":"靶温","unit":"°C","placeholder":"75","min":0,"max":120},{"key":"duration","label":"热凝时长","unit":"s","placeholder":"90","min":0,"max":600},{"key":"impedance","label":"阻抗","unit":"Ω","placeholder":"320","min":0,"max":2000}]'::jsonb,
    '["热凝针","刺激电极","定位贴片"]'::jsonb
  )
on conflict (id) do update set
  product_line_id = excluded.product_line_id,
  model_name = excluded.model_name,
  category = excluded.category,
  sn_prefix = excluded.sn_prefix,
  parameter_schema = excluded.parameter_schema,
  default_consumables = excluded.default_consumables;
