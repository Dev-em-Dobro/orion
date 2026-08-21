# ADR-014 — Agente Orion: agente com ferramentas sobre os dados do aluno

## Status
Proposta — 2026-08-10 (decidir antes do código da [F029](../02-features/F029-agente-orion.md)).

## Contexto
A [F029](../02-features/F029-agente-orion.md) introduz um **chat que responde
sobre os dados do próprio aluno**. Isso é diferente de tudo que o app faz hoje:

- F005/F007/F011/F012 — **one-shot**: prompt monta o contexto, o modelo devolve
  texto, fim.
- F013 (simulador) — **multi-turn**, mas o modelo não acessa dado nenhum.
- F029 — multi-turn **com acesso ao banco**: o modelo decide *quais* consultas
  fazer, em loop, e o resultado volta pra ele.

É um padrão arquitetural novo (loop de ferramentas), com riscos novos
(vazamento entre tenants, custo por pergunta imprevisível, resposta inventada).
Regra do projeto: **sem nova lib sem ADR** — e, aqui, mesmo sem lib nova a
decisão merece registro.

### Constraints
- **Multi-tenant** ([F015](../02-features/F015-multi-tenant.md)) é inegociável:
  nenhum caminho pode devolver dado de outro aluno.
- **BYOK / multi-provider** ([F016](../02-features/F016-configuracao-de-chaves.md),
  [F017](../02-features/F017-multi-provider-llm.md)): precisa funcionar com
  Anthropic, OpenAI e Gemini, com a chave do aluno.
- **Sem workers** ([ADR-002](ADR-002-sem-workers-fase-1.md)): resposta síncrona,
  em streaming.
- Custo controlado por cota ([F018](../02-features/F018-limites-diarios.md)).

## Decisão
**Agente com ferramentas usando o Vercel AI SDK (`ai` + `@ai-sdk/*`), que já é
dependência do projeto** desde a F017 — sem dependência nova.

Quatro regras que fazem parte da decisão (não são detalhe de implementação):

1. **Ferramentas read-only na v1.** Nenhuma ferramenta escreve no banco. Reduz o
   raio de qualquer falha do modelo a "resposta errada", nunca "dado
   corrompido".
2. **`user_id` nunca é parâmetro de ferramenta.** Ele vem da sessão, no
   servidor, e é injetado no handler. O modelo não tem como pedir dado de
   outro tenant porque não existe campo pra isso.
3. **Teto duro do loop**: ≤ 6 chamadas de ferramenta por mensagem, ≤ 25
   registros e 8 KB por retorno. Sem teto, uma pergunta ampla vira dezenas de
   chamadas e custo imprevisível.
4. **Reuso da camada LLM existente** (`src/lib/llm`): provider, chave, erros e
   cota são os mesmos do resto do app — o agente não abre um segundo caminho
   pra chamar modelo.

## Alternativas consideradas

| Opção | Avaliação |
|-------|-----------|
| **A — AI SDK com tools (escolhida)** | Já instalado; tool calling normalizado entre os 3 providers; streaming pronto |
| B — SDK Anthropic puro com tool use | Amarra o agente à Anthropic e quebra a F017 (aluno em Gemini/OpenAI ficaria sem agente) |
| C — Text-to-SQL (modelo gera SQL) | Poderoso e **perigoso**: SQL gerado por modelo contra banco multi-tenant. Reprovado por segurança |
| D — Sem ferramentas: despejar contexto no prompt | Não escala (500 Leads não cabem), custo alto por pergunta e resposta desatualizada |
| E — Framework de agentes (LangChain e afins) | Dependência pesada pra um caso de 6 ferramentas; contraria "sem lib nova sem necessidade" |

## Consequências

### Positivas
- Zero dependência nova; funciona nos três providers.
- Isolamento garantido por construção (não por confiança no modelo).
- O mesmo padrão de ferramentas serve a evoluções (escrita com confirmação, na
  v2).

### Negativas / a aceitar
- Custo por pergunta é variável (1–3 chamadas): mitigado por cota `agente_msg`
  e pelo teto de chamadas.
- Modelo pode responder com dado desatualizado dentro da mesma conversa (leu no
  turno 1, o aluno mudou no turno 3). Aceitável: é chat, não fonte de verdade.
- Superfície de **prompt injection**: campos vindos de terceiros (nome do
  estabelecimento, texto do site) chegam ao modelo. Como a v1 é só leitura, o
  pior caso é resposta errada — não ação indevida. Reavaliar **antes** de
  liberar ferramentas de escrita.
