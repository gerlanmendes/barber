import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  createShop,
  deleteShop,
  listShops,
  ownerLogin,
  slugify,
  updatePlatform,
} from "@/lib/platform.functions";

export const Route = createFileRoute("/plataforma")({
  head: () => ({
    meta: [
      { title: "Painel do dono | Gerenciar barbearias" },
      {
        name: "description",
        content:
          "Crie, configure e remova barbearias da plataforma de agendamento, cada uma com seu próprio endereço.",
      },
      { property: "og:title", content: "Painel do dono | Gerenciar barbearias" },
      {
        property: "og:description",
        content: "Gerencie as barbearias da plataforma de agendamento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlatformAdmin,
});

function PlatformAdmin() {
  const [pin, setPin] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("owner_pin");
    if (stored) setPin(stored);
  }, []);

  const loginFn = useServerFn(ownerLogin);
  const login = useMutation({
    mutationFn: (value: string) => loginFn({ data: { pin: value } }),
    onSuccess: (_r, value) => {
      localStorage.setItem("owner_pin", value);
      setPin(value);
    },
    onError: (e: Error) => toast.error(e.message || "Código inválido."),
  });

  if (!pin) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-5">
        <h1 className="text-3xl">Painel do dono</h1>
        <p className="mt-1 text-sm text-muted-foreground">Digite seu código de dono.</p>
        <form
          className="mt-6 grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            login.mutate(pinInput.trim());
          }}
        >
          <input
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            type="password"
            inputMode="numeric"
            placeholder="Código"
            className="h-12 rounded-lg border border-input bg-background px-3 text-center tracking-[0.4em] outline-none focus:border-primary"
          />
          <button className="btn-base btn-primary h-12" disabled={login.isPending}>
            Entrar
          </button>
          <Link to="/" className="btn-base h-10 text-sm text-muted-foreground">
            Voltar
          </Link>
        </form>
      </main>
    );
  }

  return <OwnerPanel pin={pin} onLogout={() => {
    localStorage.removeItem("owner_pin");
    setPin(null);
  }} />;
}

function OwnerPanel({ pin, onLogout }: { pin: string; onLogout: () => void }) {
  const shops = useQuery({ queryKey: ["shops"], queryFn: () => listShops() });

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [adminPin, setAdminPin] = useState("1234");
  const [seed, setSeed] = useState(true);
  const [touchedSlug, setTouchedSlug] = useState(false);

  const createFn = useServerFn(createShop);
  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          ownerPin: pin,
          name: name.trim(),
          slug: slug.trim(),
          adminPin: adminPin.trim(),
          seedExamples: seed,
        },
      }),
    onSuccess: (res) => {
      toast.success("Barbearia criada.");
      setName("");
      setSlug("");
      setTouchedSlug(false);
      shops.refetch();
      if (typeof window !== "undefined") window.location.href = `/${res.slug}/instalar`;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeFn = useServerFn(deleteShop);
  const remove = useMutation({
    mutationFn: (target: string) =>
      removeFn({ data: { ownerPin: pin, slug: target, confirm: "APAGAR" } }),
    onSuccess: () => {
      toast.success("Barbearia removida.");
      shops.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [brand, setBrand] = useState("");
  const [tagline, setTagline] = useState("");
  useEffect(() => {
    if (shops.data && !brand) {
      setBrand(shops.data.platform.brand_name);
      setTagline(shops.data.platform.tagline);
    }
  }, [shops.data, brand]);

  const saveFn = useServerFn(updatePlatform);
  const savePlatform = useMutation({
    mutationFn: () =>
      saveFn({ data: { ownerPin: pin, brand_name: brand.trim(), tagline: tagline.trim() } }),
    onSuccess: () => {
      toast.success("Plataforma atualizada.");
      shops.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-20 pt-8">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-3xl">Plataforma</h1>
        <button type="button" onClick={onLogout} className="btn-base btn-ghost h-9 px-3 text-sm">
          Sair
        </button>
      </header>

      <section className="surface mt-6 grid gap-3 p-4">
        <h2 className="text-2xl">Nova barbearia</h2>
        <label className="text-sm">
          Nome
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!touchedSlug) setSlug(slugify(e.target.value));
            }}
            placeholder="Barbershop 33"
            className="mt-1 h-11 w-full rounded-lg border border-input bg-background px-3"
          />
        </label>
        <label className="text-sm">
          Endereço do site
          <input
            value={slug}
            onChange={(e) => {
              setTouchedSlug(true);
              setSlug(slugify(e.target.value));
            }}
            placeholder="barbershop33"
            className="mt-1 h-11 w-full rounded-lg border border-input bg-background px-3"
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            Ficará em /{slug || "endereco"}
          </span>
        </label>
        <label className="text-sm">
          Código do painel da barbearia (4 a 8 números)
          <input
            value={adminPin}
            onChange={(e) => setAdminPin(e.target.value)}
            inputMode="numeric"
            className="mt-1 h-11 w-full rounded-lg border border-input bg-background px-3"
          />
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={seed}
            onChange={(e) => setSeed(e.target.checked)}
            className="mt-1"
          />
          Começar com serviços e barbeiros de exemplo (editáveis depois).
        </label>
        <button
          type="button"
          onClick={() => create.mutate()}
          disabled={create.isPending || !name.trim() || !slug.trim()}
          className="btn-base btn-primary h-12 disabled:opacity-40"
        >
          {create.isPending ? "Criando..." : "Criar barbearia"}
        </button>
      </section>

      <section className="mt-8 grid gap-3">
        <h2 className="text-2xl">Barbearias</h2>
        {shops.data?.shops.map((s) => (
          <article key={s.slug} className="surface grid gap-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{s.name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  /{s.slug} • {s.setup_done ? "configurada" : "configuração pendente"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/$shop/"
                params={{ shop: s.slug }}
                className="btn-base btn-ghost h-10 px-3 text-sm"
              >
                Ver site
              </Link>
              <Link
                to="/$shop/admin"
                params={{ shop: s.slug }}
                className="btn-base btn-ghost h-10 px-3 text-sm"
              >
                Painel
              </Link>
              <Link
                to="/$shop/instalar"
                params={{ shop: s.slug }}
                className="btn-base btn-ghost h-10 px-3 text-sm"
              >
                Configurar
              </Link>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Apagar ${s.name} e todos os dados dela?`)) remove.mutate(s.slug);
                }}
                className="btn-base h-10 px-3 text-sm text-destructive"
              >
                Apagar
              </button>
            </div>
          </article>
        ))}
      </section>

      <section className="surface mt-8 grid gap-3 p-4">
        <h2 className="text-2xl">Identidade da plataforma</h2>
        <label className="text-sm">
          Nome
          <input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="mt-1 h-11 w-full rounded-lg border border-input bg-background px-3"
          />
        </label>
        <label className="text-sm">
          Frase
          <input
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            className="mt-1 h-11 w-full rounded-lg border border-input bg-background px-3"
          />
        </label>
        <button
          type="button"
          onClick={() => savePlatform.mutate()}
          disabled={savePlatform.isPending}
          className="btn-base btn-primary h-11"
        >
          Salvar
        </button>
      </section>
    </main>
  );
}
