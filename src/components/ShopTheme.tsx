import type { Shop } from "@/lib/slots";

/**
 * Injects the shop's brand colors as CSS variables so every component keeps
 * using semantic tokens (bg-primary, text-primary...) with no hardcoded color.
 */
export function ShopTheme({ shop }: { shop: Shop }) {
  const css = `:root{--primary:${shop.primary_color};--ring:${shop.primary_color};--brand-secondary:${shop.secondary_color};}`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
