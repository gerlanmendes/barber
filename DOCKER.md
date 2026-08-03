# Rodando localmente / via Docker

## 1. Local (dev)

```bash
npm install
npm run dev          # http://localhost:8080
```

Crie um `.env` na raiz com:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_PROJECT_ID=...
SUPABASE_URL=...
SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_PROJECT_ID=...
SUPABASE_SERVICE_ROLE_KEY=...   # obrigatório: o painel /admin usa
```

As três primeiras vão para o navegador; as demais só para o servidor.
A `SUPABASE_SERVICE_ROLE_KEY` é secreta — nunca comitar.

## 2. Docker

```bash
docker compose up --build
# http://localhost:3000
```

Ou sem compose:

```bash
docker build -t barbearia \
  --build-arg VITE_SUPABASE_URL=... \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=... \
  --build-arg VITE_SUPABASE_PROJECT_ID=... .

docker run -p 3000:3000 \
  -e SUPABASE_URL=... \
  -e SUPABASE_PUBLISHABLE_KEY=... \
  -e SUPABASE_SERVICE_ROLE_KEY=... \
  barbearia
```

O build usa `NITRO_PRESET=node-server`, gerando um servidor Node em
`.output/server/index.mjs` (o padrão do projeto é Cloudflare).

## 3. Várias barbearias

Cada barbearia = um container + um banco próprio (troque as variáveis
`SUPABASE_*`). O nome, cores, logo, serviços e barbeiros são editados em
`/admin` com o PIN.
