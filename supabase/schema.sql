-- ============================================================
-- Barbearia — estrutura do banco (para Supabase próprio)
-- Rode este arquivo em: SQL Editor do seu projeto Supabase
-- ============================================================

create table public.shop_settings (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true,
  name text not null default 'Minha Barbearia',
  tagline text not null default 'Estilo e precisão',
  logo_url text,
  primary_color text not null default '#d4a017',
  secondary_color text not null default '#1c1917',
  whatsapp text not null default '',
  address text not null default '',
  working_hours jsonb not null default '{}'::jsonb,
  slot_step integer not null default 15,
  admin_pin text not null default '1234',
  setup_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.barbers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  photo_url text,
  specialty text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  duration_min integer not null default 30,
  price_cents integer not null default 0,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null,
  service_id uuid not null,
  client_name text not null,
  client_phone text not null,
  date date not null,
  start_time time not null,
  duration_min integer not null,
  price_cents integer not null default 0,
  status text not null default 'confirmado',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid,
  date date not null,
  start_time time not null,
  end_time time not null,
  reason text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists appointments_date_idx on public.appointments (date);
create index if not exists appointments_phone_idx on public.appointments (client_phone);
create index if not exists blocks_date_idx on public.blocks (date);

-- Linha inicial de configuração (a barbearia edita o resto pelo painel /admin)
insert into public.shop_settings (singleton) values (true);

-- Segurança: RLS ligado e SEM políticas para o público —
-- todo acesso passa pelo servidor com a chave de serviço (service_role),
-- que ignora RLS. O site e o painel continuam funcionando normalmente.
alter table public.shop_settings enable row level security;
alter table public.barbers enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;
alter table public.blocks enable row level security;
