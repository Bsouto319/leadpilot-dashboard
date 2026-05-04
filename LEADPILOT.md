# LeadPilot — AI SMS Lead Automation

## O que é

SaaS de automação de leads via SMS para brasileiros com empresas de construção/flooring nos EUA.
Leads chegam pelo Thumbtack/Angi/Google → o sistema responde em 60s, liga automaticamente e agenda visita.

---

## Como funciona

1. Lead vê anúncio com número Twilio do cliente
2. Manda SMS → sistema responde em 60s via IA
3. Liga automaticamente (TCPA-compliant — lead iniciou contato)
4. IA coleta data, horário e endereço
5. Agendamento salvo no Google Calendar
6. Sequência automática: lembrete 24h, D+3, D+7, review pós-visita

---

## Infraestrutura atual

| Componente | Detalhe |
|---|---|
| Backend API | `http://asso488k40o4gsc8c0w80gcw.31.97.240.160.sslip.io` |
| Repositório | `github.com/Bsouto319/leadpilot-api` |
| Dashboard | `leadpilot-dashboard/` (local — pendente deploy Vercel) |
| Banco de dados | Supabase `pvphgusjofufwtyiyviu` |
| VPS | `31.97.240.160` — Coolify |

---

## Webhooks Twilio configurados

- SMS: `POST /webhook/sms`
- Voz: `POST /webhook/sms` (mesmo endpoint)

---

## Primeiro cliente: Denali Custom Homes LLC

| Campo | Valor |
|---|---|
| Contato | Rodrigo |
| Telefone | +1 732-556-7962 |
| Email | denalicustomhomes@outlook.com |
| Twilio number | `+1 (941) 845-6110` |
| Niche | construction / tile |
| Timezone | America/New_York |
| Supabase client ID | `35bd1490-dfcc-4fe8-a4c2-a0f86d018659` |

---

## Compliance SMS EUA (A2P 10DLC)

- **Campaign ID:** `CMb5e221de4080d549df54fc98f2cd4075`
- **Status:** Aprovado ✅
- **Use case:** SOLE PROPRIETOR — agendamento e follow-up para leads de reforma residencial
- **Opt-in:** Lead inicia contato (MO — Mobile Originated) via plataformas de geração de leads
- **Stop keywords:** STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT

---

## Stages do lead

| Stage | Descrição |
|---|---|
| `new_lead` | SMS recebido, IA ainda não respondeu |
| `ai_responded` | IA respondeu, aguardando interesse |
| `awaiting_address` | Data confirmada, coletando endereço |
| `scheduled` | Visita agendada no Google Calendar |
| `completed` | Visita realizada |
| `no_show` | Lead não apareceu |

---

## Sequências automáticas (cron jobs)

| Job | Horário | Ação |
|---|---|---|
| Reminders | 9h | SMS 24h antes da visita |
| Follow-ups | 10h | D+3 e D+7 para leads frios |
| Reviews | 18h | Pedido de review após visita |
| No-shows | 20h | Re-engajamento de no-shows |

---

## Modelo de negócio

- Bruno compra número Twilio por cliente (~$1/mês)
- **Setup:** $200–300 por cliente
- **MRR:** $150–300/mês por cliente
- **Custo Twilio:** ~$30–50/mês → margem $100–250/mês por cliente

---

## Pendente

- [ ] Deploy dashboard no Vercel
- [ ] Conectar Google Calendar do Rodrigo (Denali)
- [ ] Configurar cron jobs via n8n ou Render
- [ ] Testar fluxo completo com SMS real
