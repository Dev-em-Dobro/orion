# F041 — Webhook TMB (boleto Elite) → HublaEntitlement

## Status
Implementada — 2026-08-20 · emendada 2026-08-23 (só Elite libera Orion)

## Objetivo
Receber webhook de vendas TMB (boleto parcelado) e gravar `HublaEntitlement`
ativo, para a liberação Orion ([F019.1](F019.1-ativacao-acesso.md)) funcionar
igual à compra Hubla Elite — sem n8n escrevendo no banco.

Espelha o contrato do Club (F047 webhook TMB), **filtrado**: no Club, Mentoria
é PRO e o boleto R$ 1.297 é Elite. No Orion só Elite entra.

**Fora de escopo:** DevQuest sazonal; ofertas pagas reais do Orion. TMB grava
o **acesso de compra** (entregáveis / ativar-acesso). Emenda F035 de
2026-08-24: grant Elite TMB, no modo `trial-pro-*`, **também** upserta a
cortesia Pro (mesmo `product_id` sintético, `expires_at` por aluno). Não usa
o PRO Club nem Mentoria `1AS249898VN`.

## Endpoint
`POST /api/webhooks/tmb` — público.

Auth: header `TMB_WEBHOOK_HEADER` (default `x-tmb-token`) = `TMB_WEBHOOK_TOKEN`.
Na UI TMB: **Chave** = nome do header, **Valor** = token.

## Ofertas (`code`)

| Code | No Club | No Orion |
|------|---------|----------|
| `3XB272209KV` | Elite (boleto) | **Concede acesso** |
| `9DW254247E5` | Elite (boleto) | **Concede acesso** |
| `1AS249898VN` | PRO (Mentoria) | **Ignora** — não grava entitlement |

Default da allowlist = os dois codes Elite. Override: `TMB_ELITE_CODES` (preferido)
ou `TMB_PRODUCT_CODES` (legado). `1AS249898VN` é sempre excluído, mesmo que
alguém o coloque no override. Opcional: `TMB_LANCAMENTO_ID=36238`.

## Persistência
- Grant → `HublaEntitlement` com `product_id = code` TMB, `status=ativo`,
  `subscription_id = tmb:{pedido}`
- Revoke → mesmo par e-mail/code → `revogado` (só codes da allowlist)
- Idempotência: `tmb:{pedido}:{status_pedido}:{status_financeiro}` em
  `HublaWebhookDelivery`

## Verificação de compra (F019.1)
`temEntitlementAtivo` / compra aceita IDs Hubla de acesso (legado + Elite)
**ou** codes TMB Elite. Mentoria `1AS249898VN` não conta.

## Critérios
- [x] Token inválido → 401; env ausente → 503
- [x] Efetivado + Adimplente + code Elite (`3XB` / `9DW`) → entitlement ativo
- [ ] Code Mentoria `1AS249898VN` → ignorado, sem gravar entitlement
- [x] Code fora da lista → ignorado
- [x] Cancelamento/inadimplência (code Elite) → revogado
- [x] Aluno com só entitlement TMB Elite consegue verificar compra no Orion
- [ ] Grant Elite TMB no modo `trial-pro-*` concede cortesia Pro (F035 AC28);
      Mentoria continua ignorada
