import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type SetupState = { setupDone: boolean; shopName: string };

/** Serviços e barbeiros de exemplo — a barbearia edita tudo depois no /admin. */
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

export const DEFAULT_HOURS = {
  mon: { open: "09:00", close: "19:00" },
  tue: { open: "09:00", close: "19:00" },
  wed: { open: "09:00", close: "19:00" },
  thu: { open: "09:00", close: "19:00" },
  fri: { open: "09:00", close: "20:00" },
  sat: { open: "08:00", close: "18:00" },
  sun: null,
} as const;

export const getSetupState = createServerFn({ method: "GET" }).handler(
  async (): Promise<SetupState> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("shop_settings")
      .select("setup_done, name")
      .limit(1)
      .maybeSingle();
    return { setupDone: data?.setup_done ?? false, shopName: data?.name ?? "" };
  },
);

export const runSetup = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
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
        openDays: z.array(z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])).min(1),
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
      .limit(1)
      .maybeSingle();

    if (current.data?.setup_done) {
      throw new Error("Esta barbearia já está configurada. Use o painel /admin para alterar.");
    }

    const working_hours = Object.fromEntries(
      (["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const).map((day) => [
        day,
        data.openDays.includes(day) ? { open: data.openTime, close: data.closeTime } : null,
      ]),
    );

    const values = {
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
    };

    if (current.data?.id) {
      const { error } = await supabaseAdmin
        .from("shop_settings")
        .update(values)
        .eq("id", current.data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("shop_settings")
        .insert({ ...values, singleton: true });
      if (error) throw new Error(error.message);
    }

    if (data.seedExamples) {
      const { count } = await supabaseAdmin
        .from("services")
        .select("id", { count: "exact", head: true });
      if (!count) {
        await supabaseAdmin.from("services").insert(
          EXAMPLE_SERVICES.map((s, i) => ({ ...s, sort_order: i, active: true })),
        );
      }
    }

    const names = data.barberNames.map((n) => n.trim()).filter(Boolean);
    const barbers = names.length
      ? names.map((name, i) => ({ name, specialty: "", sort_order: i, active: true }))
      : data.seedExamples
        ? EXAMPLE_BARBERS.map((b, i) => ({ ...b, sort_order: i, active: true }))
        : [];

    if (barbers.length) {
      const { count } = await supabaseAdmin
        .from("barbers")
        .select("id", { count: "exact", head: true });
      if (!count) await supabaseAdmin.from("barbers").insert(barbers);
    }

    return { ok: true };
  });
