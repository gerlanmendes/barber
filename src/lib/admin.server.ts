// Server-only helpers for the admin panel (never imported by client code).
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function assertPin(pin: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("shop_settings")
    .select("admin_pin")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.admin_pin !== pin) throw new Error("PIN inválido.");
}

export { supabaseAdmin };
