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
| `503` | `HUBLA_WEBHOOK_TOKEN` não configurado, **ou** nenhum ID de acesso (`HUBLA_PRODUCT_ID` / `HUBLA_PRODUCT_ID_ELITE`) |

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
| `HUBLA_PRODUCT_ID` | um dos dois | Legado Elite (`VL3e0iDO3A32SyjJWr9S`) — concede acesso Orion |
| `HUBLA_PRODUCT_ID_ELITE` | um dos dois | Produto Elite novo (R$ 997), quando a Hubla tiver o id |
| `HUBLA_CHECKOUT_URL` | recomendado | Checkout **Elite** (não o PRO R$ 297). Default do Club: `https://pay.hub.la/v1SsMcVXNip7Mn5A2pNH` |
