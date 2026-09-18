import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { CalendarPlus, CheckCircle2, ChevronLeft, Clock, MessageCircle, Scissors } from "lucide-react";
import { toast } from "sonner";

import { ShopTheme } from "@/components/ShopTheme";
import { ShopLogo } from "@/components/ShopLogo";
import { getShopData, getAvailability, createAppointment } from "@/lib/booking.functions";
import {
  formatDateISO,
  formatFriendlyDate,
  formatPhoneBR,
  formatPrice,
  googleCalendarUrl,
  onlyDigits,
  weekdayShort,
  whatsappLink,
} from "@/lib/slots";

const shopQuery = (slug: string) =>
  queryOptions({ queryKey: ["shop", slug], queryFn: () => getShopData({ data: { slug } }) });

export const Route = createFileRoute("/$shop/")({
  head: () => ({
    meta: [
      { title: "Agende seu corte online | Barbearia" },
      {
        name: "description",
        content:
          "Agende corte e barba em 3 passos: escolha o serviço, o barbeiro e o horário. Rápido, sem cadastro e direto do celular.",
      },
      { property: "og:title", content: "Agende seu corte online" },
      {
        property: "og:description",
        content: "Agendamento online da barbearia em 3 passos, direto do celular.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context, params }) => {
    context.queryClient.ensureQueryData(shopQuery(params.shop));
  },
  component: BookingPage,
});

function nextDays(count: number) {
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return formatDateISO(d);
  });
}

type Confirmed = {
  barberName: string;
  serviceName: string;
  date: string;
  time: string;
  durationMin: number;
  priceCents: number;
};

function BookingPage() {
  const { shop: slug } = Route.useParams();
  const { data } = useSuspenseQuery(shopQuery(slug));

  if (!data) return <NotFoundShop />;

  const { shop, barbers, services } = data;

  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [date, setDate] = useState(() => formatDateISO(new Date()));
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmed, setConfirmed] = useState<Confirmed | null>(null);

  const days = useMemo(() => nextDays(14), []);
  const service = services.find((s) => s.id === serviceId) ?? null;

  const fetchAvailability = useServerFn(getAvailability);
  const availability = useQuery({
    queryKey: ["availability", date, serviceId, barberId],
    enabled: step === 3 && !!serviceId,
    queryFn: () =>
      fetchAvailability({ data: { slug, date, serviceId: serviceId!, barberId: barberId ?? null } }),
  });

  const book = useServerFn(createAppointment);
  const mutation = useMutation({
    mutationFn: (input: {
      date: string;
      time: string;
      serviceId: string;
      barberId: string | null;
      clientName: string;
      clientPhone: string;
    }) => book({ data: { slug, ...input } }),
    onSuccess: (result, vars) => {
      setConfirmed({
        barberName: result.barberName,
        serviceName: service?.name ?? "",
        date: vars.date,
        time: vars.time,
        durationMin: service?.duration_min ?? 30,
        priceCents: service?.price_cents ?? 0,
      });
      if (typeof window !== "undefined") {
        localStorage.setItem("cliente_telefone", onlyDigits(vars.clientPhone));
        localStorage.setItem("cliente_nome", vars.clientName);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Não foi possível concluir o agendamento.");
      availability.refetch();
    },
  });

  if (confirmed) {
    return (
      <>
        <ShopTheme shop={shop} />
        <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center px-5 py-10 text-center">
          <CheckCircle2 className="h-16 w-16 text-primary" />
          <h1 className="mt-5 text-4xl">Agendamento confirmado</h1>
          <p className="mt-2 text-muted-foreground">
            {formatFriendlyDate(confirmed.date)} às {confirmed.time} com {confirmed.barberName}
          </p>
          <div className="surface mt-6 w-full p-5 text-left">
            <Row label="Serviço" value={confirmed.serviceName} />
            <Row label="Duração" value={`${confirmed.durationMin} min`} />
            <Row label="Valor" value={formatPrice(confirmed.priceCents)} />
            <Row label="Local" value={shop.address} />
          </div>
          <div className="mt-6 grid w-full gap-3">
            <a
              className="btn-base btn-primary h-12 px-4"
              href={googleCalendarUrl({
                title: `${confirmed.serviceName} — ${shop.name}`,
                details: `Com ${confirmed.barberName}`,
                location: shop.address,
                date: confirmed.date,
                startTime: confirmed.time,
                durationMin: confirmed.durationMin,
              })}
              target="_blank"
              rel="noreferrer"
            >
              <CalendarPlus className="h-5 w-5" /> Adicionar ao Google Agenda
            </a>
            {shop.whatsapp && (
              <a
                className="btn-base btn-ghost h-12 px-4"
                href={whatsappLink(
                  shop.whatsapp,
                  `Olá! Confirmei meu horário: ${confirmed.serviceName} em ${formatFriendlyDate(confirmed.date)} às ${confirmed.time}.`,
                )}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="h-5 w-5" /> Falar no WhatsApp
              </a>
            )}
            <Link to="/$shop/meus-agendamentos" params={{ shop: slug }} className="btn-base btn-ghost h-12 px-4">
              Ver meus agendamentos
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <ShopTheme shop={shop} />
      <main className="mx-auto w-full max-w-lg px-5 pb-28 pt-8">
        {shop.setup_done === false && (
          <a
            href={`/${slug}/instalar`}
            className="mb-5 block rounded-xl border border-primary/40 bg-primary/10 p-4 text-sm"
          >
            <strong>Esta barbearia ainda não foi configurada.</strong>
            <br />
            Toque aqui para colocar o nome, horários, serviços e barbeiros em 2 minutos.
          </a>
        )}
        <header className="flex items-center gap-3">
          <ShopLogo url={shop.logo_url} name={shop.name} size={48} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-3xl leading-none">{shop.name}</h1>
            <p className="truncate text-sm text-muted-foreground">{shop.tagline}</p>
          </div>
          <Link to="/$shop/meus-agendamentos" params={{ shop: slug }} className="btn-base btn-ghost h-10 px-3 text-sm">
            Meus horários
          </Link>
        </header>

        <ol className="mt-7 flex items-center gap-2">
          {["Serviço", "Barbeiro", "Horário"].map((label, i) => {
            const index = i + 1;
            const active = step >= index;
            return (
              <li key={label} className="flex flex-1 flex-col gap-2">
                <span
                  className={`h-1 rounded-full ${active ? "bg-primary" : "bg-secondary"}`}
                  aria-hidden
                />
                <span
                  className={`text-xs font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}
                >
                  {index}. {label}
                </span>
              </li>
            );
          })}
        </ol>

        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="btn-base mt-5 h-9 px-2 text-sm text-muted-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> Voltar
          </button>
        )}

        {step === 1 && (
          <section className="mt-5 grid gap-3">
            <h2 className="text-2xl">Qual serviço você quer?</h2>
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setServiceId(s.id);
                  setTime(null);
                  setStep(2);
                }}
                className={`choice-card ${serviceId === s.id ? "choice-card-selected" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{s.name}</p>
                    <p className="text-sm text-muted-foreground">{s.description}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" /> {s.duration_min} min
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold text-primary">
                    {formatPrice(s.price_cents)}
                  </span>
                </div>
              </button>
            ))}
          </section>
        )}

        {step === 2 && (
          <section className="mt-5 grid gap-3">
            <h2 className="text-2xl">Com quem você quer cortar?</h2>
            <button
              type="button"
              onClick={() => {
                setBarberId(null);
                setTime(null);
                setStep(3);
              }}
              className={`choice-card ${barberId === null ? "choice-card-selected" : ""}`}
            >
              <p className="font-semibold">Qualquer um disponível</p>
              <p className="text-sm text-muted-foreground">Mais horários livres para escolher</p>
            </button>
            {barbers.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setBarberId(b.id);
                  setTime(null);
                  setStep(3);
                }}
                className={`choice-card ${barberId === b.id ? "choice-card-selected" : ""}`}
              >
                <div className="flex items-center gap-3">
                  {b.photo_url ? (
                    <img
                      src={b.photo_url}
                      alt={b.name}
                      loading="lazy"
                      width={44}
                      height={44}
                      className="h-11 w-11 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary">
                      {b.name.charAt(0)}
                    </span>
                  )}
                  <div>
                    <p className="font-semibold">{b.name}</p>
                    <p className="text-sm text-muted-foreground">{b.specialty}</p>
                  </div>
                </div>
              </button>
            ))}
          </section>
        )}

        {step === 3 && (
          <section className="mt-5">
            <h2 className="text-2xl">Escolha data e horário</h2>

            <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-2">
              {days.map((d) => {
                const selected = d === date;
                const day = Number(d.slice(8, 10));
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDate(d);
                      setTime(null);
                    }}
                    className={`flex w-16 shrink-0 flex-col items-center rounded-xl border px-2 py-2 ${
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card"
                    }`}
                  >
                    <span className="text-xs uppercase">{weekdayShort(d)}</span>
                    <span className="text-lg font-bold leading-tight">{day}</span>
                  </button>
                );
              })}
            </div>

            {availability.isPending && (
              <p className="mt-6 text-sm text-muted-foreground">Buscando horários...</p>
            )}
            {availability.data?.length === 0 && (
              <p className="mt-6 text-sm text-muted-foreground">
                Nenhum horário livre nesse dia. Tente outra data.
              </p>
            )}
            {!!availability.data?.length && (
              <div className="mt-5 grid grid-cols-4 gap-2">
                {availability.data.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    onClick={() => setTime(slot.time)}
                    className={`slot-chip ${time === slot.time ? "slot-chip-selected" : ""}`}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            )}

            {time && (
              <form
                className="surface mt-6 grid gap-3 p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (onlyDigits(phone).length < 10) {
                    toast.error("Informe um WhatsApp válido com DDD.");
                    return;
                  }
                  mutation.mutate({
                    date,
                    time,
                    serviceId: serviceId!,
                    barberId,
                    clientName: name.trim(),
                    clientPhone: onlyDigits(phone),
                  });
                }}
              >
                <p className="text-sm text-muted-foreground">
                  {service?.name} • {formatFriendlyDate(date)} às {time}
                </p>
                <input
                  required
                  minLength={2}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="h-12 rounded-lg border border-input bg-background px-3 outline-none focus:border-primary"
                />
                <input
                  required
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
                  placeholder="WhatsApp (DDD + número)"
                  className="h-12 rounded-lg border border-input bg-background px-3 outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="btn-base btn-primary h-12"
                >
                  {mutation.isPending ? "Confirmando..." : "Confirmar agendamento"}
                </button>
              </form>
            )}
          </section>
        )}

        <footer className="mt-12 text-center text-xs text-muted-foreground">
          <p>{shop.address}</p>
          <Link to="/$shop/admin" params={{ shop: slug }} className="mt-2 inline-block underline">
            Painel do barbeiro
          </Link>
        </footer>
      </main>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

function NotFoundShop() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center px-5 text-center">
      <h1 className="text-3xl">Barbearia não encontrada</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Confira o endereço ou volte para a lista de barbearias.
      </p>
      <Link to="/" className="btn-base btn-primary mt-6 h-12 px-5">
        Ver barbearias
      </Link>
    </main>
  );
}
