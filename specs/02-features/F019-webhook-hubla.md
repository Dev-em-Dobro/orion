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

## Filtro de produto (acesso Orion = Elite do Club)

O Orion **não** é o Club. Só quem comprou **Elite** ganha `HublaEntitlement`
de acesso. PRO do Club (R$ 297) não entra. Planos pagos do Orion ([F035](F035-planos-e-limites.md))
são outra coisa — ofertas ainda não definidas; esta spec não as usa.

Mapa (`event.product.id`):

| Env | Papel no Orion |
|-----|----------------|
| `HUBLA_PRODUCT_ID` | Legado Builders Club (`VL3e0iDO3A32SyjJWr9S`). Produto antigo de R$ 997 — **concede acesso** (trata como Elite). |
| `HUBLA_PRODUCT_ID_ELITE` | Produto Elite novo (R$ 997), quando a Hubla tiver o id. **Concede acesso.** |
| `HUBLA_PRODUCT_ID_PRO` | **Não usar aqui.** No Orion essa env já é o plano Pro da F035 (hoje vazia / trial). PRO do Club (R$ 297) **não** tem env no Orion: o webhook só concede o que está na allowlist, então o evento PRO é ignorado. |

Pelo menos um ID de acesso (`HUBLA_PRODUCT_ID` ou `HUBLA_PRODUCT_ID_ELITE`) é
**obrigatório**. Sem nenhum → `503` antes de ler o corpo, na mesma checagem de
arranque do `HUBLA_WEBHOOK_TOKEN` ([F036](F036-endurecimento-de-seguranca.md)).

Evento de produto fora da allowlist → `200` ignorado, sem gravar entitlement.
Cancelamento/reembolso de um ID da allowlist → `status = revogado` (já era AC3).

> **Mudança de 2026-08-13 — [F036](F036-endurecimento-de-seguranca.md).** Antes:
> *"ausente → aceita qualquer produto (dev/local)"*. A conveniência de dev valia
> igual em produção. Agora, allowlist vazia → `503`.
>
> **Emenda de 2026-08-23.** A allowlist passou de um id só para legado + Elite.
> Sem isso, um produto PRO novo na mesma conta Hubla poderia vazar se o filtro
> voltasse a “qualquer produto”, ou se o legado fosse o único id e a Hubla
> reutilizasse a oferta. PRO Club não entra na lista; não grava entitlement.

## Cortesia Pro no grant Elite (emenda 2026-08-24)

Acesso Elite **não** é o plano Pro do Orion: o webhook de Elite continua
gravando só o `product_id` da allowlist (porta do app). Emenda da
[F035](F035-planos-e-limites.md): enquanto `HUBLA_PRODUCT_ID_PRO` estiver no
prefixo `trial-pro-`, o **mesmo** grant Elite (Hubla ou TMB) também upserta o
entitlement sintético de cortesia Pro (`trial-pro-…`), com `expires_at` =
`granted_at` + `CORTESIA_PRO_DIAS` (default **90**). Relivery / entitlement já
ativo **não** renova o relógio. Revogar o último Elite ativo revoga a cortesia.

Cortesia **não** dispara se `HUBLA_PRODUCT_ID_PRO` estiver vazio ou for um
produto Hubla real (fora do prefixo `trial-pro-`). PRO Club (R$ 297) continua
fora da allowlist.

## Modelo
- `HublaEntitlement` — unique `(email, product_id)`, e-mail normalizado
- `HublaWebhookDelivery` — idempotency keys processadas

## Critérios de aceitação
- [ ] **AC1** — Token inválido → `401`, sem gravar nada.
- [ ] **AC2** — `customer.member_added` com e-mail → entitlement `ativo`.
- [ ] **AC3** — `customer.member_removed` → entitlement `revogado`.
- [ ] **AC4** — Mesmo `x-hubla-idempotency` duas vezes → `200` na segunda, um registro.
- [ ] **AC5** — Resposta `200` rápida (< processamento síncrono leve).
- [x] **AC6** ([F036](F036-endurecimento-de-seguranca.md)) — Sem nenhum ID de
      acesso (`HUBLA_PRODUCT_ID` e `HUBLA_PRODUCT_ID_ELITE` ambos vazios) →
      `503`, sem ler o corpo e sem gravar entitlement. A checagem vem **antes**
      da validação do token.
- [ ] **AC7** — `customer.member_added` do produto legado ou
      `HUBLA_PRODUCT_ID_ELITE` → entitlement `ativo`.
- [ ] **AC8** — Evento de produto que não está na allowlist (PRO Club incluso)
      → `200` ignorado, sem gravar entitlement.
- [ ] **AC9** (emenda 2026-08-24) — `customer.member_added` Elite, com
      `HUBLA_PRODUCT_ID_PRO` no prefixo `trial-pro-`, grava também entitlement
      de cortesia Pro (`expires_at` = agora + 90 dias). Segunda entrega do
      mesmo e-mail com cortesia ainda vigente **não** empurra `granted_at` /
      `expires_at`. `member_removed` do último Elite revoga a cortesia.

## Fora do escopo (F019)
- UI de ativação pós-login → [F019.1](F019.1-ativacao-acesso.md)
- Menu de entregáveis
