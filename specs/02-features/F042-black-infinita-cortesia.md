# F042 — Black Infinita 2026: cortesia Pro de 1 ano no Orion

## Status
Em implementação — 2026-10-26. Emenda de 2026-11-04: duração de 1 ano.

## Contexto

Quem compra as ofertas **Black Infinita 2026** no Hubla (mesmo produto Club)
recebe no Orion **1 ano de cortesia Pro** (`trial-pro-*`),
não um plano Pro permanente. Acesso vitalício permanente fica só no Builders
Club (F120).

## Ofertas (`offers[].id`)

| Offer id | Checkout |
|----------|----------|
| `YKPMuMwSBhPBb7UUuDlX` | Black alunos 2025 — R$ 597 |
| `NZKc6aZXwbD4ihw9vvPN` | Black alunos — R$ 797 |
| `6njIGlJgossHQysj6WA7` | Black não alunos — R$ 997 |

Produto catalog Hubla: `hXQcK8O5fZGvRK4RVMxJ` (DevQuest 2.0 - Black Friday).
Às vezes `event.product.id` **é o offer id** (não o catalog); o filtro de
acesso aceita catalog + offer ids Black (e qualquer offer Elite/PRO conhecida).

## Comportamento

No `classificarGrant` (webhook Hubla):

- Se `offers[].id` ∈ Black Infinita (ou `product.id` é um desses offers) →
  tratar como **Elite para cortesia**:
  - `chaveEntitlement` = product/offer id do evento (porta de acesso)
  - `cortesiaPro: true` → upsert `HUBLA_PRODUCT_ID_PRO` (`trial-pro-…`) com
    `expires_at` = fim do dia (America/Sao_Paulo) do aniversário de 1 ano do grant
    (F035). A duração geral do Elite continua em `CORTESIA_PRO_DIAS` (90 por padrão).
  - Redelivery não renova uma cortesia já vigente. Se o aluno tinha uma
    cortesia vigente mais curta, a compra Black estende o fim até pelo menos
    1 ano após essa compra, sem encurtar um prazo maior.
  - Payload legado sem `offers[]` do produto Black Friday também usa 1 ano,
    pois esse produto hospeda somente as três ofertas acima.
  - O aviso do Orion mostra **1 ano** e a data individual de fim para essa
    compra; para as outras ofertas, mantém a duração padrão.

Revoke: mesmo fluxo Elite (revoga entitlement de acesso + cortesia se não
restar Elite). O Club **não** deve revogar membership vitalício (F120); se a
Hubla emitir revoke, o Orion pode perder o trial — aceitável (trial já é
temporário).

## Env

Oficiais hardcoded em `src/lib/hubla/produtos.ts`:
- `HUBLA_PRODUCT_ID_BLACK_FRIDAY` = `hXQcK8O5fZGvRK4RVMxJ` (hardcoded + opcional env)
- `HUBLA_OFFER_ID_BLACK_INFINITA` (CSV) para ids extras

## Critérios

- [x] Compra Black → entitlement ativo no product Club + cortesia `trial-pro-*` 1 ano
- [x] Plano Orion = Pro enquanto a cortesia vigorar
- [x] Oferta PRO Club normal continua **sem** cortesia
- [x] Teste unitário com payload `offers[].id` Black

## Fora de escopo

- Badge “vitalício” no Orion
- Alteração de cortesia para as demais ofertas Elite

## Correção retroativa (2026-11-04)

Compras das três ofertas entre **2026-10-28 00:00** e o fim de
**2026-11-04** (America/Sao_Paulo) têm `expires_at` corrigido para o fim do
dia do aniversário de 1 ano de `granted_at`. Selecionar somente entitlement
de acesso ativo do produto Black Friday e trial sintético ativo; preservar
prazo maior e não reativar acesso revogado. O produto Black Friday hospeda
exclusivamente essas três ofertas. A correção deve ser idempotente e ter
prévia antes de gravar.
