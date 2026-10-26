# F042 — Black Infinita 2026: cortesia Pro 90 dias no Orion

## Status
Em implementação — 2026-10-26

## Contexto

Quem compra as ofertas **Black Infinita 2026** no Hubla (mesmo produto Club)
recebe no Orion a **mesma cortesia Pro de 90 dias** que o Elite (`trial-pro-*`),
não um plano Pro permanente. Acesso vitalício permanente fica só no Builders
Club (F120).

## Ofertas (`offers[].id`)

| Offer id | Checkout |
|----------|----------|
| `YKPMuMwSBhPBb7UUuDlX` | Black alunos 2025 — R$ 597 |
| `NZKc6aZXwbD4ihw9vvPN` | Black alunos — R$ 797 |
| `6njIGlJgossHQysj6WA7` | Black não alunos — R$ 997 |

## Comportamento

No `classificarGrant` (webhook Hubla):

- Se `offers[].id` ∈ Black Infinita → tratar como **Elite para cortesia**:
  - `chaveEntitlement` = `product.id` do Club (porta de acesso)
  - `cortesiaPro: true` → upsert `HUBLA_PRODUCT_ID_PRO` (`trial-pro-…`) com
    `expires_at` = +90 dias (F035)

Revoke: mesmo fluxo Elite (revoga entitlement de acesso + cortesia se não
restar Elite). O Club **não** deve revogar membership vitalício (F120); se a
Hubla emitir revoke, o Orion pode perder o trial — aceitável (trial já é
temporário).

## Env

Oficiais hardcoded em `src/lib/hubla/produtos.ts`. Opcional:
`HUBLA_OFFER_ID_BLACK_INFINITA` (CSV) para ids extras.

## Critérios

- [x] Compra Black → entitlement ativo no product Club + cortesia `trial-pro-*` 90d
- [x] Plano Orion = Pro enquanto a cortesia vigorar
- [x] Oferta PRO Club normal continua **sem** cortesia
- [x] Teste unitário com payload `offers[].id` Black

## Fora de escopo

- Badge “vitalício” no Orion
- Extensão da cortesia além de 90 dias
