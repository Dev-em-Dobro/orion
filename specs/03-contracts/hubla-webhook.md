# Contrato — Webhook Hubla v2

Referência: [documentação Hubla](https://hubla.gitbook.io/docs/webhooks/eventos/membro.md).

## Request

| Header | Obrigatório | Descrição |
|--------|-------------|-----------|
| `Content-Type` | sim | `application/json` |
| `x-hubla-token` | sim | Token do painel Hubla |
| `x-hubla-idempotency` | recomendado | UUID único por entrega |
| `x-hubla-sandbox` | não | `true` em testes |

## Response Orion

| Status | Quando |
|--------|--------|
| `200` | Processado ou ignorado com sucesso (produto fora da allowlist incluso) |
| `401` | Token ausente ou inválido |
| `400` | JSON inválido |
| `503` | `HUBLA_WEBHOOK_TOKEN` não configurado, **ou** nenhum ID de acesso (`HUBLA_PRODUCT_ID` / `HUBLA_PRODUCT_ID_ELITE` / `HUBLA_PRODUCT_ID_CLUB_PRO`) |

## Payload (membro — campos usados)

```json
{
  "type": "customer.member_added",
  "version": "2.0.0",
  "event": {
    "product": { "id": "...", "name": "..." },
    "user": { "email": "comprador@email.com", "id": "..." },
    "subscription": { "id": "...", "status": "active" }
  }
}
```

## Env do servidor

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `HUBLA_WEBHOOK_TOKEN` | prod | Token da aba Autenticação |
| `HUBLA_PRODUCT_ID` | um dos três | Legado Elite (`VL3e0iDO3A32SyjJWr9S`) — concede acesso Orion |
| `HUBLA_PRODUCT_ID_ELITE` | um dos três | Produto Elite novo (R$ 997) |
| `HUBLA_PRODUCT_ID_CLUB_PRO` | um dos três | PRO Club R$ 297 — acesso **Free** (não é `HUBLA_PRODUCT_ID_PRO`) |
| `HUBLA_CHECKOUT_URL` | recomendado | Checkout **Elite** (upsell). Default: `https://pay.hub.la/v1SsMcVXNip7Mn5A2pNH` |
| `HUBLA_PRODUCT_ID_PRO` | F035 | Plano Pro do **Orion**. Prefixo `trial-pro-` = cortesia no grant Elite (90 dias). Não é o PRO Club. |
| `CORTESIA_PRO_DIAS` | não | Duração da cortesia em grants **novos**. Default 90. |
