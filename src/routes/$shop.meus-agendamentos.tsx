import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";

import { ShopTheme } from "@/components/ShopTheme";
import { getShopData, getMyAppointments, cancelMyAppointment } from "@/lib/booking.functions";
import {
  formatFriendlyDate,
  formatPhoneBR,
  formatPrice,
  googleCalendarUrl,
  onlyDigits,
} from "@/lib/slots";

const shopQuery = (slug: string) =>
  queryOptions({ queryKey: ["shop", slug], queryFn: () => getShopData({ data: { slug } }) });

export const Route = createFileRoute("/$shop/meus-agendamentos")({
  head: () => ({
    meta: [
      { title: "Meus agendamentos | Barbearia Navalha" },
      {
        name: "description",
        content:
          "Consulte, reagende ou cancele seus horários na barbearia usando apenas o seu WhatsApp.",
      },
      { property: "og:title", content: "Meus agendamentos | Barbearia Navalha" },
      {
        property: "og:description",
        content: "Consulte e cancele seus horários usando apenas o seu WhatsApp.",
      },
    ],
  }),
  loader: ({ context, params }) => {
    context.queryClient.ensureQueryData(shopQuery(params.shop));
  },
  component: MyAppointments,
});

function MyAppointments() {
  const { shop: slug } = Route.useParams();
  const { data } = useSuspenseQuery(shopQuery(slug));
  const shop = data?.shop;

  const [phone, setPhone] = useState("");
  const [search, setSearch] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(`cliente_telefone_${slug}`);
    if (stored) {
      setPhone(formatPhoneBR(stored));
      setSearch(stored);
    }
  }, []);

  const fetchMine = useServerFn(getMyAppointments);
  const list = useQuery({
    queryKey: ["my-appointments", search],
    enabled: !!search,
    queryFn: () => fetchMine({ data: { slug, phone: search! } }),
  });

  const cancelFn = useServerFn(cancelMyAppointment);
  const cancel = useMutation({
    mutationFn: (id: string) => cancelFn({ data: { slug, id, phone: search! } }),
    onSuccess: () => {
      toast.success("Agendamento cancelado.");
      list.refetch();
    },
    onError: () => toast.error("Não foi possível cancelar."),
  });

  if (!shop) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-lg items-center justify-center px-5 text-center">
        <p>Barbearia não encontrada.</p>
      </main>
    );
  }

  return (
    <>
      <ShopTheme shop={shop} />
      <main className="mx-auto w-full max-w-lg px-5 pb-20 pt-8">
        <Link to="/$shop/" params={{ shop: slug }} className="btn-base h-9 px-2 text-sm text-muted-foreground">
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Link>
        <h1 className="mt-3 text-4xl">Meus agendamentos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Informe o WhatsApp usado no agendamento.
        </p>

        <form
          className="mt-5 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const digits = onlyDigits(phone);
            if (digits.length < 10) {
              toast.error("Informe o WhatsApp com DDD.");
              return;
            }
            localStorage.setItem(`cliente_telefone_${slug}`, digits);
            setSearch(digits);
          }}
        >
          <input
            value={phone}
            onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
            inputMode="numeric"
            placeholder="(11) 99999-9999"
            className="h-12 flex-1 rounded-lg border border-input bg-background px-3 outline-none focus:border-primary"
          />
          <button type="submit" className="btn-base btn-primary h-12 px-5">
            Buscar
          </button>
        </form>

        {list.isFetching && <p className="mt-6 text-sm text-muted-foreground">Carregando...</p>}
        {list.data?.length === 0 && (
          <p className="mt-6 text-sm text-muted-foreground">Nenhum agendamento encontrado.</p>
        )}

        <div className="mt-6 grid gap-3">
          {list.data?.map((a) => (
            <article key={a.id} className="surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{a.service_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFriendlyDate(a.date)} às {a.start_time} • {a.barber_name}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    a.status === "cancelado"
                      ? "bg-destructive/15 text-destructive"
                      : a.status === "concluido"
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary/15 text-primary"
                  }`}
                >
                  {a.status}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{formatPrice(a.price_cents)}</p>
              {a.status === "confirmado" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    className="btn-base btn-ghost h-10 px-3 text-sm"
                    href={googleCalendarUrl({
                      title: `${a.service_name} — ${shop.name}`,
                      details: `Com ${a.barber_name}`,
                      location: shop.address,
                      date: a.date,
                      startTime: a.start_time,
                      durationMin: a.duration_min,
                    })}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Google Agenda
                  </a>
                  <Link to="/$shop/" params={{ shop: slug }} className="btn-base btn-ghost h-10 px-3 text-sm">
                    Reagendar
                  </Link>
                  <button
                    type="button"
                    onClick={() => cancel.mutate(a.id)}
                    disabled={cancel.isPending}
                    className="btn-base h-10 px-3 text-sm text-destructive"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </main>
    </>
  );
}
