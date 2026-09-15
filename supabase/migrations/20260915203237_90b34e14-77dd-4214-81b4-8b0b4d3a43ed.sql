ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS setup_done boolean NOT NULL DEFAULT false;
UPDATE public.shop_settings SET setup_done = true WHERE singleton = true;