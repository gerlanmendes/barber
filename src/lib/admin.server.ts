// Server-only helpers for the admin panel (never imported by client code).
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Resolves a shop by its URL slug. Throws when it does not exist. */
export async function resolveShopId(slug: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("shop_settings")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Barbearia não encontrada.");
  return data.id;
}

/** Validates the shop admin PIN and returns the shop id. */
export async function assertPin(slug: string, pin: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("shop_settings")
    .select("id, admin_pin")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Barbearia não encontrada.");
  if (data.admin_pin !== pin) throw new Error("PIN inválido.");
  return data.id;
}

/** Validates the platform owner PIN (used to create new shops). */
export async function assertOwnerPin(pin: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("platform_settings")
    .select("owner_pin")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.owner_pin !== pin) throw new Error("Código de dono inválido.");
}

export { supabaseAdmin };
