# F016 — Configuração de chaves do aluno (BYOK)

## Status
**Encerrada — 2026-08-17.** Implementada em 2026-07-14, fechada para novos
alunos em 2026-08-13 ([F035](F035-planos-e-limites.md), "Fim do BYOK"), e agora
retirada do produto **para todos**, inclusive quem já tinha configurado.

> ## Encerramento de 2026-08-17
>
> **Todo mundo usa as chaves da plataforma.** Não há mais modo BYOK: nem pra
> novo aluno, nem pra quem já estava (o *grandfathering* de 2026-08-13 termina
> aqui). Quem precisa de mais volume sobe de plano — não traz a própria chave.
>
> Por que fechar de vez, e não deixar os antigos: **o modelo de plano não fecha
> com dois tipos de aluno.** A F035 cobra por volume porque volume custa; um
> aluno com chave própria não custa, e o produto passou a ter que responder duas
> perguntas diferentes sobre limite. Um caminho só é mais simples de explicar,
> de sustentar e de precificar — e é o que a tela de planos vende.
>
> ### O que acontece com as chaves já salvas
>
> **São apagadas.** Migração zera as colunas cifradas de todos os provedores
> (`google`, `anthropic`, `openai`, `gemini`, `screenshotone`), o `last4`, o
> `status`, e força `key_mode = 'orion'` em todas as linhas.
>
> Não é limpeza cosmética: guardar credencial de um terceiro que o app **não
> usa** é passivo, não é zelo. O levantamento de 2026-08-17 no staging achou 33
> chaves do Google guardadas — e **32 delas eram de contas já em modo `orion`**,
> ou seja, chaves paradas sem nenhuma finalidade desde antes desta decisão. A
> LGPD chama isso de dado sem finalidade; a gente devia ter apagado antes.
>
> ### O que fica no código, e por quê
>
> A **máquina continua**, desligada: a camada de cifra ([ADR-009](../04-decisions/ADR-009-cifra-chaves-byok.md)),
> o resolver por `key_mode` e a flag `BYOK_NOVOS_ALUNOS`. Mesmo padrão da pausa
> de planos da F035 — desligar é uma linha, arrancar é uma reescrita, e o custo
> de manter código morto e testado é menor que o de recriá-lo.
>
> O que **não** volta sozinho é o dado: reabrir a flag devolve a tela, não as
> chaves. Cada aluno colaria a dele de novo.

## Objetivo
Dar ao aluno um menu **`/configuracao`** com duas formas de operar:

1. **Modo Orion (padrão)** — usa chaves compartilhadas do servidor
   (`ORION_GOOGLE_API_KEY`, `ORION_OPENAI_API_KEY`). O aluno **não precisa**
   de conta Google nem OpenAI. Sujeito a [limites diários](F018-limites-diarios.md).
2. **Modo BYOK** — o aluno cola as **próprias chaves** cifradas; custo de API é
   dele e **sem cotas diárias** da F018.

Toggle `key_mode` (`orion` | `byok`) em `UserApiKeys`.

Cifra das chaves em [ADR-009](../04-decisions/ADR-009-cifra-chaves-byok.md).
Depende de sessão ([F014](F014-autenticacao.md)) e escopo ([F015](F015-multi-tenant.md)).

## Chaves suportadas
- **Google** — Places API (New) + PageSpeed (pode ser a mesma chave Cloud).
- **Provedor de IA** — Anthropic (MVP); OpenAI e Gemini quando entrar a
  [F017](F017-multi-provider-llm.md). A config aceita as 3 desde já.
- **ScreenshotOne** (opcional) — necessária pro Diagnóstico UX ([F008](F008-diagnostico-ux-ia.md))
  em produção serverless ([ADR-006](../04-decisions/ADR-006-screenshot-api-externa.md)).
  **Pausa temporária (2026-07-27):** o slot fica oculto na UI de `/configuracao`
  enquanto o fluxo de Diagnóstico UX está fora do uso.

## Modelo (schema)
`UserApiKeys` — por usuário, **cifrado** (ADR-009): para cada chave, `ciphertext`,
`iv`, `authTag`, `key_version` e um `status` derivado (configurada / inválida /
faltando). `user_id` FK (F015). Migração dedicada.

## Tela `/configuracao`
- **Toggle Orion / BYOK** no topo — modo Orion é o padrão para novos alunos.
- Modo **BYOK**: inputs por chave, com **máscara** e **"testar chave"**.
- Modo **Orion**: seção BYOK oculta; texto explicando que as chaves são da Orion.
- Durante a pausa da F008, o input de ScreenshotOne não é exibido na tela.
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
| `abordagem`, `conteudo`, `diagnostico-ux`, `proposta`, `objecoes`, `simulador` | `ANTHROPIC_API_KEY` | chave de IA do aluno |
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

### Critérios do encerramento (2026-08-17)
Os AC1–AC8 acima descrevem o que a feature **fazia**. Ficam como registro; o que
vale a partir daqui:

- [ ] **AC9** — Com `BYOK_NOVOS_ALUNOS` desligada, **nenhuma** conta usa chave
      própria: `obterChave`/`exigirChave` devolvem a chave da plataforma mesmo
      se a linha em `user_api_keys` disser `key_mode = 'byok'`. O dado não manda
      no comportamento — a flag manda.
- [ ] **AC10** — `/configuracao` não mostra seletor de modo, campo de chave,
      "Testar chave" nem chave mascarada. Nenhuma tela do app menciona chave
      própria.
- [ ] **AC11** — Depois da migração, nenhuma linha de `user_api_keys` tem
      `ciphertext`, `iv`, `auth_tag`, `last4` ou `status` diferente do vazio
      inicial, e toda linha está em `key_mode = 'orion'` — nos cinco provedores.
- [ ] **AC12** — Nenhuma mensagem de erro oferece BYOK como saída. A da cota
      diária (F018) passa a apontar só o que existe: esperar o dia virar.
- [ ] **AC13** — Ligar `BYOK_NOVOS_ALUNOS=1` devolve a tela e o fluxo sem
      deploy. **Não** devolve as chaves apagadas — cada aluno cola de novo.

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
3. Coletar Lead e gerar Abordagem (usam a chave do aluno, não o `.env`)
4. Remover Anthropic → Abordagem falha com mensagem apontando `/configuracao`

## Fora do escopo (F016)
- Escolha/uso efetivo de OpenAI/Gemini → [F017](F017-multi-provider-llm.md)
  (aqui só **guarda** as chaves).
- Billing/planos; cota de uso paga.
- Rotação automática de chave do aluno (o aluno regera manualmente).
