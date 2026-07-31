CREATE TABLE public.shop_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  name text NOT NULL DEFAULT 'Minha Barbearia',
  tagline text NOT NULL DEFAULT 'Estilo e precisão',
  logo_url text,
  primary_color text NOT NULL DEFAULT '#d4a017',
  secondary_color text NOT NULL DEFAULT '#1c1917',
  whatsapp text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  working_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  slot_step integer NOT NULL DEFAULT 15,
  admin_pin text NOT NULL DEFAULT '1234',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.barbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  photo_url text,
  specialty text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  duration_min integer NOT NULL DEFAULT 30,
  price_cents integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  client_name text NOT NULL,
  client_phone text NOT NULL,
  date date NOT NULL,
  start_time time NOT NULL,
  duration_min integer NOT NULL,
  price_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'confirmado',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX appointments_date_idx ON public.appointments (date, barber_id);
CREATE INDEX appointments_phone_idx ON public.appointments (client_phone);

CREATE TABLE public.blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid REFERENCES public.barbers(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX blocks_date_idx ON public.blocks (date);

GRANT ALL ON public.shop_settings TO service_role;
GRANT ALL ON public.barbers TO service_role;
GRANT ALL ON public.services TO service_role;
GRANT ALL ON public.appointments TO service_role;
GRANT ALL ON public.blocks TO service_role;

ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

INSERT INTO public.shop_settings (name, tagline, primary_color, secondary_color, whatsapp, address, working_hours, slot_step, admin_pin)
VALUES (
  'Barbearia Navalha',
  'Corte clássico, atitude moderna',
  '#e0a325',
  '#171412',
  '5511999999999',
  'Rua das Tesouras, 120 - São Paulo, SP',
  '{"0":null,"1":{"open":"09:00","close":"19:00"},"2":{"open":"09:00","close":"19:00"},"3":{"open":"09:00","close":"19:00"},"4":{"open":"09:00","close":"20:00"},"5":{"open":"09:00","close":"20:00"},"6":{"open":"09:00","close":"17:00"}}'::jsonb,
  15,
  '1234'
);

INSERT INTO public.barbers (name, specialty, sort_order) VALUES
  ('Rafael Souza', 'Degradê e navalhado', 1),
  ('Bruno Lima', 'Barba e barboterapia', 2),
  ('Diego Martins', 'Cortes clássicos', 3);

INSERT INTO public.services (name, description, duration_min, price_cents, sort_order) VALUES
  ('Corte Masculino', 'Corte na tesoura ou máquina com finalização', 30, 5000, 1),
  ('Barba', 'Toalha quente, navalha e hidratação', 30, 4000, 2),
  ('Combo Corte + Barba', 'O pacote completo', 60, 8000, 3),
  ('Corte Infantil', 'Para os pequenos até 12 anos', 30, 4000, 4),
  ('Pézinho / Acabamento', 'Retoque rápido de contorno', 15, 2000, 5);