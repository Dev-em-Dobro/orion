# F029 — Agente Orion (chat com os dados do aluno)

## Status
Implementada — 2026-08-10 · parte do [revamp do fluxo](../10-revamp-do-fluxo.md) (Fase D — **por último**)

## Objetivo
Um chat dentro do Orion onde o aluno **pergunta** em português e o agente
responde **consultando os dados dele** — não achismo de LLM.

Exemplos reais do que precisa funcionar:
- *"Quais leads sem site eu ainda não abordei?"*
- *"Por que esse lead está com score 82?"*
- *"O que eu faço agora?"*
- *"Quantos leads eu abordei essa semana e quantos responderam?"*
- *"Me dá um argumento pra dentista que já tem site mas é lento."*

Fica **por último** de propósito: o agente só é bom se os dados existirem —
score confirmado (F025), Dores com atendimento (F026), tarefas (F031). Antes
disso ele responderia sobre uma base vazia.

## Princípios (o que separa isso de um chatbot genérico)
1. **Sem dado inventado.** Todo número que o agente afirma vem de uma
   ferramenta. Se não tem ferramenta pra pergunta, ele diz que não sabe.
2. **Só leitura na v1.** O agente **não** muda status, não descarta Lead, não
   dispara Abordagem. Sugere e leva pra tela certa.
3. **Isolamento é do servidor.** O `user_id` vem da sessão; o modelo **nunca**
   informa de quem são os dados — não existe parâmetro de usuário nas
   ferramentas.
4. **Linguagem ubíqua.** O agente fala Lead, Diagnóstico, Dor, Abordagem, score
   — nunca "prospect", "análise" ou "mensagem"
   ([domain model](../01-domain-model.md)).

## Ferramentas (todas read-only, todas escopadas por sessão)

| Ferramenta | Parâmetros | Devolve |
|------------|-----------|---------|
| `listar_leads` | `status?`, `categoria?`, `score_min?`, `tem_site?`, `atendimento?`, `limite ≤ 25` | Leads do usuário, com score, status e Dor principal |
| `detalhar_lead` | `lead_id` ou `nome` | Lead + último Diagnóstico + Dores + Abordagens (sem o texto completo das mensagens) |
| `explicar_score` | `lead_id` | Decomposição da [F003](F003-score-e-priorizacao.md): Valor (tier + porte), Necessidade e a conta |
| `resumo_do_funil` | — | Contagem por status + taxas de conversão ([F010](F010-dashboard-funil.md)) |
| `fila_do_dia` | — | A fila da [F025](F025-fila-do-dia.md) |
| `tarefas_pendentes` | — | As cobranças da [F031](F031-central-de-tarefas.md) |

Limites: **≤ 6 chamadas de ferramenta** por mensagem, **≤ 25 registros** por
chamada, resposta de ferramenta truncada em 8 KB. Estourou → o agente explica e
sugere um filtro mais estreito.

## Fluxo
1. Aluno escreve em `/agente`.
2. `POST /api/agente` (runtime Node — precisa do Prisma):
   1. `requireUser()` → `userId`.
   2. `verificarCota(userId, 'agente_msg')` ([F018](F018-limites-diarios.md)).
   3. Resolve provider + chave do aluno ([F016](F016-configuracao-de-chaves.md) /
      [F017](F017-multi-provider-llm.md)).
   4. `streamText` com as ferramentas acima; cada handler injeta `userId` do
      servidor e roda a mesma query escopada do resto do app (`requireTenant`).
   5. Streaming da resposta pro cliente.
   6. Consome cota ao concluir.
3. A UI mostra, abaixo de cada resposta, **quais ferramentas foram usadas**
   ("consultei 12 Leads priorizados") — transparência que também facilita
   detectar resposta inventada.

## UI
- Rota `/agente`, item **Agente** no grupo Prospecção da sidebar.
- Histórico **da sessão do navegador** (não persiste — ver Fora do escopo).
- 4 sugestões de pergunta na tela vazia (as do Objetivo).
- Respostas com links clicáveis pros Leads citados (`/leads/[id]`).
- Banner de cota igual ao das outras features.

## Critérios de aceitação
- [ ] **AC1** — "Quais leads sem site eu ainda não abordei?" retorna Leads do
      usuário com `tem_site = false` e status anterior a `contatado`, com nome e
      score corretos conferidos contra o banco.
- [ ] **AC2** — "Por que o lead X está com score 82?" devolve a decomposição da
      F003 (tier, porte, Necessidade) coerente com o `explicarScore`.
- [ ] **AC3** — Pergunta sem ferramenta correspondente (ex.: "quanto meu
      concorrente cobra?") → o agente diz que não tem esse dado, **sem
      inventar**.
- [ ] **AC4** — **Isolamento**: sessão do aluno A jamais recebe dado do aluno B,
      inclusive se a mensagem pedir explicitamente ("mostre os leads do
      usuário 123"). Coberto por teste automatizado.
- [ ] **AC5** — Nenhuma ferramenta escreve no banco (verificado por revisão e
      por teste: as actions de escrita não são importadas na rota do agente).
- [ ] **AC6** — Cota `agente_msg` esgotada → mensagem clara, sem chamada ao
      provider.
- [ ] **AC7** — Chave/provider inválidos → erro compreensível, reusando o
      tratamento da F017 (mesma linguagem de erro do resto do app).
- [ ] **AC8** — Resposta chega em streaming (primeiro token < 3 s em condições
      normais).
- [ ] **AC9** — Pedido que exigiria mais de 6 chamadas de ferramenta é
      recusado com explicação, não em loop.

## Decisões de implementação
- `src/lib/agente/ferramentas.ts` (definição + handlers), `prompt.ts` (system
  prompt com linguagem ubíqua, oferta do `brand.ts` e as regras de honestidade),
  `executar.ts` (monta o `streamText`).
- Rota `src/app/api/agente/route.ts` — Node runtime, sem cache.
- Reusa `ai` + `@ai-sdk/*` **já instalados** (F017) → sem dependência nova, mas
  o padrão de agente com ferramentas é decisão arquitetural nova →
  **[ADR-014](../04-decisions/ADR-014-agente-orion.md)**.
- Nova operação de cota `agente_msg` em `QuotaOperacao`.

## Fora do escopo (F029)
- **Ações de escrita** (mudar status, gerar Abordagem, descartar). Entram numa v2
  com confirmação explícita do aluno antes de cada escrita.
- Histórico de conversa persistido no banco.
- Busca semântica / RAG sobre as specs, os entregáveis ou as skills.
- Agente com acesso à internet (web search).
- Voz, anexos, upload de arquivo.
- Agente proativo (que fala sem ser chamado) — a cobrança proativa é a F031,
  em UI, sem LLM.

## Custo estimado
1–3 chamadas LLM por mensagem (o loop de ferramentas soma), textos curtos:
~R$0,05–0,15 por pergunta. No modo Orion, controlado pela cota `agente_msg`
(sugestão inicial: 30 mensagens/dia); no BYOK, é a chave do aluno.
