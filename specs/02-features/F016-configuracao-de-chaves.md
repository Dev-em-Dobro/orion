# F016 — Configuração de chaves do aluno (BYOK)

## Status
Implementada — 2026-07-14

## Objetivo
Dar ao aluno um menu **`/configuracao`** onde ele cola as **próprias chaves de
API**. Substitui o `.env` global como fonte das chaves: cada feature passa a usar
a chave **do aluno logado**. Vantagem do BYOK — o **custo de API é do aluno**; o
nosso fica só em hospedagem + banco.

Cifra das chaves em [ADR-009](../04-decisions/ADR-009-cifra-chaves-byok.md).
Depende de sessão ([F014](F014-autenticacao.md)) e escopo ([F015](F015-multi-tenant.md)).

## Chaves suportadas
- **Google** — Places API (New) + PageSpeed (pode ser a mesma chave Cloud).
- **Provedor de IA** — Anthropic (MVP); OpenAI e Gemini quando entrar a
  [F017](F017-multi-provider-llm.md). A config aceita as 3 desde já.
- **ScreenshotOne** (opcional) — necessária pro Diagnóstico UX ([F008](F008-diagnostico-ux-ia.md))
  em produção serverless ([ADR-006](../04-decisions/ADR-006-screenshot-api-externa.md)).

## Modelo (schema)
`UserApiKeys` — por usuário, **cifrado** (ADR-009): para cada chave, `ciphertext`,
`iv`, `authTag`, `key_version` e um `status` derivado (configurada / inválida /
faltando). `user_id` FK (F015). Migração dedicada.

## Tela `/configuracao`
- Um input por chave, com **máscara** (mostra só os últimos dígitos) e botão
  **"testar chave"** (ping barato por provedor — ex.: Places textSearch mínimo,
  Anthropic mensagem curta).
- **Status por chave:** configurada ✓ / inválida ✗ / faltando —.
- Nunca exibe o valor em claro nem o devolve ao client.

## Refactor central (o coração da feature)
Trocar a leitura de `process.env.*` pela chave **do usuário atual** nas libs que
hoje leem env direto. Passar a chave por **parâmetro/contexto** (não ler env
dentro da lib):

| Lib | Env hoje | Vira |
|-----|----------|------|
| `places/textSearch` | `GOOGLE_PLACES_API_KEY` | chave Google do aluno |
| `pagespeed/performanceMobile` | `PAGESPEED_API_KEY` | chave Google do aluno |
| `outreach`, `conteudo`, `diagnostico-ux`, `proposta`, `objecoes`, `simulador` | `ANTHROPIC_API_KEY` | chave de IA do aluno |
| `diagnostico-ux` (screenshot) | `SCREENSHOTONE_ACCESS_KEY` | chave ScreenshotOne do aluno |

## Onboarding
Se faltam chaves essenciais, guiar o aluno pro `/configuracao` (banner + empty
state explicativo). Reaproveitar o tutorial existente do Google Places
(`docs/tutorial-google-places.md` + rota in-app `/configuracao/tutorial-google`).

## Critérios de aceitação
- [x] **AC1** — Salvar uma chave grava em `UserApiKeys` **cifrada** (ADR-009);
      o valor em claro nunca vai ao banco, ao log nem de volta ao client.
- [x] **AC2** — "Testar chave" reporta **configurada/inválida** por um ping real
      barato ao provedor.
- [x] **AC3** — Cada feature usa a chave **do aluno logado**; aluno A nunca usa a
      chave de B (via F015).
- [x] **AC4** — Feature sem a chave essencial → erro claro e específico ("X não
      configurada — configure em /configuracao"), seguindo o padrão atual, **sem**
      chamar o provedor.
- [x] **AC5** — A UI mostra a chave **mascarada** e o `status` correto por chave.
- [x] **AC6** — ScreenshotOne ausente + ambiente serverless → F008 falha com
      orientação clara (ADR-006); presente → usa o provider externo.
- [x] **AC7** — Editar/remover uma chave atualiza o status e o comportamento das
      features na hora.
- [x] **AC8** — Sem chaves essenciais: banner + empty states apontam pra
      `/configuracao` (e tutorial Google quando faltar Places).

## Decisões de implementação
- `src/lib/seguranca/cifra.ts` (ADR-009) para cifrar/decifrar.
- `src/lib/chaves/` — leitura/escrita de `UserApiKeys` + resolução da chave do
  usuário atual, entregue às libs por parâmetro (as libs deixam de tocar `env`).
- `src/app/configuracao/page.tsx` + Server Actions finas em `src/actions/configuracao/`.
- Sem lib nova (cifra é `crypto` nativo — ADR-009).
- Servidor exige `BYOK_MASTER_KEY` (32 bytes base64) pra operar BYOK.

## Como testar
1. `.env` com `BYOK_MASTER_KEY` (`openssl rand -base64 32`) + migrate
2. Login → `/configuracao` → salvar Google + Anthropic → "Testar chave"
3. Coletar Lead e gerar Outreach (usam a chave do aluno, não o `.env`)
4. Remover Anthropic → Outreach falha com mensagem apontando `/configuracao`

## Fora do escopo (F016)
- Escolha/uso efetivo de OpenAI/Gemini → [F017](F017-multi-provider-llm.md)
  (aqui só **guarda** as chaves).
- Billing/planos; cota de uso paga.
- Rotação automática de chave do aluno (o aluno regera manualmente).
