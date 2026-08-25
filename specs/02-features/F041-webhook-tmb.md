# F041 — Webhook TMB (boleto Elite) → HublaEntitlement

## Status
Implementada — 2026-08-20 · emendada 2026-08-23 (Elite) · 2026-08-25 (PRO Club / Mentoria também acessam, plano Free)

## Objetivo
Receber webhook de vendas TMB (boleto parcelado) e gravar `HublaEntitlement`
ativo, para a liberação Orion ([F019.1](F019.1-ativacao-acesso.md)) funcionar
igual à compra Hubla.

Espelha o contrato do Club (F047 webhook TMB). Elite concede acesso **e**
cortesia Pro (F035). Mentoria `1AS249898VN` (PRO no Club) concede **acesso
Free**, sem cortesia.

**Fora de escopo:** DevQuest sazonal; ofertas pagas reais do Orion. TMB grava
o **acesso de compra** (entregáveis / ativar-acesso). Emenda F035 de
2026-08-24: grant Elite TMB, no modo `trial-pro-*`, **também** upserta a
cortesia Pro (mesmo `product_id` sintético, `expires_at` por aluno). Não usa
o PRO Club nem Mentoria `1AS249898VN` **como plano Pro** — os dois abrem a
porta no Free.

## Endpoint
`POST /api/webhooks/tmb` — público.

Auth: header `TMB_WEBHOOK_HEADER` (default `x-tmb-token`) = `TMB_WEBHOOK_TOKEN`.
Na UI TMB: **Chave** = nome do header, **Valor** = token.

## Ofertas (`code`)

| Code | No Club | No Orion |
|------|---------|----------|
| `3XB272209KV` | Elite (boleto) | **Concede acesso** + cortesia Pro se `trial-pro-*` |
| `9DW254247E5` | Elite (boleto) | **Concede acesso** + cortesia Pro se `trial-pro-*` |
| `1AS249898VN` | PRO (Mentoria) | **Concede acesso Free** — sem cortesia Pro |

Default da allowlist de **acesso** = Elite + Mentoria. Override Elite:
`TMB_ELITE_CODES` (preferido) ou `TMB_PRODUCT_CODES` (legado). Mentoria entra
sempre na porta, mesmo fora do override. Opcional: `TMB_LANCAMENTO_ID=36238`.

## Persistência
- Grant → `HublaEntitlement` com `product_id = code` TMB, `status=ativo`,
  `subscription_id = tmb:{pedido}`
- Revoke → mesmo par e-mail/code → `revogado` (só codes da allowlist)
- Idempotência: `tmb:{pedido}:{status_pedido}:{status_financeiro}` em
  `HublaWebhookDelivery`

## Verificação de compra (F019.1)
`temEntitlementAtivo` / compra aceita IDs Hubla de acesso (legado + Elite +
PRO Club) **ou** codes TMB Elite **e** Mentoria.

## Critérios
- [x] Token inválido → 401; env ausente → 503
- [x] Efetivado + Adimplente + code Elite (`3XB` / `9DW`) → entitlement ativo
- [ ] Code Mentoria `1AS249898VN` → entitlement ativo, plano Free, sem cortesia
- [x] Code fora da lista → ignorado
- [x] Cancelamento/inadimplência (code Elite) → revogado
- [x] Aluno com só entitlement TMB Elite consegue verificar compra no Orion
- [ ] Grant Elite TMB no modo `trial-pro-*` concede cortesia Pro (F035 AC28);
      Mentoria **não** recebe cortesia
