# F019 — Webhook Hubla (verificação de compra)

## Status
Implementada — 2026-07-27

## Objetivo
Receber eventos da Hubla via webhook e manter uma **lista local de e-mails
autorizados** (`HublaEntitlement`) para liberar acesso ao Orion e entregáveis
(F019.1). A Hubla não oferece API de consulta por e-mail — o webhook é a fonte.

Contrato: [hubla-webhook.md](../03-contracts/hubla-webhook.md).

## Endpoint
`POST /api/webhooks/hubla` — público, sem sessão. Autenticação via header
`x-hubla-token` (= `HUBLA_WEBHOOK_TOKEN` no servidor).

## Eventos tratados (v2)
| Tipo | Ação |
|------|------|
| `customer.member_added` | `status = ativo` (se subscription `active`) |
| `customer.member_removed` | `status = revogado` |
| `invoice.refunded` | `status = revogado` (backup) |

Demais tipos → `200` ignorado (sem efeito).

## Idempotência
Header `x-hubla-idempotency` registrado em `HublaWebhookDelivery`. Reenvio do
mesmo evento → `200` sem reprocessar.

## Filtro de produto
`HUBLA_PRODUCT_ID` é **obrigatório**: só processa eventos desse produto
(`event.product.id`).

> **Mudança de 2026-08-13 — [F036](F036-endurecimento-de-seguranca.md).** Antes:
> *"ausente → aceita qualquer produto (dev/local)"*. A conveniência de dev valia
> igual em produção — uma env não configurada transformava o webhook em porta
> de entrada pra entitlement de **qualquer** produto da conta Hubla, inclusive
> um de R$ 1. Agora, env ausente → `503` antes de qualquer processamento, na
> mesma checagem de arranque que já existia pro `HUBLA_WEBHOOK_TOKEN`.
>
> Consequência: ambiente sem a env não recebe entitlement nenhum, em vez de
> receber o errado. Local/dev define a env como qualquer outra.

## Modelo
- `HublaEntitlement` — unique `(email, product_id)`, e-mail normalizado
- `HublaWebhookDelivery` — idempotency keys processadas

## Critérios de aceitação
- [ ] **AC1** — Token inválido → `401`, sem gravar nada.
- [ ] **AC2** — `customer.member_added` com e-mail → entitlement `ativo`.
- [ ] **AC3** — `customer.member_removed` → entitlement `revogado`.
- [ ] **AC4** — Mesmo `x-hubla-idempotency` duas vezes → `200` na segunda, um registro.
- [ ] **AC5** — Resposta `200` rápida (< processamento síncrono leve).
- [x] **AC6** ([F036](F036-endurecimento-de-seguranca.md)) — Sem
      `HUBLA_PRODUCT_ID` → `503`, sem ler o corpo e sem gravar entitlement.
      A checagem vem **antes** da validação do token.

## Fora do escopo (F019)
- UI de ativação pós-login → [F019.1](F019.1-ativacao-acesso.md)
- Menu de entregáveis
