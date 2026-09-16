-- 1. slug por barbearia
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS slug text;

UPDATE public.shop_settings s
SET slug = COALESCE(
  NULLIF(regexp_replace(lower(trim(s.name)), '[^a-z0-9]+', '-', 'g'), ''),
  'barbearia-' || left(s.id::text, 8)
)
WHERE s.slug IS NULL;

-- garante unicidade caso haja nomes repetidos
WITH d AS (
  SELECT id, slug, row_number() OVER (PARTITION BY slug ORDER BY created_at) AS rn
  FROM public.shop_settings
)
UPDATE public.shop_settings s
SET slug = s.slug || '-' || d.rn
FROM d WHERE d.id = s.id AND d.rn > 1;

ALTER TABLE public.shop_settings ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS shop_settings_slug_key ON public.shop_settings (slug);

-- 2. vincular dados existentes a uma barbearia
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS shop_id uuid;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS shop_id uuid;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS shop_id uuid;
ALTER TABLE public.blocks ADD COLUMN IF NOT EXISTS shop_id uuid;

UPDATE public.barbers SET shop_id = (SELECT id FROM public.shop_settings ORDER BY created_at LIMIT 1) WHERE shop_id IS NULL;
UPDATE public.services SET shop_id = (SELECT id FROM public.shop_settings ORDER BY created_at LIMIT 1) WHERE shop_id IS NULL;
UPDATE public.appointments SET shop_id = (SELECT id FROM public.shop_settings ORDER BY created_at LIMIT 1) WHERE shop_id IS NULL;
UPDATE public.blocks SET shop_id = (SELECT id FROM public.shop_settings ORDER BY created_at LIMIT 1) WHERE shop_id IS NULL;

ALTER TABLE public.barbers ALTER COLUMN shop_id SET NOT NULL;
ALTER TABLE public.services ALTER COLUMN shop_id SET NOT NULL;
ALTER TABLE public.appointments ALTER COLUMN shop_id SET NOT NULL;
ALTER TABLE public.blocks ALTER COLUMN shop_id SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.barbers ADD CONSTRAINT barbers_shop_fk FOREIGN KEY (shop_id) REFERENCES public.shop_settings(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.services ADD CONSTRAINT services_shop_fk FOREIGN KEY (shop_id) REFERENCES public.shop_settings(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.appointments ADD CONSTRAINT appointments_shop_fk FOREIGN KEY (shop_id) REFERENCES public.shop_settings(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.blocks ADD CONSTRAINT blocks_shop_fk FOREIGN KEY (shop_id) REFERENCES public.shop_settings(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS barbers_shop_idx ON public.barbers (shop_id);
CREATE INDEX IF NOT EXISTS services_shop_idx ON public.services (shop_id);
CREATE INDEX IF NOT EXISTS appointments_shop_date_idx ON public.appointments (shop_id, date);
CREATE INDEX IF NOT EXISTS blocks_shop_date_idx ON public.blocks (shop_id, date);

-- 3. configuração da plataforma (dono)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_pin text NOT NULL DEFAULT '1234',
  brand_name text NOT NULL DEFAULT 'Plataforma de Barbearias',
  tagline text NOT NULL DEFAULT 'Agendamento online para barbearias',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.platform_settings (owner_pin)
SELECT '1234' WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings);
