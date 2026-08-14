# F013 — Simulador de Venda (Roleplay)

## Status
Proposta — 2026-07-11

## Objetivo
Deixar o aluno **treinar a conversa de venda** contra a Claude API fazendo o
papel do **dono do negócio cético** — com objeções realistas calibradas pela
categoria e pela Dor —, e ao final receber um **Scorecard** (notas por
competência + o que melhorar). É o pilar de **treino**, irmão do inbound da
[F007](F007-sugestoes-video-funil.md): não move Lead algum, **constrói a
habilidade** que faz o aluno fechar *todos* os Leads.

É a feature mais "aluno" de todas — puro DNA de educação — e **compõe** com a
[F011](F011-assistente-de-objecoes.md) (objeções) e a
[F012](F012-gerador-de-proposta.md) (proposta): o aluno ensaia o que aquelas
duas municiam. Quem pratica a venda 10× fecha mais que quem improvisa na
primeira call real.

## Linguagem
- **Cenário** — a configuração do treino: categoria do negócio, Dores e
  **dificuldade** da persona. Não é entidade do domínio (não persiste).
- **Persona** — o dono do negócio simulado pela Claude.
- **Turno** — uma troca (fala do aluno → fala da persona).
- **Scorecard** — avaliação final: notas 0–10 por **Competência**
  (descoberta, resposta a objeção, proposta de valor, fechamento) + feedback.

## Arquitetura (sem infra — ADR-002)
Conversa multi-turn **sem workers e sem persistência**: o **estado vive no
client** (React). A cada turno o client reenvia o **histórico completo** à
Server Action, que chama a Claude e devolve a próxima fala — servidor
**stateless**. Igual ao "gera e exibe" da F007, agora multi-turn.

## Input (UI)
Página nova `/treino`.

**1) Montar Cenário** (form):

| Campo         | Tipo   | Validação                                   |
|---------------|--------|---------------------------------------------|
| `origem`      | enum   | `lead` \| `manual`                          |
| `lead_id`     | string | cuid — obrigatório se `origem = lead`       |
| `categoria`   | string | 2–80 — obrigatório se `origem = manual`     |
| `dificuldade` | enum   | `facil` \| `medio` \| `dificil` (default `medio`) |

Se `origem = lead`, o server component de `/treino` oferece Leads
(`priorizado`+, com Diagnóstico) já com a **categoria** e as **dores** derivadas
(`src/lib/dores/derivarDoDiagnostico`) para semear o Cenário. Se `manual`, o
aluno escolhe categoria e dificuldade.

**2) Conversar**: campo de texto + **Enviar** (a cada turno). Botão
**Encerrar e avaliar** a qualquer momento.

## Saída (UI)
- **Chat**: falas do aluno e da persona alternadas.
- Ao **Encerrar e avaliar**: o **Scorecard** — para cada Competência, `nota`
  (0–10) e `comentario`; `nota_geral`; **pontos fortes** (0–3) e **o que
  melhorar** (2–4). Nada é persistido; recomeçar zera o treino.

## Fluxo
### Turno — `responderTurno({ cenario, historico })`
1. Valida com Zod (`cenario` bem-formado; `historico` = lista de
   `{ papel: "aluno" | "dono", texto }`). Inválido → `{ erro }`.
2. `ANTHROPIC_API_KEY` ausente → `{ erro: "ANTHROPIC_API_KEY não configurada" }`
   antes de qualquer chamada.
3. **Limite de turnos:** se `historico` já tem `MAX_TURNOS = 20` falas do aluno,
   a persona encaminha pro encerramento e a UI sugere **Encerrar e avaliar**
   (trava de custo).
4. Chama `src/lib/simulador/simular({ cenario, historico })` — Claude monta a
   `Persona` a partir de `categoria/dores/dificuldade` (system prompt) e responde
   como o dono. Retorna `{ mensagem }` (fala do dono; conversacional, sem schema).
5. Retorna `{ mensagem }`. **Nada é persistido.**

### Avaliar — `avaliarSimulacao({ cenario, historico })`
1. Valida (Zod). Histórico com < 2 turnos do aluno → `{ erro: "Converse um pouco
   antes de avaliar" }`.
2. `ANTHROPIC_API_KEY` ausente → `{ erro }` sem chamada.
3. Chama `src/lib/simulador/avaliar({ cenario, historico })` → Scorecard
   (structured output: `{ competencias: [{ nome, nota, comentario }], nota_geral,
   pontos_fortes[], o_que_melhorar[] }`).
4. Retorna `{ scorecard }`. **Nada é persistido.**

## Comportamento da Persona (system prompt)
Codificado em `src/lib/simulador/prompt.ts`:
- É um **dono de negócio local** da `categoria`, ocupado e cético — não um
  comprador fácil nem um troll. Fala PT-BR coloquial, curto.
- Levanta objeções **realistas e calibradas pela dificuldade**: `facil` cede com
  bom argumento; `medio` insiste 1–2×; `dificil` questiona preço, confiança e
  "meu sobrinho faz de graça", só avança com valor claro.
- **Reage ao que o aluno diz** (não segue roteiro fixo); se o aluno for
  genérico, responde morno; se citar a Dor concreta, engaja.
- **Nunca quebra o personagem** nem dá dicas de venda no meio da conversa (isso
  é papel do Scorecard, no fim).

## Emenda 2026-08-14 — o cenário para de vir do cliente

O que a seção **Input (UI)** sempre descreveu — a action recebe `origem`,
`lead_id`, `categoria`, `dificuldade` — não era o que o código fazia. A
implementação montava o Cenário **no client** (`simulador.tsx`) e mandava
`{ categoria, dores[], dificuldade }` já pronto para a Server Action, que
confiava no pacote e o interpolava direto no **system prompt**.

Isso entrega ao navegador a caneta que escreve as regras do modelo. `dores`
aceitava 10 strings de 300 chars — 3.000 caracteres livres na posição de maior
confiança da conversa. Não é o aluno quebrando o próprio treino (isso ele já
pode, digitando): é usar o Simulador como **LLM de uso geral pago pela chave
compartilhada da Orion** (modo Orion, F018), na conta e nos termos de uso do
dono da plataforma.

Duas portas, e as duas se fecham igual: **o servidor deriva o que o servidor
usa.**

### O cenário é derivado, não recebido
A action passa a receber `{ origem, lead_id?, categoria?, dificuldade }`:

- `origem = "lead"` → o servidor carrega o Lead **com escopo de tenant**
  (F015) e deriva `categoria` e `dores` do banco. O client não escreve mais
  nada no system prompt. Lead de outro aluno, ou inexistente → `{ erro }`.
- `origem = "manual"` → `categoria` é o único texto livre que sobra, e é
  **saneado**: sem quebra de linha, sem pontuação de instrução, ≤ 40 chars.
  Nome de categoria de negócio ("dentista", "restaurante") vive bem nesse
  alfabeto; payload de injeção, não.

### As falas do dono são assinadas
O histórico continua no client (a arquitetura stateless da F013 não muda), mas
uma fala `dono` é **texto que o servidor produziu** — e o client podia forjar
qualquer uma. Uma fala de assistente escrita pelo atacante é prefill: o jeito
mais barato de fazer o modelo aceitar um papel novo.

Cada resposta da persona volta com um **HMAC** (`node:crypto`, chave derivada
do `BETTER_AUTH_SECRET`, ligada ao `user_id`), e o servidor recusa turno `dono`
sem assinatura válida. Fala do `aluno` continua livre — é o canal que sempre
foi dele. Sem lib nova, sem schema novo, sem persistir treino.

### Dado citado nunca é instrução
Mesmo derivados do banco, `categoria` e `dores` são texto de terceiro (nome e
categoria vêm do Google Places). Vão para um **bloco delimitado**, declarado
como dado, com as regras da persona **depois** dele. Vale igual no transcript
do avaliador, onde as falas viram linhas delimitadas em vez de `DONO: …` solto
— prefixo que o aluno podia digitar dentro da própria fala pra forjar linha.

### Critérios de aceitação da emenda
- [ ] **AC10** — A action recusa `dores` vindas do client: o campo não existe
      mais no schema de entrada, e o cenário de `origem = lead` bate com o
      banco.
- [ ] **AC11** — `origem = lead` com `lead_id` de outro usuário → `{ erro }`,
      sem chamada ao provedor de IA.
- [ ] **AC12** — `categoria` manual com quebra de linha, dois-pontos ou
      colchetes é saneada antes do prompt; string que sobra vazia → `{ erro }`.
- [ ] **AC13** — Turno `dono` com assinatura ausente, adulterada ou de outro
      usuário → `{ erro }`, sem chamada ao provedor de IA.
- [ ] **AC14** — A assinatura devolvida por um turno legítimo é aceita no turno
      seguinte (o fluxo normal não quebra).

## Critérios de aceitação
- [ ] **AC1** — Cenário `origem = manual`, `categoria = "dentista"`,
      `dificuldade = medio` → a persona responde no personagem, em PT-BR, e
      levanta ao menos uma objeção realista ao longo da conversa. (Manual.)
- [ ] **AC2** — Cenário `origem = lead` semeia categoria + dores do Lead; a
      persona referencia a realidade daquele negócio (ex.: "não tenho site").
- [ ] **AC3** — **Encerrar e avaliar** retorna Scorecard com as 4 Competências
      (nota 0–10 + comentário cada), `nota_geral`, e ≥ 2 itens em "o que melhorar".
- [ ] **AC4** — Avaliar com < 2 turnos do aluno → `{ erro }` específico, sem
      chamar a Claude API.
- [ ] **AC5** — `ANTHROPIC_API_KEY` ausente → `{ erro }` em ambos os actions, sem
      chamada externa.
- [ ] **AC6** — Ao atingir `MAX_TURNOS = 20`, a persona encaminha pro fecho e a
      UI sugere avaliar (não deixa a conversa crescer indefinidamente).
- [ ] **AC7** — Nenhum registro é criado no banco em nenhum dos dois actions;
      recomeçar zera o estado (client-side).
- [ ] **AC8** — Inputs malformados (Zod: `cenario`/`historico`/enum inválidos) →
      `{ erro }` na UI, sem efeitos colaterais.
- [ ] **AC9** — Falha da Claude API (429/5xx/refusal) → `{ erro }` na UI, sem
      quebrar a app e sem perder o histórico já digitado (está no client).

## Decisões de implementação
- `src/lib/simulador/prompt.ts` — `SYSTEM_PROMPT_PERSONA` (persona acima, por
  dificuldade) + `SYSTEM_PROMPT_AVALIACAO` (rubrica do Scorecard) + builders.
  Fonte única da estratégia de treino.
- `src/lib/simulador/simular.ts` — cliente Claude (turno conversacional, envia o
  histórico como mensagens `user`/`assistant`); lança `SimuladorError`. Modelo
  **`claude-haiku-4-5`** (turnos são muitos e curtos — barato e rápido).
- `src/lib/simulador/avaliar.ts` — cliente Claude, structured output do
  Scorecard. Modelo **`claude-opus-4-8`** (uma chamada; qualidade do feedback
  importa). Sem dep de Next.
- `src/actions/simulador/responder.ts` e `avaliar.ts` — Server Actions finas
  (pasta nova `src/actions/simulador/`, padrão de `src/actions/conteudo/` da F007).
- `src/app/treino/page.tsx` (server: oferta de Leads pro Cenário) +
  `src/app/treino/simulador.tsx` (client: setup + chat + Scorecard, estado local).
- `MAX_TURNOS = 20` como constante no `lib/simulador`.
- Reusa `src/lib/dores/derivarDoDiagnostico` (F011) para semear o Cenário a
  partir de um Lead.
- Lib nova? Não — reusa `@anthropic-ai/sdk` ([ADR-005](../04-decisions/ADR-005-anthropic-sdk-abordagem.md)). **Sem ADR.**

## Fora do escopo (F013)
- **Persistência** de treinos e **evolução do score** ao longo do tempo —
  exigiria entidade nova no [domain model](../01-domain-model.md); especar como
  **F013.1** (vira histórico de treino / gamificação).
- **Voz/áudio** (simular call falada) — v1 é texto.
- Persona por **screenshot/dados do site** do Lead (visão) — v1 usa
  categoria/dores textuais.
- Biblioteca de cenários prontos / ranking entre alunos.
- Uso do Scorecard para alimentar recomendações de conteúdo (F007).

## Custo estimado
Persona em Haiku (~10–20 turnos curtos) + 1 avaliação em Opus ≈ **~R$0,30–0,60
por simulação completa** — ver [contrato](../03-contracts/claude-messages.md).
Uso esporádico (treino) → marginal, dentro do teto de R$50/mês. Se virar uso
intenso, migrar a avaliação pra Haiku por spec.
