# F011 — Assistente de Resposta a Objeções

## Status
Proposta — 2026-07-11 · **emendada em 2026-08-13** (ver abaixo).

## Emenda 2026-08-13 — catálogo primeiro, IA como saída de escape

O desenho original abria a aba com um `textarea` vazio: o aluno tinha que colar
a objeção pra receber alguma coisa. **Tela vazia é a pior primeira tela de uma
aba de vendas.** Ela cobra do aluno exatamente o que ele não tem — repertório —
e ainda cobra latência e cota de IA pra devolver as mesmas oito objeções que
todo dono de negócio local dá.

A aba **Objeções** passa a abrir com um **catálogo curado** de objeções comuns
(`src/lib/objecoes/catalogo.ts`), escrito à mão e versionado como código:

- **Instantâneo.** Sem chamada de modelo, sem cota, sem espera. O aluno abre a
  aba **durante** a conversa no WhatsApp e já tem o que colar.
- **Consistente.** É o mesmo repertório pra toda a turma, revisável em PR. Uma
  resposta ruim se conserta uma vez, pra todo mundo.
- **Ensina, não só entrega.** Cada objeção traz **o que está por trás dela** e a
  **pergunta-chave** que vira o jogo — o aluno aprende a tática, em vez de
  colar texto que não entende.

A personalização que importa é barata e não precisa de modelo: `{negocio}` no
texto é trocado pelo nome do Lead na renderização.

**A IA continua**, agora no lugar certo: um bloco secundário **"Outra
objeção"**, recolhido, pra quando o Lead disser algo fora do catálogo. Mesmo
contrato, mesmo prompt, mesma Server Action — só deixou de ser a porta de
entrada. Nada foi removido; o que mudou foi a ordem.

**Ordem do catálogo = ordem de frequência.** "Já tenho site" é a primeira
porque é a objeção nº 1 de quem vende site pra negócio local, e é a mais fácil
de responder errado (o aluno tende a atacar o site do cliente). A resposta certa
não discute o site: pergunta se ele **traz cliente**, e se o dono **já mediu**
isso. Quase sempre não mediu — e é aí que a conversa vira.

### Critérios de aceitação da emenda
- [ ] **AC10** — A aba Objeções abre com a lista de objeções comuns **sem
      nenhuma chamada de IA** e sem consumir cota.
- [ ] **AC11** — "Já tenho site" é a primeira do catálogo, e sua resposta
      pergunta se o site gera demanda e se o dono mediu isso.
- [ ] **AC12** — Cada objeção expõe o que está por trás dela, a pergunta-chave
      e ao menos duas respostas prontas, cada uma com botão de copiar.
- [ ] **AC13** — `{negocio}` é substituído pelo nome do Lead no texto copiado,
      não só no exibido.
- [ ] **AC14** — O bloco "Outra objeção" (IA) continua funcional, recolhido por
      padrão, com o mesmo contrato de erro de antes.

## Objetivo
Quando o Lead **responde** à Abordagem com uma objeção ou pergunta
("achei caro", "já tenho site", "não tenho tempo", "me manda por e-mail"),
gerar **2–3 respostas sugeridas** — curtas, em PT-BR, prontas pra colar no
WhatsApp — que **acolhem** a objeção, **reancoram** na Dor concreta do
Diagnóstico e reconduzem ao próximo passo de baixo atrito (o diagnóstico
gratuito da oferta, `src/lib/brand.ts`).

É a feature que ataca a etapa **`respondeu → qualificado`** do funil — hoje sem
nenhuma ferramenta (ver [oportunidades](../06-referencias/oportunidades-de-features.md)).
O aluno dev sabe fazer site; trava é responder "tá caro" sem desvalorizar o
trabalho nem discutir com o Lead. Esta feature empresta esse repertório. É um
**assistente puro**: não move o funil nem persiste nada (padrão da
[F008](F008-diagnostico-ux-ia.md)).

## Linguagem
- **Objeção** — a mensagem do Lead que trava a venda (dúvida, resistência de
  preço, adiamento). Não é entidade do domínio (não persiste).
- **Resposta sugerida** — cada opção gerada; traz um rótulo de **abordagem**
  (ex.: "reancorar no valor", "reduzir atrito", "prova social") + o **texto**.

## Táticas de resposta (embutidas no system prompt)
Codificadas em `src/lib/objecoes/prompt.ts` — o que move o fechamento:

1. **Acolher antes de rebater.** Nunca discutir com o Lead; validar a
   preocupação ("faz sentido pensar no custo") antes de reconduzir.
2. **Reancorar na Dor concreta** do Diagnóstico ("o ponto é o site não abrir no
   celular — é cliente indo pro concorrente"), não em características do serviço.
3. **Reduzir atrito.** O próximo passo é sempre o **diagnóstico gratuito**
   (`BRAND.ofertaDeEntrada`), não um compromisso grande. Baixar a barreira.
4. **CTA único e fácil** por resposta — uma pergunta de sim/não.
5. **Brevidade.** WhatsApp: **≤ ~60 palavras**, 2–4 frases.
6. **Honestidade.** Não prometer resultado garantido, não inventar dados que
   não temos sobre o Lead (mesma disciplina da [F005](F005-abordagem-whatsapp.md)).
7. **PT-BR coloquial**, sem "Prezado"; usa o nome do negócio quando couber.
8. **Variar o ângulo** entre as 2–3 respostas — não repetir a mesma tática.

## Input (UI)
Na área de ações de cada linha em `/leads`, um bloco **Responder objeção**
(visível para Leads `contatado`/`respondeu`/`qualificado`): um `textarea` onde o
operador cola a mensagem do Lead + botão **Sugerir respostas**.

| Campo              | Tipo   | Validação                          |
|--------------------|--------|------------------------------------|
| `lead_id`          | string | obrigatório, cuid válido           |
| `mensagem_do_lead` | string | obrigatório, 2–1000 chars          |

## Saída (UI)
- **2–3 cards** de resposta, cada um com o rótulo de **abordagem** e o **texto**
  gerado, num campo copiável (botão **Copiar**).
- Nenhuma persistência, nenhuma mudança de status: o operador escolhe uma,
  copia, envia manualmente e (se for o caso) usa os botões de funil da
  [F006](F006-follow-up-e-funil.md) para registrar o desfecho.

## Fluxo
1. Operador cola a mensagem do Lead e clica em **Sugerir respostas**.
2. Server Action `responderObjecao({ lead_id, mensagem_do_lead })`:
   1. Valida com Zod. Lead inexistente → `{ erro: "Lead não encontrado" }`.
   2. `ANTHROPIC_API_KEY` ausente → `{ erro: "ANTHROPIC_API_KEY não configurada" }`
      antes de qualquer chamada.
   3. Carrega o Lead + último Diagnóstico (`take: 1`, `executado_em desc`).
      Sem Diagnóstico → `{ erro: "Diagnostique o Lead antes de responder objeções" }`
      (uma resposta genérica não desarma objeção — mesma regra da F005).
   4. Deriva as **dores detectadas** do último Diagnóstico via o helper
      compartilhado `src/lib/dores/derivarDoDiagnostico` (o mesmo da F005; ver
      Decisões).
   5. Chama `src/lib/objecoes/responderObjecao({ nome, categoria, dores,
      mensagem_do_lead })` → `{ respostas: [{ abordagem, texto }] }` (Claude API,
      structured output — ver [contrato](../03-contracts/claude-messages.md)).
   6. Retorna `{ respostas }`. **Nada é persistido.**
3. UI renderiza os cards. Gerar de novo produz um novo conjunto do zero.

## Critérios de aceitação
- [ ] **AC1** — Lead com Diagnóstico + objeção "achei caro" → 2–3 respostas, cada
      uma com `abordagem` e `texto` ≤ ~60 palavras, em PT-BR, sem "Prezado", com
      um único CTA que reconduz ao diagnóstico gratuito. (Validação manual.)
- [ ] **AC2** — As respostas **variam de abordagem** entre si (não repetem a
      mesma tática literalmente). (Validação manual.)
- [ ] **AC3** — Lead sem nenhum Diagnóstico → `{ erro }` específico, sem chamar a
      Claude API.
- [ ] **AC4** — `ANTHROPIC_API_KEY` ausente → `{ erro }` descritivo, sem chamada
      externa.
- [ ] **AC5** — `mensagem_do_lead` vazia ou < 2 chars (Zod) → erro de campo na
      UI, sem chamada externa.
- [ ] **AC6** — A action **não** altera `Lead.status` nem cria registro algum
      (nenhum `Abordagem`, nenhuma entidade nova).
- [ ] **AC7** — Falha da Claude API (429/5xx/refusal → `parsed_output` nulo) →
      `{ erro }` na UI, sem quebrar a app.
- [ ] **AC8** — `lead_id` inválido (Zod) ou inexistente → `{ erro }` específico
      na UI, sem efeitos colaterais.

## Decisões de implementação
- `src/lib/objecoes/prompt.ts` — `SYSTEM_PROMPT_OBJECOES` (playbook acima) +
  builder do contexto (Lead + dores + mensagem). Fonte única da estratégia.
- `src/lib/objecoes/responderObjecao.ts` — cliente Claude via SDK, structured
  output (array de 2–3 `{ abordagem, texto }`); lança `ObjecaoError`. Sem dep de
  Next. Modelo **`claude-opus-4-8`** (qualidade de escrita importa, como na F005).
- `src/lib/dores/derivarDoDiagnostico.ts` — **extrair** a derivação hoje inline
  no passo 4 da [F005](F005-abordagem-whatsapp.md) para um helper puro reusado por
  F005/F011/F012 (e por F003 quando migrar). Quando a F004 (Dores persistidas)
  existir, o helper passa a ler as Dores — sem mudar as chamadas.
- Server Action `src/actions/leads/responderObjecao.ts`, fina — orquestra
  `lib/objecoes` + Prisma (só leitura).
- UI `src/app/leads/responder-objecao-panel.tsx` — textarea + botão + cards, no
  padrão de `gerar-abordagem-button.tsx`.
- Lib nova? Não — reusa `@anthropic-ai/sdk` ([ADR-005](../04-decisions/ADR-005-anthropic-sdk-abordagem.md)). **Sem ADR.**

## Fora do escopo (F011)
- **Persistência** das objeções/respostas (histórico de conversa) — exigiria
  entidade nova no [domain model](../01-domain-model.md); especar como F011.1 se
  provar valor (base para aprender quais respostas convertem).
- **Transição `respondeu → qualificado`** — já é feita pelo botão "Qualificou"
  existente (`registrarDesfecho`, F006/F010). A F011 apenas **arma a conversa**;
  quem marca o status é o operador, e não há nova action de transição aqui.
- Classificação automática do tipo de objeção (preço/tempo/confiança).
- Geração a partir de Dores persistidas ([F004](F004-deteccao-de-dor.md)).
- Sugestão de resposta por e-mail — esta feature mira WhatsApp.

## Custo estimado
~R$0,05–0,10 por geração (Opus 4.8; 2–3 respostas curtas) — ver
[contrato](../03-contracts/claude-messages.md). Uso pontual (só em Leads que
responderam) → marginal, dentro do teto de R$50/mês da visão.
