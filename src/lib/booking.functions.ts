import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  computeSlots,
  nowInShopTZ,
  onlyDigits,
  toMinutes,
  type Barber,
  type Service,
  type Shop,
  type Slot,
} from "./slots";

export type ShopData = { shop: Shop; barbers: Barber[]; services: Service[] };

export type ClientAppointment = {
  id: string;
  date: string;
  start_time: string;
  duration_min: number;
  price_cents: number;
  status: string;
  client_name: string;
  barber_name: string;
  service_name: string;
};

const slugInput = z.string().trim().min(1).max(40);

export const getShopData = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ slug: slugInput }).parse(data))
  .handler(async ({ data }): Promise<ShopData | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const settings = await supabaseAdmin
      .from("shop_settings")
      .select(
        "id, slug, name, tagline, logo_url, primary_color, secondary_color, whatsapp, address, working_hours, slot_step, setup_done",
      )
      .eq("slug", data.slug)
      .maybeSingle();

    if (settings.error) throw new Error(settings.error.message);
    if (!settings.data) return null;

    const shopId = settings.data.id;
    const [barbers, services] = await Promise.all([
      supabaseAdmin
        .from("barbers")
        .select("id, name, photo_url, specialty")
        .eq("shop_id", shopId)
        .eq("active", true)
        .order("sort_order"),
      supabaseAdmin
        .from("services")
        .select("id, name, description, duration_min, price_cents")
        .eq("shop_id", shopId)
        .eq("active", true)
        .order("sort_order"),
    ]);

    return {
      shop: settings.data as unknown as Shop,
      barbers: (barbers.data ?? []) as Barber[],
      services: (services.data ?? []) as Service[],
    };
  });

export const getAvailability = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        slug: slugInput,
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        serviceId: z.string().uuid(),
        barberId: z.string().uuid().nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<Slot[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const settings = await supabaseAdmin
      .from("shop_settings")
      .select("id, working_hours, slot_step")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!settings.data) return [];
    const shopId = settings.data.id;

    const [service, barbers, appointments, blocks] = await Promise.all([
      supabaseAdmin
        .from("services")
        .select("duration_min")
        .eq("id", data.serviceId)
        .eq("shop_id", shopId)
        .maybeSingle(),
      supabaseAdmin
        .from("barbers")
        .select("id")
        .eq("shop_id", shopId)
        .eq("active", true)
        .order("sort_order"),
      supabaseAdmin
        .from("appointments")
        .select("barber_id, start_time, duration_min")
        .eq("shop_id", shopId)
        .eq("date", data.date)
        .neq("status", "cancelado"),
      supabaseAdmin
        .from("blocks")
        .select("barber_id, start_time, end_time")
        .eq("shop_id", shopId)
        .eq("date", data.date),
    ]);

    if (!service.data) return [];

    const now = nowInShopTZ();
    const allowed = (barbers.data ?? []).map((b) => b.id);
    const barberIds = data.barberId ? allowed.filter((id) => id === data.barberId) : allowed;

    return computeSlots({
      date: data.date,
      durationMin: service.data.duration_min,
      barberIds,
      workingHours: settings.data.working_hours as never,
      slotStep: settings.data.slot_step,
      appointments: appointments.data ?? [],
      blocks: blocks.data ?? [],
      nowMinutes: data.date === now.dateISO ? now.minutes : null,
    });
  });

export const createAppointment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        slug: slugInput,
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        time: z.string().regex(/^\d{2}:\d{2}$/),
        serviceId: z.string().uuid(),
        barberId: z.string().uuid().nullable().optional(),
        clientName: z.string().trim().min(2).max(80),
        clientPhone: z.string().trim().min(8).max(24),
        notes: z.string().trim().max(300).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ id: string; barberName: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const settings = await supabaseAdmin
      .from("shop_settings")
      .select("id, working_hours, slot_step")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!settings.data) throw new Error("Barbearia não encontrada.");
    const shopId = settings.data.id;

    const [service, barbers, appointments, blocks] = await Promise.all([
      supabaseAdmin
        .from("services")
        .select("duration_min, price_cents")
        .eq("id", data.serviceId)
        .eq("shop_id", shopId)
        .maybeSingle(),
      supabaseAdmin
        .from("barbers")
        .select("id, name")
        .eq("shop_id", shopId)
        .eq("active", true)
        .order("sort_order"),
      supabaseAdmin
        .from("appointments")
        .select("barber_id, start_time, duration_min")
        .eq("shop_id", shopId)
        .eq("date", data.date)
        .neq("status", "cancelado"),
      supabaseAdmin
        .from("blocks")
        .select("barber_id, start_time, end_time")
        .eq("shop_id", shopId)
        .eq("date", data.date),
    ]);

    if (!service.data) throw new Error("Serviço indisponível.");

    const now = nowInShopTZ();
    const all = barbers.data ?? [];
    const candidates = data.barberId ? all.filter((b) => b.id === data.barberId) : all;

    const slots = computeSlots({
      date: data.date,
      durationMin: service.data.duration_min,
      barberIds: candidates.map((b) => b.id),
      workingHours: settings.data.working_hours as never,
      slotStep: settings.data.slot_step,
      appointments: appointments.data ?? [],
      blocks: blocks.data ?? [],
      nowMinutes: data.date === now.dateISO ? now.minutes : null,
    });

    const slot = slots.find((s) => toMinutes(s.time) === toMinutes(data.time));
    if (!slot || slot.barberIds.length === 0) {
      throw new Error("Esse horário acabou de ser ocupado. Escolha outro, por favor.");
    }

    const chosenId = slot.barberIds[0]!;
    const chosen = all.find((b) => b.id === chosenId)!;

    const inserted = await supabaseAdmin
      .from("appointments")
      .insert({
        shop_id: shopId,
        barber_id: chosenId,
        service_id: data.serviceId,
        client_name: data.clientName,
        client_phone: onlyDigits(data.clientPhone),
        date: data.date,
        start_time: data.time,
        duration_min: service.data.duration_min,
        price_cents: service.data.price_cents,
        notes: data.notes ?? "",
      })
      .select("id")
      .single();

    if (inserted.error) throw new Error(inserted.error.message);
    return { id: inserted.data.id, barberName: chosen.name };
  });

export const getMyAppointments = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ slug: slugInput, phone: z.string().trim().min(8).max(24) }).parse(data),
  )
  .handler(async ({ data }): Promise<ClientAppointment[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { resolveShopId } = await import("./admin.server");
    const shopId = await resolveShopId(data.slug);

    const { data: rows, error } = await supabaseAdmin
      .from("appointments")
      .select(
        "id, date, start_time, duration_min, price_cents, status, client_name, barbers(name), services(name)",
      )
      .eq("shop_id", shopId)
      .eq("client_phone", onlyDigits(data.phone))
      .order("date", { ascending: false })
      .order("start_time", { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);

    return (rows ?? []).map((r) => {
      const row = r as unknown as {
        id: string;
        date: string;
        start_time: string;
        duration_min: number;
        price_cents: number;
        status: string;
        client_name: string;
        barbers: { name: string } | null;
        services: { name: string } | null;
      };
      return {
        id: row.id,
        date: row.date,
        start_time: row.start_time.slice(0, 5),
        duration_min: row.duration_min,
        price_cents: row.price_cents,
        status: row.status,
        client_name: row.client_name,
        barber_name: row.barbers?.name ?? "",
        service_name: row.services?.name ?? "",
      };
    });
  });

export const cancelMyAppointment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        slug: slugInput,
        id: z.string().uuid(),
        phone: z.string().trim().min(8).max(24),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { resolveShopId } = await import("./admin.server");
    const shopId = await resolveShopId(data.slug);
    const { error } = await supabaseAdmin
      .from("appointments")
      .update({ status: "cancelado" })
      .eq("id", data.id)
      .eq("shop_id", shopId)
      .eq("client_phone", onlyDigits(data.phone));
    if (error) throw new Error(error.message);
    return { ok: true };
  });
