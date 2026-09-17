import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type SetupState = { setupDone: boolean; shopName: string };

/** Serviços e barbeiros de exemplo — a barbearia edita tudo depois no painel. */
export const EXAMPLE_SERVICES = [
  { name: "Corte Masculino", description: "Corte na máquina e tesoura, com finalização", duration_min: 30, price_cents: 5000 },
  { name: "Barba", description: "Toalha quente, navalha e hidratação", duration_min: 30, price_cents: 4000 },
  { name: "Corte + Barba", description: "Combo completo", duration_min: 60, price_cents: 8000 },
  { name: "Pezinho", description: "Acabamento rápido", duration_min: 15, price_cents: 2000 },
] as const;

export const EXAMPLE_BARBERS = [
  { name: "Barbeiro 1", specialty: "Cortes clássicos" },
  { name: "Barbeiro 2", specialty: "Degradê e barba" },
] as const;

/** Dias da semana no formato usado pelo cálculo de horários (0 = domingo). */
export const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export const DEFAULT_HOURS: Record<string, { open: string; close: string } | null> = {
  "0": null,
  "1": { open: "09:00", close: "19:00" },
  "2": { open: "09:00", close: "19:00" },
  "3": { open: "09:00", close: "19:00" },
  "4": { open: "09:00", close: "19:00" },
  "5": { open: "09:00", close: "20:00" },
  "6": { open: "08:00", close: "18:00" },
};

export const getSetupState = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ slug: z.string().min(1).max(40) }).parse(data))
  .handler(async ({ data }): Promise<SetupState> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("shop_settings")
      .select("setup_done, name")
      .eq("slug", data.slug)
      .maybeSingle();
    return { setupDone: row?.setup_done ?? false, shopName: row?.name ?? "" };
  });

export const runSetup = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        slug: z.string().trim().min(1).max(40),
        name: z.string().trim().min(1).max(60),
        tagline: z.string().trim().max(120).default(""),
        whatsapp: z.string().trim().max(24).default(""),
        address: z.string().trim().max(160).default(""),
        logo_url: z.string().trim().max(400).nullable().default(null),
        primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        secondary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        pin: z.string().trim().regex(/^\d{4,8}$/),
        openTime: z.string().regex(/^\d{2}:\d{2}$/),
        closeTime: z.string().regex(/^\d{2}:\d{2}$/),
        openDays: z.array(z.enum(DAY_KEYS)).min(1),
        slot_step: z.number().int().min(5).max(60),
        seedExamples: z.boolean().default(true),
        barberNames: z.array(z.string().trim().max(60)).max(10).default([]),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const current = await supabaseAdmin
      .from("shop_settings")
      .select("id, setup_done")
      .eq("slug", data.slug)
      .maybeSingle();

    if (!current.data) throw new Error("Barbearia não encontrada.");
    if (current.data.setup_done) {
      throw new Error("Esta barbearia já está configurada. Use o painel para alterar.");
    }

    const working_hours = Object.fromEntries(
      DAY_KEYS.map((day, index) => [
        String(index),
        data.openDays.includes(day) ? { open: data.openTime, close: data.closeTime } : null,
      ]),
    );

    const shopId = current.data.id;

    const { error } = await supabaseAdmin
      .from("shop_settings")
      .update({
        name: data.name,
        tagline: data.tagline,
        whatsapp: data.whatsapp,
        address: data.address,
        logo_url: data.logo_url,
        primary_color: data.primary_color,
        secondary_color: data.secondary_color,
        admin_pin: data.pin,
        slot_step: data.slot_step,
        working_hours,
        setup_done: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", shopId);
    if (error) throw new Error(error.message);

    if (data.seedExamples) {
      const { count } = await supabaseAdmin
        .from("services")
        .select("id", { count: "exact", head: true })
        .eq("shop_id", shopId);
      if (!count) {
        await supabaseAdmin.from("services").insert(
          EXAMPLE_SERVICES.map((s, i) => ({ ...s, shop_id: shopId, sort_order: i, active: true })),
        );
      }
    }

    const names = data.barberNames.map((n) => n.trim()).filter(Boolean);
    const barbers = names.length
      ? names.map((name, i) => ({ name, specialty: "", shop_id: shopId, sort_order: i, active: true }))
      : data.seedExamples
        ? EXAMPLE_BARBERS.map((b, i) => ({ ...b, shop_id: shopId, sort_order: i, active: true }))
        : [];

    if (barbers.length) {
      const { count } = await supabaseAdmin
        .from("barbers")
        .select("id", { count: "exact", head: true })
        .eq("shop_id", shopId);
      if (!count) await supabaseAdmin.from("barbers").insert(barbers);
    }

    return { ok: true };
  });
