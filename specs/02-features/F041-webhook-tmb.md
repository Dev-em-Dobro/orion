# F041 — Webhook TMB (Mentoria Freela) → HublaEntitlement

## Status
Implementada — 2026-08-20

## Objetivo
Receber webhook de vendas TMB (boleto parcelado / Mentoria Freela) e gravar
`HublaEntitlement` ativo, para a liberação Orion ([F019.1](F019.1-ativacao-acesso.md))
funcionar igual à compra Hubla — sem n8n escrevendo no banco.

Espelha o contrato do Club (F047 webhook TMB Mentoria).

**Fora de escopo:** DevQuest sazonal; planos Pro/Agência (F035) — TMB Mentoria
alimenta o **acesso de compra** (entregáveis / ativar-acesso), não o mapa
`HUBLA_PRODUCT_ID_PRO`.

## Endpoint
`POST /api/webhooks/tmb` — público.

Auth: header `TMB_WEBHOOK_HEADER` (default `x-tmb-token`) = `TMB_WEBHOOK_TOKEN`.
Na UI TMB: **Chave** = nome do header, **Valor** = token.

## Ofertas (`code`)
`1AS249898VN`, `3XB272209KV`, `9DW254247E5`  
Override: `TMB_PRODUCT_CODES`. Opcional: `TMB_LANCAMENTO_ID=36238`.

## Persistência
- Grant → `HublaEntitlement` com `product_id = code` TMB, `status=ativo`,
  `subscription_id = tmb:{pedido}`
- Revoke → mesmo par e-mail/code → `revogado`
- Idempotência: `tmb:{pedido}:{status_pedido}:{status_financeiro}` em
  `HublaWebhookDelivery`

## Verificação de compra (F019.1)
`temEntitlementAtivo` / compra passa a aceitar **HUBLA_PRODUCT_ID** **ou**
qualquer code em `TMB_PRODUCT_CODES`.

## Critérios
- [x] Token inválido → 401; env ausente → 503
- [x] Efetivado + Adimplente + code Mentoria → entitlement ativo
- [x] Code fora da lista → ignorado
- [x] Cancelamento/inadimplência → revogado
- [x] Aluno com só entitlement TMB consegue verificar compra no Orion
