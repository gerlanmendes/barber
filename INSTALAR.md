# Instalar para uma barbearia (plug and play)

Este sistema é genérico: nada de nome, preço, barbeiro ou cor está fixo no código.
Cada barbearia é uma cópia independente do sistema, configurada em 2 minutos.

## Passo a passo para um cliente novo

1. Duplique/instale o projeto para o cliente (banco próprio + deploy, veja `DOCKER.md`).
2. Rode o arquivo `supabase/schema.sql` no banco desse cliente.
3. Abra o site e vá em **/instalar**.
4. Preencha: nome, frase, WhatsApp, endereço, logo, cores, código do painel, dias e horários,
   intervalo entre horários e nomes dos barbeiros.
   - Deixe marcada a opção de **serviços de exemplo** (corte R$ 50, barba R$ 40, combo R$ 80,
     pezinho R$ 20) e o cliente só ajusta os preços depois.
5. Clique em **Concluir configuração**. Pronto: já recebe agendamentos.

Depois disso, tudo é editável em **/admin** com o código escolhido: preços, duração, serviços,
barbeiros, horários, bloqueios, cores, logo e agenda.

## Reaproveitar a mesma instalação para outra barbearia

No painel `/admin` → aba **Ajustes** → seção **Entregar para outra barbearia**:
escreva `ZERAR` e confirme. Isso apaga serviços, barbeiros, bloqueios e agendamentos e
reabre o assistente `/instalar` do zero.

## O que é genérico

- Nome, frase, logo, cores, WhatsApp e endereço: banco de dados.
- Serviços, preços e durações: banco de dados.
- Barbeiros e especialidades: banco de dados.
- Horário de funcionamento e intervalo entre horários: banco de dados.
- Código de acesso do painel: definido na instalação.
