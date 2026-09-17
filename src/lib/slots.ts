// Pure helpers shared by client and server (no secrets, no I/O).

export type DayHours = { open: string; close: string } | null;
export type WorkingHours = Record<string, DayHours>;

export type Barber = {
  id: string;
  name: string;
  photo_url: string | null;
  specialty: string;
};

export type Service = {
  id: string;
  name: string;
  description: string;
  duration_min: number;
  price_cents: number;
};

export type Shop = {
  slug: string;
  name: string;
  tagline: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  whatsapp: string;
  address: string;
  working_hours: WorkingHours;
  slot_step: number;
  setup_done?: boolean;
};

export type Slot = { time: string; barberIds: string[] };

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.slice(0, 5).split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS_SHORT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

export function weekdayName(iso: string): string {
  return WEEKDAYS[parseISODate(iso).getDay()] ?? "";
}

export function weekdayShort(iso: string): string {
  return WEEKDAYS_SHORT[parseISODate(iso).getDay()] ?? "";
}

export function formatFriendlyDate(iso: string): string {
  const d = parseISODate(iso);
  return `${weekdayName(iso)}, ${d.getDate()} de ${MONTHS_SHORT[d.getMonth()]}`;
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatPhoneBR(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

type Busy = { barber_id: string; start: number; end: number };

export type AvailabilityInput = {
  date: string;
  durationMin: number;
  barberIds: string[];
  workingHours: WorkingHours;
  slotStep: number;
  appointments: { barber_id: string; start_time: string; duration_min: number }[];
  blocks: { barber_id: string | null; start_time: string; end_time: string }[];
  nowMinutes: number | null; // minutes-of-day cutoff when date === today
};

/** Returns every startable slot for the day plus which barbers are free at it. */
export function computeSlots(input: AvailabilityInput): Slot[] {
  const day = input.workingHours[String(parseISODate(input.date).getDay())];
  if (!day) return [];

  const open = toMinutes(day.open);
  const close = toMinutes(day.close);
  const step = Math.max(5, input.slotStep || 15);

  const busy: Busy[] = input.appointments.map((a) => ({
    barber_id: a.barber_id,
    start: toMinutes(a.start_time),
    end: toMinutes(a.start_time) + a.duration_min,
  }));

  const slots: Slot[] = [];
  for (let start = open; start + input.durationMin <= close; start += step) {
    if (input.nowMinutes !== null && start <= input.nowMinutes) continue;
    const end = start + input.durationMin;

    const free = input.barberIds.filter((barberId) => {
      const clashesAppointment = busy.some(
        (b) => b.barber_id === barberId && start < b.end && end > b.start,
      );
      if (clashesAppointment) return false;
      return !input.blocks.some((bl) => {
        if (bl.barber_id !== null && bl.barber_id !== barberId) return false;
        return start < toMinutes(bl.end_time) && end > toMinutes(bl.start_time);
      });
    });

    if (free.length > 0) slots.push({ time: toHHMM(start), barberIds: free });
  }
  return slots;
}

export function googleCalendarUrl(args: {
  title: string;
  details: string;
  location: string;
  date: string;
  startTime: string;
  durationMin: number;
}): string {
  const stamp = (minutes: number) => {
    const local = new Date(`${args.date}T00:00:00`);
    local.setMinutes(local.getMinutes() + minutes);
    return `${formatDateISO(local).replace(/-/g, "")}T${toHHMM(
      local.getHours() * 60 + local.getMinutes(),
    ).replace(":", "")}00`;
  };
  const start = toMinutes(args.startTime);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: args.title,
    details: args.details,
    location: args.location,
    dates: `${stamp(start)}/${stamp(start + args.durationMin)}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function whatsappLink(phone: string, message: string): string {
  return `https://wa.me/${onlyDigits(phone)}?text=${encodeURIComponent(message)}`;
}

export const SHOP_TZ = "America/Sao_Paulo";

/** Current date (ISO) and minutes-of-day in the shop timezone. */
export function nowInShopTZ(): { dateISO: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SHOP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return {
    dateISO: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}
