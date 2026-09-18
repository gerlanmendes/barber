import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Scissors } from "lucide-react";

import { ShopLogo } from "@/components/ShopLogo";
import { listShops } from "@/lib/platform.functions";

const shopsQuery = queryOptions({ queryKey: ["shops"], queryFn: () => listShops() });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Barbearias parceiras | Agende seu corte online" },
      {
        name: "description",
        content:
          "Escolha a barbearia e agende corte ou barba em poucos toques, sem cadastro e direto do celular.",
      },
      { property: "og:title", content: "Barbearias parceiras | Agende seu corte online" },
      {
        property: "og:description",
        content: "Escolha a barbearia e agende seu horário em poucos toques.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(shopsQuery);
  },
  component: PlatformHome,
});

function PlatformHome() {
  const { data } = useSuspenseQuery(shopsQuery);
  const { platform, shops } = data;

  return (
    <main className="mx-auto w-full max-w-lg px-5 pb-20 pt-10">
      <header className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-xl bg-primary/15">
          <Scissors className="size-6 text-primary" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-3xl leading-tight">{platform.brand_name}</h1>
          <p className="truncate text-sm text-muted-foreground">{platform.tagline}</p>
        </div>
      </header>

      <h2 className="mt-9 text-2xl">Escolha a barbearia</h2>
      <div className="mt-4 grid gap-3">
        {shops.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma barbearia cadastrada ainda. Use o painel de dono para criar a primeira.
          </p>
        )}
        {shops.map((shop) => (
          <Link
            key={shop.slug}
            to="/$shop/"
            params={{ shop: shop.slug }}
            className="choice-card flex items-center gap-3"
          >
            <ShopLogo url={shop.logo_url} name={shop.name} size={48} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{shop.name}</p>
              <p className="truncate text-sm text-muted-foreground">
                {shop.setup_done ? shop.tagline || shop.address : "Configuração pendente"}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <footer className="mt-12 text-center text-xs text-muted-foreground">
        <Link to="/plataforma" className="underline">
          Painel do dono da plataforma
        </Link>
      </footer>
    </main>
  );
}
