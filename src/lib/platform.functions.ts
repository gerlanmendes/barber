import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { DEFAULT_HOURS, EXAMPLE_BARBERS, EXAMPLE_SERVICES } from "./setup.functions";

export type ShopCard = {
  slug: string;
  name: string;
  tagline: string;
  logo_url: string | null;
  address: string;
  primary_color: string;
  setup_done: boolean;
};

export type PlatformInfo = { brand_name: string; tagline: string };

export const RESERVED_SLUGS = [
  "admin",
  "api",
  "instalar",
  "plataforma",
  "meus-agendamentos",
  "assets",
  "public",
  "icons",
];

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Public list of shops shown on the platform home page. */
export const listShops = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ platform: PlatformInfo; shops: ShopCard[] }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [platform, shops] = await Promise.all([
      supabaseAdmin.from("platform_settings").select("brand_name, tagline").limit(1).maybeSingle(),
      supabaseAdmin
        .from("shop_settings")
        .select("slug, name, tagline, logo_url, address, primary_color, setup_done")
        .order("created_at"),
    ]);
    return {
      platform: {
        brand_name: platform.data?.brand_name ?? "Plataforma de Barbearias",
        tagline: platform.data?.tagline ?? "Agendamento online para barbearias",
      },
      shops: (shops.data ?? []) as ShopCard[],
    };
  },
);

export const ownerLogin = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ pin: z.string().min(1).max(20) }).parse(data))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { assertOwnerPin } = await import("./admin.server");
    await assertOwnerPin(data.pin);
    return { ok: true };
  });

export const createShop = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        ownerPin: z.string().min(1).max(20),
        name: z.string().trim().min(2).max(60),
        slug: z
          .string()
          .trim()
          .min(2)
          .max(40)
          .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen."),
        adminPin: z.string().trim().regex(/^\d{4,8}$/),
        seedExamples: z.boolean().default(true),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ slug: string }> => {
    const { assertOwnerPin, supabaseAdmin } = await import("./admin.server");
    await assertOwnerPin(data.ownerPin);

    if (RESERVED_SLUGS.includes(data.slug)) {
      throw new Error("Esse endereço é reservado pelo sistema. Escolha outro.");
    }

    const existing = await supabaseAdmin
      .from("shop_settings")
      .select("id")
      .eq("slug", data.slug)
      .maybeSingle();
    if (existing.data) throw new Error("Já existe uma barbearia com esse endereço.");

    const inserted = await supabaseAdmin
      .from("shop_settings")
      .insert({
        slug: data.slug,
        name: data.name,
        admin_pin: data.adminPin,
        working_hours: DEFAULT_HOURS as unknown as Record<string, unknown>,
        setup_done: false,
      })
      .select("id")
      .single();
    if (inserted.error) throw new Error(inserted.error.message);

    const shopId = inserted.data.id;

    if (data.seedExamples) {
      await supabaseAdmin
        .from("services")
        .insert(
          EXAMPLE_SERVICES.map((s, i) => ({ ...s, shop_id: shopId, sort_order: i, active: true })),
        );
      await supabaseAdmin
        .from("barbers")
        .insert(
          EXAMPLE_BARBERS.map((b, i) => ({ ...b, shop_id: shopId, sort_order: i, active: true })),
        );
    }

    return { slug: data.slug };
  });

/** Removes a shop and everything that belongs to it (owner only). */
export const deleteShop = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        ownerPin: z.string().min(1).max(20),
        slug: z.string().trim().min(1).max(40),
        confirm: z.literal("APAGAR"),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { assertOwnerPin, supabaseAdmin } = await import("./admin.server");
    await assertOwnerPin(data.ownerPin);
    const { error } = await supabaseAdmin.from("shop_settings").delete().eq("slug", data.slug);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updatePlatform = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        ownerPin: z.string().min(1).max(20),
        brand_name: z.string().trim().min(2).max(60),
        tagline: z.string().trim().max(120).default(""),
        newOwnerPin: z
          .string()
          .trim()
          .regex(/^\d{4,8}$/)
          .optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { assertOwnerPin, supabaseAdmin } = await import("./admin.server");
    await assertOwnerPin(data.ownerPin);
    const current = await supabaseAdmin.from("platform_settings").select("id").limit(1).maybeSingle();
    const values = {
      brand_name: data.brand_name,
      tagline: data.tagline,
      ...(data.newOwnerPin ? { owner_pin: data.newOwnerPin } : {}),
      updated_at: new Date().toISOString(),
    };
    const { error } = current.data?.id
      ? await supabaseAdmin.from("platform_settings").update(values).eq("id", current.data.id)
      : await supabaseAdmin.from("platform_settings").insert(values);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
