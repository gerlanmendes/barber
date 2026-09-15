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

## 4. Banco de dados próprio (self-hosting)

O app conversa com o banco pela chave de serviço (`SUPABASE_SERVICE_ROLE_KEY`).
No projeto criado pela Lovable essa chave não fica acessível para cópia —
para rodar via Docker, crie um projeto **gratuito** em supabase.com:

1. Crie o projeto e copie em *Settings → API*: a URL, a `anon key` (publicável)
   e a `service_role key` (secreta — só no servidor).
2. Abra o *SQL Editor* do projeto e rode o arquivo `supabase/schema.sql`
   (ele cria as tabelas e a linha inicial de configuração).
3. Preencha o `.env` com as chaves desse projeto (não as da Lovable).
4. `docker compose up --build` → `http://localhost:3000` e configure tudo em
   `/admin` (PIN padrão `1234`).

Os dados da barbearia (nome, cores, serviços, agendamentos) ficam no banco —
para migrar o que já existe aqui, copie os dados manualmente ou recomece do
zero pelo painel.
