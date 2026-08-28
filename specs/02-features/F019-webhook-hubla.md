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

## Filtro de produto e oferta (acesso Orion = Elite **ou** PRO do Club)

O Orion **não** é o Club. Quem comprou **Elite** ou **PRO** (R$ 297) ganha
`HublaEntitlement` de **acesso**. O plano dentro do Orion continua sendo o da
[F035](F035-planos-e-limites.md): PRO Club entra como **Free** (40 Leads/mês).
Elite, no modo `trial-pro-*`, ganha cortesia Pro (abaixo). `HUBLA_PRODUCT_ID_PRO`
no Orion **não** é o produto Hubla do Club — é o plano Pro do Orion / id sintético.

**Emenda de 2026-08-25 (ofertas).** Na Hubla, PRO e Elite são **ofertas do mesmo
produto** (`event.product.id` = `VL3e0iDO3A32SyjJWr9S`, nome "Builders Club").
O checkout slug (`pay.hub.la/XaY8QNfZlOO1XBgjzMfY`) **não** aparece no webhook.
O discriminador é `event.products[].offers[].id`.

Mapa:

| Env | Papel no Orion |
|-----|----------------|
| `HUBLA_PRODUCT_ID` | Produto Club (`VL3e0iDO3A32SyjJWr9S`). Allowlist de `product.id`. **Sem** `offers[]` no payload (legado) → Elite + cortesia. **Com** `offers[]` → não usar só o product.id para cortesia. |
| `HUBLA_PRODUCT_ID_ELITE` | Produto Elite separado, se a Hubla criar um. **Concede acesso** + cortesia. |
| `HUBLA_PRODUCT_ID_CLUB_PRO` | Produto PRO **separado**, se a Hubla criar um. Acesso Free, sem cortesia. **Não** é o slug de checkout. |
| `HUBLA_OFFER_ID_PRO` | Offer id(s) do PRO R$ 297 — vírgula se houver cópia + oficial (`XaY8QNfZlOO1XBgjzMfY`, `6p9QTyJDVj2oAIzHx74E`). Acesso **Free**, sem cortesia. Grava entitlement com `product_id` = offer id. |
| `HUBLA_OFFER_ID_ELITE` | Offer id(s) do Elite R$ 997 (`v1SsMcVXNip7Mn5A2pNH`). Acesso + cortesia. |
| `HUBLA_PRODUCT_ID_PRO` | Plano Pro do **Orion** (F035). Prefixo `trial-pro-` = cortesia no grant **Elite**. Não coloque offer/product do Club aqui. |

Pelo menos um ID de **produto** (`HUBLA_PRODUCT_ID`, `HUBLA_PRODUCT_ID_ELITE` ou
`HUBLA_PRODUCT_ID_CLUB_PRO`) é **obrigatório**. Sem nenhum → `503` antes de
ler o corpo, na mesma checagem de arranque do `HUBLA_WEBHOOK_TOKEN`
([F036](F036-endurecimento-de-seguranca.md)). Offer ids não substituem o 503.

Evento de produto fora da allowlist → `200` ignorado, sem gravar entitlement.
Com `HUBLA_OFFER_ID_PRO` / `HUBLA_OFFER_ID_ELITE` setados e o evento trazendo
`offers[]`: casa PRO → Free; casa Elite → cortesia; **oferta presente que não
casou Elite → PRO Free (sem cortesia)**, nunca cortesia só pelo `product.id`
compartilhado. Payload **sem** `offers[]` (legado): `product.id` Club continua
Elite + cortesia.

> **Mudança de 2026-08-13 — [F036](F036-endurecimento-de-seguranca.md).** Antes:
> *"ausente → aceita qualquer produto (dev/local)"*. A conveniência de dev valia
> igual em produção. Agora, allowlist vazia → `503`.
>
> **Emenda de 2026-08-23.** A allowlist passou de um id só para legado + Elite.
> Sem isso, um produto PRO novo na mesma conta Hubla poderia vazar se o filtro
> voltasse a “qualquer produto”.
>
> **Emenda de 2026-08-25.** PRO Club entra via `HUBLA_OFFER_ID_PRO` (mesmo
> produto, outra oferta). `HUBLA_PRODUCT_ID_CLUB_PRO` fica só se a Hubla
> criar produto separado. Continua **fora** de `HUBLA_PRODUCT_ID_PRO`.

## Cortesia Pro no grant Elite (emenda 2026-08-24)

Acesso Elite **não** é o plano Pro do Orion: o webhook de Elite continua
gravando só o `product_id` da allowlist (porta do app). Emenda da
[F035](F035-planos-e-limites.md): enquanto `HUBLA_PRODUCT_ID_PRO` estiver no
prefixo `trial-pro-`, o **mesmo** grant Elite (Hubla ou TMB) também upserta o
entitlement sintético de cortesia Pro (`trial-pro-…`), com `expires_at` =
`granted_at` + `CORTESIA_PRO_DIAS` (default **90**). Relivery / entitlement já
ativo **não** renova o relógio. Revogar o último Elite ativo revoga a cortesia.

Cortesia **não** dispara se `HUBLA_PRODUCT_ID_PRO` estiver vazio ou for um
produto Hubla real (fora do prefixo `trial-pro-`). Grant da oferta PRO
(`HUBLA_OFFER_ID_PRO`) **não** cria cortesia — o aluno fica no Free. A cortesia
não usa o `product.id` compartilhado como prova de Elite (PRO e Elite teriam a
mesma linha).

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
      **produto** (`HUBLA_PRODUCT_ID`, `HUBLA_PRODUCT_ID_ELITE` e
      `HUBLA_PRODUCT_ID_CLUB_PRO` todos vazios) → `503`, sem ler o corpo e sem
      gravar entitlement. A checagem vem **antes** da validação do token.
- [ ] **AC7** — `customer.member_added` do produto Club, de
      `HUBLA_PRODUCT_ID_ELITE` ou de `HUBLA_OFFER_ID_PRO` → entitlement
      `ativo`.
- [ ] **AC8** — Evento de produto que não está na allowlist → `200` ignorado,
      sem gravar entitlement.
- [ ] **AC9** (emenda 2026-08-24) — `customer.member_added` Elite, com
      `HUBLA_PRODUCT_ID_PRO` no prefixo `trial-pro-`, grava também entitlement
      de cortesia Pro (`expires_at` = agora + 90 dias). Segunda entrega do
      mesmo e-mail com cortesia ainda vigente **não** empurra `granted_at` /
      `expires_at`. `member_removed` do último Elite revoga a cortesia.
- [ ] **AC10** (emenda 2026-08-25) — `customer.member_added` com oferta PRO
      (`HUBLA_OFFER_ID_PRO`, ids `XaY8QNfZlOO1XBgjzMfY` / `6p9QTyJDVj2oAIzHx74E`)
      grava acesso (`product_id` = offer id) e **não** grava cortesia
      `trial-pro-*`. Plano derivado = Free. Oferta PRO **não** casada na env mas
      presente no payload → PRO Free, **sem** cortesia (AC11).
- [ ] **AC11** (emenda 2026-08-28) — Com `offers[]` no evento, compra PRO com
      offer id igual ao checkout (`XaY8QNfZlOO1XBgjzMfY`) **não** dispara
      cortesia `trial-pro-*` mesmo que `HUBLA_OFFER_ID_PRO` esteja desatualizado.

## Fora do escopo (F019)
- UI de ativação pós-login → [F019.1](F019.1-ativacao-acesso.md)
- Menu de entregáveis
