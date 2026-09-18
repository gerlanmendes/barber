import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CheckCircle2, Scissors } from "lucide-react";
import { toast } from "sonner";

import { getSetupState, runSetup } from "@/lib/setup.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/$shop/instalar")({
  head: () => ({
    meta: [
      { title: "Configurar a barbearia | Instalação em 2 minutos" },
      {
        name: "description",
        content:
          "Assistente de instalação: coloque o nome da barbearia, horários, serviços e barbeiros e comece a receber agendamentos.",
      },
      { property: "og:title", content: "Configurar a barbearia" },
      {
        property: "og:description",
        content: "Assistente de instalação do sistema de agendamento para barbearias.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SetupPage,
});

const DAYS = [
  { key: "mon", label: "Seg" },
  { key: "tue", label: "Ter" },
  { key: "wed", label: "Qua" },
  { key: "thu", label: "Qui" },
  { key: "fri", label: "Sex" },
  { key: "sat", label: "Sáb" },
  { key: "sun", label: "Dom" },
] as const;

type DayKey = (typeof DAYS)[number]["key"];

function SetupPage() {
  const { shop: slug } = Route.useParams();
  const router = useRouter();
  const state = useQuery({
    queryKey: ["setup-state", slug],
    queryFn: () => getSetupState({ data: { slug } }),
  });

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("Estilo e precisão");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");
  const [logo, setLogo] = useState("");
  const [primary, setPrimary] = useState("#d4a017");
  const [secondary, setSecondary] = useState("#1c1917");
  const [pin, setPin] = useState("1234");
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("19:00");
  const [openDays, setOpenDays] = useState<DayKey[]>(["mon", "tue", "wed", "thu", "fri", "sat"]);
  const [slotStep, setSlotStep] = useState(15);
  const [seed, setSeed] = useState(true);
  const [barbers, setBarbers] = useState("");
  const [done, setDone] = useState(false);

  const save = useServerFn(runSetup);
  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          slug,
          name: name.trim(),
          tagline: tagline.trim(),
          whatsapp: whatsapp.trim(),
          address: address.trim(),
          logo_url: logo.trim() || null,
          primary_color: primary,
          secondary_color: secondary,
          pin: pin.trim(),
          openTime,
          closeTime,
          openDays,
          slot_step: slotStep,
          seedExamples: seed,
          barberNames: barbers
            .split(/[,\n]/)
            .map((n) => n.trim())
            .filter(Boolean),
        },
      }),
    onSuccess: () => {
      setDone(true);
      router.invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível salvar."),
  });

  if (state.isPending && !done) {
    return (
      <Shell>
        <p className="text-muted-foreground">Carregando...</p>
      </Shell>
    );
  }

  if (state.data?.setupDone && !done) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold">Já está tudo configurado</h1>
        <p className="mt-2 text-muted-foreground">
          A barbearia <strong>{state.data.shopName}</strong> já foi configurada. Para mudar preços,
          horários ou barbeiros, entre no painel.
        </p>
        <div className="mt-6 flex gap-3">
          <Button asChild>
            <a href={`/${slug}/admin`}>Abrir o painel</a>
          </Button>
          <Button variant="outline" asChild>
            <a href={`/${slug}`}>Ver o site</a>
          </Button>
        </div>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell>
        <CheckCircle2 className="size-10 text-primary" />
        <h1 className="mt-3 text-2xl font-bold">Pronto! {name} está no ar.</h1>
        <p className="mt-2 text-muted-foreground">
          Já pode receber agendamentos. Ajuste preços, serviços e barbeiros no painel com o código{" "}
          <strong>{pin}</strong>.
        </p>
        <div className="mt-6 flex gap-3">
          <Button asChild>
            <a href={`/${slug}/admin`}>Abrir o painel</a>
          </Button>
          <Button variant="outline" asChild>
            <a href={`/${slug}`}>Ver o site do cliente</a>
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-primary/15">
          <Scissors className="size-5 text-primary" />
        </span>
        <div>
          <h1 className="text-2xl font-bold leading-tight">Configurar a barbearia</h1>
          <p className="text-sm text-muted-foreground">
            Preencha uma vez e o sistema fica pronto para usar.
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            A barbearia
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome*">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Barbearia do Zé" />
            </Field>
            <Field label="Frase de efeito">
              <Input value={tagline} onChange={(e) => setTagline(e.target.value)} />
            </Field>
            <Field label="WhatsApp">
              <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="85999999999" />
            </Field>
            <Field label="Endereço">
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </Field>
            <Field label="Logo (link direto da imagem)">
              <Input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://.../logo.png" />
            </Field>
            <Field label="Código do painel (4 a 8 números)">
              <Input value={pin} onChange={(e) => setPin(e.target.value)} inputMode="numeric" />
            </Field>
          </div>
          <div className="flex gap-4">
            <Field label="Cor principal">
              <input
                type="color"
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
                className="h-10 w-20 rounded-md border border-input bg-background"
              />
            </Field>
            <Field label="Cor de fundo">
              <input
                type="color"
                value={secondary}
                onChange={(e) => setSecondary(e.target.value)}
                className="h-10 w-20 rounded-md border border-input bg-background"
              />
            </Field>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Horário de funcionamento
          </h2>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d) => {
              const on = openDays.includes(d.key);
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() =>
                    setOpenDays((prev) =>
                      on ? prev.filter((k) => k !== d.key) : [...prev, d.key],
                    )
                  }
                  className={`rounded-lg border px-3 py-2 text-sm transition ${
                    on
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-input text-muted-foreground"
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Abre às">
              <Input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} />
            </Field>
            <Field label="Fecha às">
              <Input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} />
            </Field>
            <Field label="Intervalo entre horários (min)">
              <Input
                type="number"
                min={5}
                max={60}
                step={5}
                value={slotStep}
                onChange={(e) => setSlotStep(Number(e.target.value) || 15)}
              />
            </Field>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Serviços e equipe
          </h2>
          <label className="flex items-start gap-3 rounded-lg border border-input p-3 text-sm">
            <input
              type="checkbox"
              checked={seed}
              onChange={(e) => setSeed(e.target.checked)}
              className="mt-1 size-4 accent-[var(--primary)]"
            />
            <span>
              Começar com serviços de exemplo (corte, barba, combo, pezinho) já com preço e duração —
              você edita depois no painel.
            </span>
          </label>
          <Field label="Nomes dos barbeiros (separados por vírgula)">
            <Input
              value={barbers}
              onChange={(e) => setBarbers(e.target.value)}
              placeholder="Rafael, Bruno, Diego"
            />
          </Field>
        </section>

        <Button
          className="w-full"
          size="lg"
          disabled={!name.trim() || !/^\d{4,8}$/.test(pin.trim()) || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Salvando..." : "Concluir configuração"}
        </Button>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-10">{children}</main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
