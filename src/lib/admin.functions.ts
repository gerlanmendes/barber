import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type AdminAppointment = {
  id: string;
  date: string;
  start_time: string;
  duration_min: number;
  price_cents: number;
  status: string;
  client_name: string;
  client_phone: string;
  notes: string;
  barber_id: string;
  barber_name: string;
  service_name: string;
};

export type AdminBlock = {
  id: string;
  barber_id: string | null;
  date: string;
  start_time: string;
  end_time: string;
  reason: string;
};

export type AdminClient = {
  phone: string;
  name: string;
  visits: number;
  last_visit: string;
  last_service: string;
};

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ pin: z.string().min(1).max(20) }).parse(data))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { assertPin } = await import("./admin.server");
    await assertPin(data.pin);
    return { ok: true };
  });

export const getAgenda = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({ pin: z.string().min(1).max(20), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })
      .parse(data),
  )
  .handler(
    async ({ data }): Promise<{ appointments: AdminAppointment[]; blocks: AdminBlock[] }> => {
      const { assertPin, supabaseAdmin } = await import("./admin.server");
      await assertPin(data.pin);

      const [appointments, blocks] = await Promise.all([
        supabaseAdmin
          .from("appointments")
          .select(
            "id, date, start_time, duration_min, price_cents, status, client_name, client_phone, notes, barber_id, barbers(name), services(name)",
          )
          .eq("date", data.date)
          .order("start_time"),
        supabaseAdmin
          .from("blocks")
          .select("id, barber_id, date, start_time, end_time, reason")
          .eq("date", data.date)
          .order("start_time"),
      ]);

      if (appointments.error) throw new Error(appointments.error.message);

      return {
        appointments: (appointments.data ?? []).map((r) => {
          const row = r as unknown as AdminAppointment & {
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
            client_phone: row.client_phone,
            notes: row.notes,
            barber_id: row.barber_id,
            barber_name: row.barbers?.name ?? "",
            service_name: row.services?.name ?? "",
          };
        }),
        blocks: (blocks.data ?? []).map((b) => ({
          ...b,
          start_time: b.start_time.slice(0, 5),
          end_time: b.end_time.slice(0, 5),
        })),
      };
    },
  );

export const setAppointmentStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        pin: z.string().min(1).max(20),
        id: z.string().uuid(),
        status: z.enum(["confirmado", "concluido", "cancelado"]),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { assertPin, supabaseAdmin } = await import("./admin.server");
    await assertPin(data.pin);
    const { error } = await supabaseAdmin
      .from("appointments")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveBlock = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        pin: z.string().min(1).max(20),
        barberId: z.string().uuid().nullable(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        start: z.string().regex(/^\d{2}:\d{2}$/),
        end: z.string().regex(/^\d{2}:\d{2}$/),
        reason: z.string().trim().max(120).default(""),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { assertPin, supabaseAdmin } = await import("./admin.server");
    await assertPin(data.pin);
    const { error } = await supabaseAdmin.from("blocks").insert({
      barber_id: data.barberId,
      date: data.date,
      start_time: data.start,
      end_time: data.end,
      reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteBlock = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ pin: z.string().min(1).max(20), id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { assertPin, supabaseAdmin } = await import("./admin.server");
    await assertPin(data.pin);
    const { error } = await supabaseAdmin.from("blocks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getClients = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ pin: z.string().min(1).max(20) }).parse(data))
  .handler(async ({ data }): Promise<AdminClient[]> => {
    const { assertPin, supabaseAdmin } = await import("./admin.server");
    await assertPin(data.pin);

    const { data: rows, error } = await supabaseAdmin
      .from("appointments")
      .select("client_name, client_phone, date, services(name)")
      .order("date", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    const map = new Map<string, AdminClient>();
    for (const r of rows ?? []) {
      const row = r as unknown as {
        client_name: string;
        client_phone: string;
        date: string;
        services: { name: string } | null;
      };
      const existing = map.get(row.client_phone);
      if (existing) {
        existing.visits += 1;
      } else {
        map.set(row.client_phone, {
          phone: row.client_phone,
          name: row.client_name,
          visits: 1,
          last_visit: row.date,
          last_service: row.services?.name ?? "",
        });
      }
    }
    return [...map.values()].sort((a, b) => b.last_visit.localeCompare(a.last_visit));
  });

export const updateShop = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        pin: z.string().min(1).max(20),
        name: z.string().trim().min(1).max(60),
        tagline: z.string().trim().max(120),
        logo_url: z.string().trim().max(400).nullable(),
        primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        secondary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        whatsapp: z.string().trim().max(24),
        address: z.string().trim().max(160),
        working_hours: z.record(
          z.string(),
          z.object({ open: z.string(), close: z.string() }).nullable(),
        ),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { assertPin, supabaseAdmin } = await import("./admin.server");
    await assertPin(data.pin);
    const { pin: _pin, ...values } = data;
    const { error } = await supabaseAdmin
      .from("shop_settings")
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq("singleton", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveService = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        pin: z.string().min(1).max(20),
        id: z.string().uuid().nullable(),
        name: z.string().trim().min(1).max(60),
        description: z.string().trim().max(160).default(""),
        duration_min: z.number().int().min(5).max(480),
        price_cents: z.number().int().min(0).max(10_000_00),
        active: z.boolean().default(true),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { assertPin, supabaseAdmin } = await import("./admin.server");
    await assertPin(data.pin);
    const { pin: _pin, id, ...values } = data;
    const { error } = id
      ? await supabaseAdmin.from("services").update(values).eq("id", id)
      : await supabaseAdmin.from("services").insert(values);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveBarber = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        pin: z.string().min(1).max(20),
        id: z.string().uuid().nullable(),
        name: z.string().trim().min(1).max(60),
        specialty: z.string().trim().max(80).default(""),
        photo_url: z.string().trim().max(400).nullable(),
        active: z.boolean().default(true),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { assertPin, supabaseAdmin } = await import("./admin.server");
    await assertPin(data.pin);
    const { pin: _pin, id, ...values } = data;
    const { error } = id
      ? await supabaseAdmin.from("barbers").update(values).eq("id", id)
      : await supabaseAdmin.from("barbers").insert(values);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Zera a barbearia para reconfigurar (usado ao entregar o sistema para outro cliente). */
export const resetShop = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        pin: z.string().min(1).max(20),
        confirm: z.literal("ZERAR"),
        keepAppointments: z.boolean().default(false),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { assertPin, supabaseAdmin } = await import("./admin.server");
    await assertPin(data.pin);

    if (!data.keepAppointments) {
      await supabaseAdmin.from("appointments").delete().not("id", "is", null);
      await supabaseAdmin.from("blocks").delete().not("id", "is", null);
      await supabaseAdmin.from("services").delete().not("id", "is", null);
      await supabaseAdmin.from("barbers").delete().not("id", "is", null);
    }

    const { error } = await supabaseAdmin
      .from("shop_settings")
      .update({ setup_done: false, updated_at: new Date().toISOString() })
      .eq("singleton", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getCatalog = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ pin: z.string().min(1).max(20) }).parse(data))
  .handler(async ({ data }) => {
    const { assertPin, supabaseAdmin } = await import("./admin.server");
    await assertPin(data.pin);
    const [settings, barbers, services] = await Promise.all([
      supabaseAdmin.from("shop_settings").select("*").limit(1).maybeSingle(),
      supabaseAdmin.from("barbers").select("*").order("sort_order"),
      supabaseAdmin.from("services").select("*").order("sort_order"),
    ]);
    return {
      settings: settings.data,
      barbers: barbers.data ?? [],
      services: services.data ?? [],
    };
  });
