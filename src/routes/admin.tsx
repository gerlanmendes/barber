import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";

import {
  adminLogin,
  getAgenda,
  getCatalog,
  getClients,
  saveBlock,
  saveService,
  saveBarber,
  deleteBlock,
  setAppointmentStatus,
  updateShop,
} from "@/lib/admin.functions";
import { formatDateISO, formatFriendlyDate, formatPhoneBR, formatPrice } from "@/lib/slots";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Painel do barbeiro | Agenda do dia" },
      {
        name: "description",
        content:
          "Agenda do dia, bloqueios de horário, histórico de clientes e personalização da barbearia.",
      },
      { property: "og:title", content: "Painel do barbeiro | Agenda do dia" },
      {
        property: "og:description",
        content: "Gerencie a agenda do dia, bloqueios e clientes da barbearia.",
      },
    ],
  }),
  component: AdminPage,
});

const WEEK = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function AdminPage() {
  const [pin, setPin] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [tab, setTab] = useState<"agenda" | "clientes" | "ajustes">("agenda");

  useEffect(() => {
    const stored = localStorage.getItem("admin_pin");
    if (stored) setPin(stored);
  }, []);

  const login = useServerFn(adminLogin);
  const loginMutation = useMutation({
    mutationFn: (value: string) => login({ data: { pin: value } }),
    onSuccess: (_r, value) => {
      localStorage.setItem("admin_pin", value);
      setPin(value);
    },
    onError: () => toast.error("PIN inválido."),
  });

  if (!pin) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-5">
        <h1 className="text-4xl">Painel do barbeiro</h1>
        <p className="mt-1 text-sm text-muted-foreground">Digite o PIN de acesso.</p>
        <form
          className="mt-6 grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            loginMutation.mutate(pinInput.trim());
          }}
        >
          <input
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            type="password"
            inputMode="numeric"
            placeholder="PIN"
            className="h-12 rounded-lg border border-input bg-background px-3 text-center tracking-[0.4em] outline-none focus:border-primary"
          />
          <button className="btn-base btn-primary h-12" disabled={loginMutation.isPending}>
            Entrar
          </button>
          <Link to="/" className="btn-base h-10 text-sm text-muted-foreground">
            <ChevronLeft className="h-4 w-4" /> Voltar ao site
          </Link>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-20 pt-8">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-3xl">Painel</h1>
        <button
          type="button"
          className="btn-base btn-ghost h-9 px-3 text-sm"
          onClick={() => {
            localStorage.removeItem("admin_pin");
            setPin(null);
          }}
        >
          Sair
        </button>
      </header>

      <nav className="mt-5 flex gap-2">
        {(["agenda", "clientes", "ajustes"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`btn-base h-10 flex-1 px-3 text-sm capitalize ${
              tab === t ? "btn-primary" : "btn-ghost"
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "agenda" && <AgendaTab pin={pin} />}
      {tab === "clientes" && <ClientsTab pin={pin} />}
      {tab === "ajustes" && <SettingsTab pin={pin} />}
    </main>
  );
}

function AgendaTab({ pin }: { pin: string }) {
  const [date, setDate] = useState(() => formatDateISO(new Date()));
  const [blockStart, setBlockStart] = useState("12:00");
  const [blockEnd, setBlockEnd] = useState("13:00");
  const [blockReason, setBlockReason] = useState("Almoço");

  const fetchAgenda = useServerFn(getAgenda);
  const agenda = useQuery({
    queryKey: ["agenda", date, pin],
    queryFn: () => fetchAgenda({ data: { pin, date } }),
  });

  const statusFn = useServerFn(setAppointmentStatus);
  const status = useMutation({
    mutationFn: (input: { id: string; status: "confirmado" | "concluido" | "cancelado" }) =>
      statusFn({ data: { pin, ...input } }),
    onSuccess: () => agenda.refetch(),
  });

  const blockFn = useServerFn(saveBlock);
  const block = useMutation({
    mutationFn: () =>
      blockFn({
        data: { pin, barberId: null, date, start: blockStart, end: blockEnd, reason: blockReason },
      }),
    onSuccess: () => {
      toast.success("Agenda bloqueada.");
      agenda.refetch();
    },
  });

  const removeFn = useServerFn(deleteBlock);
  const remove = useMutation({
    mutationFn: (id: string) => removeFn({ data: { pin, id } }),
    onSuccess: () => agenda.refetch(),
  });

  const total = (agenda.data?.appointments ?? [])
    .filter((a) => a.status !== "cancelado")
    .reduce((sum, a) => sum + a.price_cents, 0);

  return (
    <section className="mt-6">
      <div className="flex items-center gap-3">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-11 rounded-lg border border-input bg-background px-3 outline-none focus:border-primary"
        />
        <p className="text-sm text-muted-foreground">
          {agenda.data?.appointments.length ?? 0} clientes • {formatPrice(total)}
        </p>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{formatFriendlyDate(date)}</p>

      <div className="mt-5 grid gap-3">
        {agenda.data?.appointments.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum agendamento nesse dia.</p>
        )}
        {agenda.data?.appointments.map((a) => (
          <article key={a.id} className="surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold">
                  {a.start_time} • {a.client_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {a.service_name} • {a.barber_name} • {a.duration_min} min
                </p>
                <a
                  href={`https://wa.me/55${a.client_phone}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary underline"
                >
                  {formatPhoneBR(a.client_phone)}
                </a>
              </div>
              <span className="text-sm font-semibold text-primary">
                {formatPrice(a.price_cents)}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["confirmado", "concluido", "cancelado"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => status.mutate({ id: a.id, status: s })}
                  className={`btn-base h-9 px-3 text-xs capitalize ${
                    a.status === s ? "btn-primary" : "btn-ghost"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="surface mt-8 p-4">
        <h2 className="text-2xl">Pausar agenda</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <input
            type="time"
            value={blockStart}
            onChange={(e) => setBlockStart(e.target.value)}
            className="h-11 rounded-lg border border-input bg-background px-3"
          />
          <input
            type="time"
            value={blockEnd}
            onChange={(e) => setBlockEnd(e.target.value)}
            className="h-11 rounded-lg border border-input bg-background px-3"
          />
          <input
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            placeholder="Motivo"
            className="col-span-2 h-11 rounded-lg border border-input bg-background px-3"
          />
        </div>
        <button
          type="button"
          onClick={() => block.mutate()}
          disabled={block.isPending}
          className="btn-base btn-primary mt-3 h-11 w-full"
        >
          Bloquear horário
        </button>

        <ul className="mt-4 grid gap-2">
          {agenda.data?.blocks.map((b) => (
            <li key={b.id} className="flex items-center justify-between text-sm">
              <span>
                {b.start_time}–{b.end_time} {b.reason && `• ${b.reason}`}
              </span>
              <button
                type="button"
                onClick={() => remove.mutate(b.id)}
                className="text-destructive underline"
              >
                remover
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ClientsTab({ pin }: { pin: string }) {
  const fetchClients = useServerFn(getClients);
  const clients = useQuery({
    queryKey: ["clients", pin],
    queryFn: () => fetchClients({ data: { pin } }),
  });

  return (
    <section className="mt-6 grid gap-3">
      {clients.data?.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum cliente ainda.</p>
      )}
      {clients.data?.map((c) => (
        <article key={c.phone} className="surface flex items-center justify-between gap-3 p-4">
          <div>
            <p className="font-semibold">{c.name}</p>
            <p className="text-sm text-muted-foreground">
              {formatPhoneBR(c.phone)} • último: {c.last_service} em{" "}
              {formatFriendlyDate(c.last_visit)}
            </p>
          </div>
          <span className="shrink-0 text-sm text-primary">{c.visits} visitas</span>
        </article>
      ))}
    </section>
  );
}

type ShopForm = {
  name: string;
  tagline: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  whatsapp: string;
  address: string;
  working_hours: Record<string, { open: string; close: string } | null>;
};

function SettingsTab({ pin }: { pin: string }) {
  const fetchCatalog = useServerFn(getCatalog);
  const catalog = useQuery({
    queryKey: ["catalog", pin],
    queryFn: () => fetchCatalog({ data: { pin } }),
  });

  const [form, setForm] = useState<ShopForm | null>(null);
  useEffect(() => {
    const s = catalog.data?.settings;
    if (s && !form) {
      setForm({
        name: s.name,
        tagline: s.tagline,
        logo_url: s.logo_url,
        primary_color: s.primary_color,
        secondary_color: s.secondary_color,
        whatsapp: s.whatsapp,
        address: s.address,
        working_hours: (s.working_hours ?? {}) as ShopForm["working_hours"],
      });
    }
  }, [catalog.data, form]);

  const saveFn = useServerFn(updateShop);
  const save = useMutation({
    mutationFn: (values: ShopForm) => saveFn({ data: { pin, ...values } }),
    onSuccess: async (_res, values) => {
      // Aplica as cores imediatamente, sem precisar recarregar a página.
      if (typeof document !== "undefined") {
        document.documentElement.style.setProperty("--primary", values.primary_color);
        document.documentElement.style.setProperty("--ring", values.primary_color);
        document.documentElement.style.setProperty("--brand-secondary", values.secondary_color);
      }
      await catalog.refetch();
      toast.success("Configurações salvas.");
    },
    onError: (e: Error) => toast.error(e.message),
  });


  if (!form) return <p className="mt-6 text-sm text-muted-foreground">Carregando...</p>;

  const set = <K extends keyof ShopForm>(key: K, value: ShopForm[K]) =>
    setForm({ ...form, [key]: value });

  return (
    <section className="mt-6 grid gap-4">
      <div className="surface grid gap-3 p-4">
        <h2 className="text-2xl">Identidade</h2>
        <Field label="Nome" value={form.name} onChange={(v) => set("name", v)} />
        <Field label="Slogan" value={form.tagline} onChange={(v) => set("tagline", v)} />
        <Field
          label="URL do logo"
          value={form.logo_url ?? ""}
          onChange={(v) => set("logo_url", v.trim() || null)}
        />
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <ShopLogo url={form.logo_url} name={form.name} size={48} />
          <span>
            Prévia do logo. Use um link direto de imagem (.png/.jpg/.svg, https). Se
            aparecer a tesoura, o link não é uma imagem válida.
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            Cor primária
            <input
              type="color"
              value={form.primary_color}
              onChange={(e) => set("primary_color", e.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-input bg-background"
            />
          </label>
          <label className="text-sm">
            Cor secundária
            <input
              type="color"
              value={form.secondary_color}
              onChange={(e) => set("secondary_color", e.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-input bg-background"
            />
          </label>
        </div>
        <Field label="WhatsApp" value={form.whatsapp} onChange={(v) => set("whatsapp", v)} />
        <Field label="Endereço" value={form.address} onChange={(v) => set("address", v)} />
      </div>

      <div className="surface grid gap-2 p-4">
        <h2 className="text-2xl">Funcionamento</h2>
        {WEEK.map((day, i) => {
          const hours = form.working_hours[String(i)] ?? null;
          return (
            <div key={day} className="flex items-center gap-2">
              <span className="w-20 text-sm">{day}</span>
              <input
                type="checkbox"
                checked={!!hours}
                onChange={(e) =>
                  set("working_hours", {
                    ...form.working_hours,
                    [String(i)]: e.target.checked ? { open: "09:00", close: "19:00" } : null,
                  })
                }
              />
              <input
                type="time"
                disabled={!hours}
                value={hours?.open ?? ""}
                onChange={(e) =>
                  set("working_hours", {
                    ...form.working_hours,
                    [String(i)]: { open: e.target.value, close: hours?.close ?? "19:00" },
                  })
                }
                className="h-10 flex-1 rounded-lg border border-input bg-background px-2 disabled:opacity-40"
              />
              <input
                type="time"
                disabled={!hours}
                value={hours?.close ?? ""}
                onChange={(e) =>
                  set("working_hours", {
                    ...form.working_hours,
                    [String(i)]: { open: hours?.open ?? "09:00", close: e.target.value },
                  })
                }
                className="h-10 flex-1 rounded-lg border border-input bg-background px-2 disabled:opacity-40"
              />
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => save.mutate(form)}
        disabled={save.isPending}
        className="btn-base btn-primary h-12"
      >
        Salvar configurações
      </button>

      <ServicesEditor pin={pin} services={catalog.data?.services ?? []} onSaved={catalog.refetch} />
      <BarbersEditor pin={pin} barbers={catalog.data?.barbers ?? []} onSaved={catalog.refetch} />
    </section>
  );
}

type ServiceRow = {
  id: string;
  name: string;
  description: string;
  duration_min: number;
  price_cents: number;
  active: boolean;
};

function ServicesEditor({
  pin,
  services,
  onSaved,
}: {
  pin: string;
  services: ServiceRow[];
  onSaved: () => void;
}) {
  const saveFn = useServerFn(saveService);
  const [draft, setDraft] = useState<Record<string, ServiceRow>>({});
  const [novo, setNovo] = useState(false);

  const save = useMutation({
    mutationFn: (row: Omit<ServiceRow, "id"> & { id: string | null }) =>
      saveFn({
        data: {
          pin,
          id: row.id,
          name: row.name,
          description: row.description ?? "",
          duration_min: Number(row.duration_min),
          price_cents: Number(row.price_cents),
          active: row.active,
        },
      }),
    onSuccess: () => {
      toast.success("Serviço salvo.");
      setDraft({});
      setNovo(false);
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rowOf = (s: ServiceRow) => draft[s.id] ?? s;

  return (
    <div className="surface grid gap-3 p-4">
      <h2 className="text-2xl">Serviços</h2>
      {services.map((s) => {
        const r = rowOf(s);
        return (
          <div key={s.id} className="grid gap-2 rounded-lg border border-input p-3">
            <Field
              label="Nome"
              value={r.name}
              onChange={(v) => setDraft({ ...draft, [s.id]: { ...r, name: v } })}
            />
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Duração (min)"
                value={r.duration_min}
                onChange={(v) => setDraft({ ...draft, [s.id]: { ...r, duration_min: v } })}
              />
              <NumberField
                label="Preço (R$)"
                step="0.01"
                value={r.price_cents / 100}
                onChange={(v) =>
                  setDraft({ ...draft, [s.id]: { ...r, price_cents: Math.round(v * 100) } })
                }
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={r.active}
                  onChange={(e) => setDraft({ ...draft, [s.id]: { ...r, active: e.target.checked } })}
                />
                Ativo
              </label>
              <button
                type="button"
                onClick={() => save.mutate({ ...r, id: s.id })}
                disabled={save.isPending}
                className="btn-base btn-primary h-10 px-4"
              >
                Salvar
              </button>
            </div>
          </div>
        );
      })}

      {novo ? (
        <NewServiceForm
          onCancel={() => setNovo(false)}
          onSave={(row) => save.mutate({ ...row, id: null })}
          pending={save.isPending}
        />
      ) : (
        <button type="button" onClick={() => setNovo(true)} className="btn-base btn-ghost h-11">
          + Novo serviço
        </button>
      )}
    </div>
  );
}

function NewServiceForm({
  onCancel,
  onSave,
  pending,
}: {
  onCancel: () => void;
  onSave: (row: ServiceRow) => void;
  pending: boolean;
}) {
  const [row, setRow] = useState<ServiceRow>({
    id: "",
    name: "",
    description: "",
    duration_min: 30,
    price_cents: 5000,
    active: true,
  });
  return (
    <div className="grid gap-2 rounded-lg border border-primary/40 p-3">
      <Field label="Nome" value={row.name} onChange={(v) => setRow({ ...row, name: v })} />
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Duração (min)"
          value={row.duration_min}
          onChange={(v) => setRow({ ...row, duration_min: v })}
        />
        <NumberField
          label="Preço (R$)"
          step="0.01"
          value={row.price_cents / 100}
          onChange={(v) => setRow({ ...row, price_cents: Math.round(v * 100) })}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSave(row)}
          disabled={pending || !row.name.trim()}
          className="btn-base btn-primary h-10 flex-1"
        >
          Criar
        </button>
        <button type="button" onClick={onCancel} className="btn-base btn-ghost h-10 px-4">
          Cancelar
        </button>
      </div>
    </div>
  );
}

type BarberRow = {
  id: string;
  name: string;
  specialty: string;
  photo_url: string | null;
  active: boolean;
};

function BarbersEditor({
  pin,
  barbers,
  onSaved,
}: {
  pin: string;
  barbers: BarberRow[];
  onSaved: () => void;
}) {
  const saveFn = useServerFn(saveBarber);
  const [draft, setDraft] = useState<Record<string, BarberRow>>({});
  const [novo, setNovo] = useState<BarberRow | null>(null);

  const save = useMutation({
    mutationFn: (row: Omit<BarberRow, "id"> & { id: string | null }) =>
      saveFn({
        data: {
          pin,
          id: row.id,
          name: row.name,
          specialty: row.specialty ?? "",
          photo_url: row.photo_url,
          active: row.active,
        },
      }),
    onSuccess: () => {
      toast.success("Barbeiro salvo.");
      setDraft({});
      setNovo(null);
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const render = (r: BarberRow, onChange: (row: BarberRow) => void, id: string | null) => (
    <div className="grid gap-2 rounded-lg border border-input p-3">
      <Field label="Nome" value={r.name} onChange={(v) => onChange({ ...r, name: v })} />
      <Field
        label="Especialidade"
        value={r.specialty}
        onChange={(v) => onChange({ ...r, specialty: v })}
      />
      <Field
        label="URL da foto"
        value={r.photo_url ?? ""}
        onChange={(v) => onChange({ ...r, photo_url: v || null })}
      />
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={r.active}
            onChange={(e) => onChange({ ...r, active: e.target.checked })}
          />
          Ativo
        </label>
        <button
          type="button"
          onClick={() => save.mutate({ ...r, id })}
          disabled={save.isPending || !r.name.trim()}
          className="btn-base btn-primary h-10 px-4"
        >
          Salvar
        </button>
      </div>
    </div>
  );

  return (
    <div className="surface grid gap-3 p-4">
      <h2 className="text-2xl">Barbeiros</h2>
      {barbers.map((b) => {
        const r = draft[b.id] ?? b;
        return (
          <div key={b.id}>
            {render(r, (row) => setDraft({ ...draft, [b.id]: row }), b.id)}
          </div>
        );
      })}
      {novo ? (
        render(novo, setNovo, null)
      ) : (
        <button
          type="button"
          onClick={() =>
            setNovo({ id: "", name: "", specialty: "", photo_url: null, active: true })
          }
          className="btn-base btn-ghost h-11"
        >
          + Novo barbeiro
        </button>
      )}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: string;
}) {
  return (
    <label className="text-sm">
      {label}
      <input
        type="number"
        step={step ?? "1"}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 h-11 w-full rounded-lg border border-input bg-background px-3 outline-none focus:border-primary"
      />
    </label>
  );
}


function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-11 w-full rounded-lg border border-input bg-background px-3 outline-none focus:border-primary"
      />
    </label>
  );
}
