# F036 — Endurecimento de segurança

## Status
Implementada — código em 2026-08-03 (commit `ec4a822`, autoria de Pablo Viana)
e 2026-08-13 (`fb15821`). **Spec escrita depois do código**, em 2026-08-13.

> **Nota de processo.** O `CLAUDE.md` do projeto diz "mudança de comportamento
> exige mudança de spec ANTES do código, sem exceção". Aqui isso não aconteceu:
> o trabalho nasceu numa branch de segurança (`feature/security-hardening`),
> escrita direto no código, e foi trazida pro revamp por cherry-pick. Esta spec
> é o registro **retroativo** — ela descreve o que já roda, não o que se pretende
> fazer. Fica assumido como dívida de processo, não como precedente.

## Objetivo
Fechar sete brechas encontradas numa revisão de segurança do app hospedado.
Nenhuma delas é feature de aluno: todas mudam **o que o servidor aceita, o que
ele busca e o que ele cobra** — e por isso mudam o comportamento descrito em
sete specs já entregues.

A F036 não tem tela, não tem entidade nova e não muda o domínio
([01](../01-domain-model.md)). É uma feature guarda-chuva: cada item aponta pra
spec que ela emenda, e é lá que a regra passa a valer.

## Mapa das mudanças

| # | O que muda | Spec emendada | Onde no código |
|---|-----------|---------------|----------------|
| 1 | Cota é **reservada antes** da chamada paga e **estornada** se ela falhar | [F018](F018-limites-diarios.md) · [ADR-017](../04-decisions/ADR-017-reserva-atomica-de-cota.md) | `src/lib/limites/servico.ts` |
| 2 | O Diagnóstico só busca URL de **host público** (anti-SSRF) | [F002](F002-diagnostico-de-presenca-digital.md) · [ADR-016](../04-decisions/ADR-016-leitura-do-site-do-lead.md) | `src/lib/diagnostico/verificarSite.ts` |
| 3 | Rate limit nas rotas HTTP de auth (magic link incluso) | [F014](F014-autenticacao.md) | `src/lib/auth/index.ts` |
| 4 | Um e-mail de compra vale pra **uma** conta | [F019.1](F019.1-ativacao-acesso.md) | `src/lib/compra/servico.ts` |
| 5 | Webhook da Hubla recusa subir sem `HUBLA_PRODUCT_ID` | [F019](F019-webhook-hubla.md) | `src/app/api/webhooks/hubla/route.ts` |
| 6 | Entregável em iframe perde `allow-same-origin` e ganha CSP | [F020](F020-menu-entregaveis.md) | `.../entregaveis/[slug]/page.tsx`, `/api/entregaveis/[...path]` |
| 7 | Helper de sessão e2e morre em produção e pede segredo | [F015](F015-multi-tenant.md) | `src/app/api/e2e/session/route.ts` |

---

## 1. Cota reservada antes, estornada na falha

**O problema.** `verificarCota` lia o contador e `consumirCota` incrementava
**depois** do sucesso. Entre as duas coisas cabia a chamada paga inteira — e
cabiam outras requisições do mesmo aluno. Duas coletas simultâneas no quinto de
cinco liam `usado = 4` e passavam as duas.

**A regra nova.** `reservarCota` incrementa **antes** da chamada externa;
`estornarCota` devolve a unidade se a operação falhar. Detalhes, alternativas e
limitações em [ADR-017](../04-decisions/ADR-017-reserva-atomica-de-cota.md); o
efeito na contagem visível ao aluno está na [F018](F018-limites-diarios.md).

**Ordem obrigatória em toda action com cota:**

1. Sessão / tenant (`requireTenant`)
2. Gate de plano — `exigirRecurso` ou `verificarLimiteMensal`
   ([F035](F035-planos-e-limites.md))
3. `reservarCota`
4. Chamada paga
5. `estornarCota` em **todo** caminho de falha, inclusive nos `return` de erro
   que acontecem depois da reserva

O passo 2 vem antes do 3 de propósito: **bloqueio de plano não pode gastar cota
diária**. O aluno que bateu no teto mensal não perde também a cota do dia.

Call sites migrados: `coletar`, `gerarOutreach`, `gerarProposta`,
`simulador/responder` (em `ec4a822`); `aprofundar` e o endpoint do Agente (em
`fb15821`). `verificarCota` e `consumirCota` continuam exportados como aliases
**depreciados** — nenhum call site os usa.

## 2. SSRF no Diagnóstico

**O problema.** O `website` do Lead vem do Google Places, mas quem manda a URL
final é o redirect: `verificarSite` seguia até 5 saltos e fazia `fetch` em
qualquer coisa. Um site que redireciona pra `http://169.254.169.254/` faz o
servidor buscar o endpoint de metadata da nuvem e medir o tempo — o corpo não
volta pro aluno, mas o servidor virou proxy de rede interna.

**A regra nova.** `urlPermitidaParaFetch(url)` roda **dentro** do laço de
redirects, antes de cada `fetch` — não só na URL inicial. Recusa:

| Recusa | Motivo |
|--------|--------|
| Protocolo ≠ `http:`/`https:` | `file:`, `gopher:`, `data:` etc. |
| URL com usuário/senha | `http://user:pass@host` confunde parser |
| Porta ≠ 80/443 | serviço interno raramente está na 80 |
| Host `localhost`, `*.localhost`, `*.local`, `*.internal`, `metadata.google.internal` | loopback e descoberta interna |
| IP literal privado/loopback/link-local | `127.*`, `10.*`, `172.16–31.*`, `192.168.*`, `169.254.*`, `::1`, `fc/fd/fe80*`, `0.0.0.0` |
| Hostname cujo **DNS resolve** pra qualquer IP privado | fecha o rebind por nome |
| DNS que falha ou devolve lista vazia | na dúvida, não busca |

Resolução por DNS com `all: true` e **todos** os registros precisam ser
públicos — um único A privado reprova o host inteiro.

**O que o aluno vê:** exatamente o mesmo de um site fora do ar — `tem_site =
false`. Não há mensagem especial, de propósito: o aluno não tem o que fazer com
"o site do Lead aponta pra rede interna".

## 3. Rate limit nas rotas de auth

`rateLimit: { enabled: true, window: 60, max: 20 }` na config do Better Auth:
20 requisições por 60s por IP nas rotas `/api/auth/*`.

**Limite conhecido, e ele importa:** o Better Auth aplica isso no `onRequest` do
router HTTP. Chamada **server-side direta** a `auth.api.*` (o que
`requireUser()` faz) **não passa por lá** e não é limitada — o que está certo,
porque essas não são superfície de ataque anônima.

Detalhe na [F014](F014-autenticacao.md).

## 4. Exclusividade do e-mail de compra

**O problema.** Nada impedia duas contas Orion de vincularem o **mesmo** e-mail
de compra da Hubla. Uma compra, N acessos: bastava saber o e-mail de quem
comprou.

**A regra nova.** Antes de gravar a verificação, procura outro `User` com o
mesmo `purchaseEmail` **e** `purchaseVerifiedAt` preenchido. Se existe:

| Caminho | Comportamento |
|---------|---------------|
| `tentarAutoVerificar` (automático, e-mail de login) | **pula** o candidato em silêncio e segue; sem erro na tela, o aluno cai em `/ativar-acesso` |
| `verificarCompraManual` (aluno digitou) | lança `CompraJaVinculadaError` — *"Esse e-mail de compra já está vinculado a outra conta."* |

A diferença é intencional: no automático não houve intenção do aluno, então não
há o que reportar; no manual houve, e o silêncio pareceria bug.

Quem já tinha vinculado **não** perde nada — a regra vale pra vinculações novas.
Detalhe na [F019.1](F019.1-ativacao-acesso.md).

## 5. Webhook da Hubla sem produto configurado

`HUBLA_PRODUCT_ID` ausente fazia o webhook **aceitar qualquer produto**
(conveniência de dev que valia igual em produção). Agora: `503` antes de
qualquer processamento, na mesma checagem de arranque que já existia pro
`HUBLA_WEBHOOK_TOKEN`.

Consequência prática: ambiente sem a env não recebe entitlement nenhum, em vez
de receber entitlement de produto errado. Detalhe na [F019](F019-webhook-hubla.md).

## 6. Entregável em iframe: sandbox e CSP

O material do curso é HTML de terceiro servido de dentro do Orion. O iframe
tinha `allow-scripts` **e** `allow-same-origin` juntos — combinação que anula o
sandbox: o script do material roda com a origem do app e alcança
`localStorage`, cookies não-`httpOnly` e o DOM do pai.

| Camada | Antes | Depois |
|--------|-------|--------|
| `sandbox` do iframe | `allow-scripts allow-same-origin allow-downloads allow-popups` | `allow-scripts allow-downloads allow-popups` |
| Resposta HTML de `/api/entregaveis/*` | `nosniff` + `no-store` | idem + `Content-Security-Policy` |

CSP aplicada **só** quando o `content-type` é `text/html`:

```
default-src 'self' 'unsafe-inline' data: blob:;
connect-src 'none'; form-action 'none';
frame-ancestors 'self'; base-uri 'none'
```

`connect-src 'none'` corta `fetch`/XHR do material; `form-action 'none'` corta
POST pra fora; `frame-ancestors 'self'` impede que o material seja embutido em
site de terceiro. `'unsafe-inline'` fica porque o material é HTML estático de
curso, com `<style>` e `<script>` inline — apertar isso exigiria reescrever o
conteúdo. Detalhe na [F020](F020-menu-entregaveis.md).

## 7. Helper de sessão e2e

`/api/e2e/session` emite cookie de sessão **sem login** — existe pro Playwright
do teste de isolamento ([F015](F015-multi-tenant.md)). A única trava era a env
`E2E_SESSION_HELPER=1`: uma env vazada em produção virava emissor de sessão pra
qualquer `userId`.

Passa a exigir, em conjunto:

- `E2E_SESSION_HELPER === "1"`, **e**
- `NODE_ENV !== "production"`, **e**
- `VERCEL_ENV` não é `production` nem `preview`, **e**
- se `E2E_SESSION_SECRET` estiver definida, header `x-e2e-secret` igual a ela
  (senão `401`)

Fora disso: `404` — a mesma resposta de rota inexistente, sem revelar que o
helper existe. O segredo é **opcional** de propósito: no local, sem a env, o
teste roda como sempre; em qualquer ambiente compartilhado, definir a env fecha
a porta mesmo que as duas primeiras travas falhem.

---

## Critérios de aceitação
- [x] **AC1** — Duas operações com cota disparadas em paralelo no penúltimo uso
      do dia não passam as duas pelo teto por leitura desatualizada do contador
      (ver limitação em [ADR-017](../04-decisions/ADR-017-reserva-atomica-de-cota.md)).
- [x] **AC2** — Falha da chamada paga (LLM, Places, site fora do ar) devolve a
      cota: `usado` volta ao valor anterior à tentativa.
- [x] **AC3** — Bloqueio de plano ([F035](F035-planos-e-limites.md)) não
      consome cota diária: o gate roda antes da reserva.
- [x] **AC4** — `verificarSite` não faz `fetch` em `localhost`, IP privado,
      link-local, porta fora de 80/443 ou host cujo DNS resolva pra IP privado —
      **em nenhum salto** da cadeia de redirects. Resultado: `tem_site = false`.
- [x] **AC5** — Mais de 20 requisições em 60s a `/api/auth/*` do mesmo IP são
      recusadas pelo Better Auth.
- [x] **AC6** — E-mail de compra já verificado em outra conta: no manual vira
      mensagem amigável; no automático é pulado sem erro. Em nenhum dos dois a
      segunda conta é liberada.
- [x] **AC7** — `POST /api/webhooks/hubla` sem `HUBLA_PRODUCT_ID` responde
      `503` e não grava entitlement.
- [x] **AC8** — O iframe do entregável não tem `allow-same-origin`; a resposta
      HTML de `/api/entregaveis/*` traz `Content-Security-Policy`.
- [x] **AC9** — `POST /api/e2e/session` responde `404` com `NODE_ENV=production`
      ou `VERCEL_ENV` em `production`/`preview`, mesmo com
      `E2E_SESSION_HELPER=1`; e `401` com `E2E_SESSION_SECRET` definida e header
      ausente ou diferente.

## Decisões de implementação
- Sem lib nova — só configuração do Better Auth e código próprio.
  Nenhum ADR de dependência necessário.
- Única decisão arquitetural nova:
  [ADR-017](../04-decisions/ADR-017-reserva-atomica-de-cota.md) (reserva de
  cota). As outras seis são endurecimento de regra existente e vivem nas specs
  que emendam.
- `urlPermitidaParaFetch` é exportada de
  `src/lib/diagnostico/verificarSite.ts` — sem dep de Next, testável isolada.
- `CompraJaVinculadaError` em `src/lib/compra/erros.ts`, tratada na action
  `verificarCompraAction` junto de `CompraNaoEncontradaError`.

## Fora do escopo (F036)
- **Cobertura de teste do que foi endurecido.** `ec4a822` mexeu em
  `tests/unit/compra.test.ts` só pra não quebrar o mock existente. Não há teste
  de `urlPermitidaParaFetch`, de estorno de cota, nem do gate do helper e2e —
  são os três candidatos naturais a próxima rodada.
- Postgres RLS (segue como em [ADR-008](../04-decisions/ADR-008-multi-tenant.md),
  reavaliar pós-beta).
- Rate limit nas Server Actions e no endpoint do Agente — o teto ali é a cota
  diária ([F018](F018-limites-diarios.md)), não um limitador por IP.
- Auditoria/log de eventos de segurança (quem tentou vincular e-mail de terceiro,
  quantos SSRF foram barrados). Hoje não fica registro.
- Rotação do `BETTER_AUTH_SECRET` e das chaves `ORION_*`.
- CSP no app principal — esta spec só cobre a resposta dos entregáveis.
