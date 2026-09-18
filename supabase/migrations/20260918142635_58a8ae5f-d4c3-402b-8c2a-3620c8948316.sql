ALTER TABLE public.shop_settings DROP CONSTRAINT IF EXISTS shop_settings_singleton_key;
ALTER TABLE public.shop_settings ALTER COLUMN singleton SET DEFAULT true;