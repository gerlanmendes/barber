# Barber store 

Atue como um Engenheiro de Software Fullstack Especialista em aplicações móveis e web ultra-leves, de alta performance e escaláveis.

Preciso da arquitetura e do código completo (ou estrutura modular) de um sistema de agendamento e atendimento para barbearias, com suporte a Web e PWA/Mobile (App). O foco principal do sistema é ser focado no cliente, extremamente fácil de usar, leve e fácil de implantar (deploy em 1 clique).

---

### 🎯 OBJETIVO PRINCIPAL

Criar um sistema "White-Label" (altamente customizável), onde cada barbearia possa definir suas cores, logo, serviços, horários, barbeiros e regras de negócio sem precisar alterar a base do código.

---

### 🛠️ STACK RECOMENDADA (Foco em Leveza e Rapidez)

- **Frontend / App (PWA):** Next.js (App Router) ou React + Vite com PWA (funciona na web e pode ser instalado no celular como App sem passar pelas lojas).

- **Estilização:** Tailwind CSS (com suporte a variáveis CSS dinâmicas para temas das barbearias).

- **Backend & Banco de Dados:** Supabase ou Firebase (Autenticação, Banco PostgreSQL em tempo real e Storage leve).

- **Deploy:** Vercel, Netlify ou Render (Deploy automático via GitHub em poucos segundos).

---

### 🎨 REQUISITOS DE CUSTOMIZAÇÃO (White-Label)

O sistema deve ler um arquivo de configuração central (ou tabela no banco) com as seguintes propriedades de personalização:

1. `barbershop_name`: Nome da barbearia.

2. `primary_color` & `secondary_color`: Cores da marca aplicadas dinamicamente no layout.

3. `logo_url`: Logo customizado.

4. `working_hours`: Dias e horários de funcionamento.

5. `barbers`: Lista de barbeiros com foto, especialidade e agenda individual.

6. `services`: Serviços (Corte, Barba, Combo) com tempo estimado e valor.

---

### 📋 FUNCIONALIDADES ESSENCIAIS

#### 1. Área do Cliente (Ultra-simples e sem fricção)

- **Agendamento em 3 passos:**

  1. Escolher o serviço.

  2. Escolher o barbeiro (ou "Qualquer um disponível").

  3. Escolher data/horário disponível e confirmar.

- **Identificação simples:** Login por WhatsApp ou número de telefone (OTP) para evitar formulários longos.

- **Meus Agendamentos:** Visualizar, reagendar ou cancelar compromissos.

- **Lembrete Automático:** Link direto para adicionar ao Google Agenda ou alerta via WhatsApp.

#### 2. Painel do Barbeiro / Admin

- **Visão de Agenda do Dia:** Dashboard limpo com lista de clientes do dia, horários e status (Confirmado, Concluído, Cancelado).

- **Gestão de Bloqueios:** Botão rápido para pausar agenda (ex: almoço, imprevistos).

- **Gestão de Clientes:** Histórico básico do cliente (último corte, preferências).

---

### 🚀 DIRETRIZES DE DESIGN & UX

- **Mobile-First:** Layout otimizado para telas pequenas de smartphones.

- **Desempenho:** Páginas com carregamento instantâneo (< 1 segundo), uso mínimo de bibliotecas externas pesadas.

- **Interface:** Clean, moderna, com tema escuro (Dark Mode por padrão) adaptável às cores do cliente.

---

### 📦 ENTREGÁVEIS ESPERADOS

1. **Estrutura de Pastas do Projeto.**

2. **Esquema do Banco de Dados (SQL do Supabase ou modelo Firebase).**

3. **Código-fonte dos componentes principais:**

   - Tela de agendamento do cliente com seleção de horários disponíveis (descontando horários já ocupados).

   - Sistema de temas dinâmicos via Tailwind CSS.

   - Painel simples da agenda do barbeiro.

4. **Instruções passo a passo de como fazer o deploy gratuito na Vercel/Supabase.**

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://fresh-snap-book.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d329ed18-9994-4848-8590-46807733f014).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
