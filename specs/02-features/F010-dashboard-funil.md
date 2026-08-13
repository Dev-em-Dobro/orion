# F010 — Dashboard de Funil de Prospecção

## Status
Proposta — 2026-06-20 · **emendada em 2026-08-13** (ver abaixo).

## Emenda 2026-08-13 — o funil do Dashboard passa a ser o mesmo do kanban

Havia **três** listas de estágio para a mesma coisa:

| Onde | O quê |
|------|-------|
| `src/app/(orion)/page.tsx` | `ESTAGIOS`, array local com 9 status soltos, rótulos e cores |
| `src/lib/funil.ts` | `ESTAGIOS_FUNIL` + `ROTULO_ESTAGIO` |
| `src/lib/funil.ts` | `COLUNAS_FUNIL`, as 7 colunas do kanban ([F034](F034-funil-kanban.md)) |

Os hexes estavam literalmente duplicados (`#8b5cf6`, `#f59e0b`, `#06b6d4`,
`#14b8a6`, `#6366f1`, `#22c55e`, `#ef4444` nos dois arquivos), e as telas
discordavam em três pontos: granularidade (9 barras × 7 colunas), presença de
`novo`, e nomes (Contatado × Abordados, Ganho × Ganhos).

O efeito não era estético: **os números não batiam e não dava pra reconciliar**.
4 em `enriquecido` + 6 em `priorizado` viravam duas barras no Dashboard e um
"Prontos 10" no kanban.

O Dashboard passa a ler `COLUNAS_FUNIL`. Ele não tem mais lista própria.

### `novo` sai da silhueta

Lead coletado e ainda sem Diagnóstico **não é etapa de venda** — é trabalho na
fila. Contá-lo como estágio inflava a base e transformava "trabalho não feito"
em queda de conversão do primeiro passo, que é leitura errada.

E o número já tem dono: a **Fila do dia**, nesta mesma tela logo abaixo, mostra
"Aprofundar próximos 10 (N na espera)" — com o botão do lado. Repetir como barra
seria a terceira cópia do mesmo dado, e a única sem ação.

> **O Diagnóstico continua sendo o motor.** Ele produz as Dores, que são a
> `necessidade` do score ([F003](F003-score-e-priorizacao.md)), o gancho concreto
> da Abordagem ([F005](F005-abordagem-whatsapp.md)), o escopo e o preço da
> Proposta ([F012](F012-gerador-de-proposta.md)) e a âncora das Objeções
> ([F011](F011-assistente-de-objecoes.md)). O que mudou na
> [F025](F025-fila-do-dia.md) é que deixou de ser um botão que o aluno aperta e
> virou automático em lotes. Mecanismo essencial, estágio de funil não.

### Clique na coluna filtra a coluna inteira

`?estagio=` passa a aceitar **id de coluna** (`prontos`, `abordados`, …) além de
status solto. Sem isso, clicar em "Prontos 10" abriria uma lista com 6 — o
número da barra e o da lista têm que ser o mesmo.

URL antiga com `?estagio=priorizado` continua valendo e continua filtrando **só**
`priorizado`: favorito e link colado em grupo não podem mudar de significado.

### Critérios de aceitação da emenda
- [ ] **AC10** — Dashboard e `/funil` mostram os mesmos grupos, com os mesmos
      rótulos e as mesmas cores, lidos de `COLUNAS_FUNIL`.
- [ ] **AC11** — Para a mesma base, a contagem de cada grupo é idêntica nas
      duas telas.
- [ ] **AC12** — `novo` não aparece na silhueta do Dashboard.
- [ ] **AC13** — Clicar num grupo abre `/leads` filtrada por **todos** os
      status dele, e o total da lista bate com o número da barra.
- [ ] **AC14** — `?estagio=<status>` (URL antiga) segue filtrando só aquele
      status.
- [ ] **AC15** — Nenhuma cor **de estágio** definida fora de `src/lib/funil.ts`.
      (O verde da marca `#22c55e` no favicon e no template de e-mail é outra
      coisa e continua onde está.)

## Emenda 2026-08-13 (b) — a faixa de resultado vira três cards, e dois são porta

A faixa "o que já fiz" gastava duas linhas: **Leads abordados este mês** sozinho
em largura cheia e, embaixo, **Ganhos** e **Em aberto** lado a lado. São três
respostas da mesma pergunta ("como estou indo") e não havia motivo pra uma
quebrar a linha — a meta ficava com a largura inteira da tela pra uma barra de
progresso e uma nota de uma linha.

Passam a dividir **uma** linha, em 2 : 1 : 1 (`lg:grid-cols-4` com a meta em
`col-span-2`). Não três colunas iguais: a meta carrega barra + "faltam N" + a
nota da regra de contagem, e em um terço da largura a nota vira três linhas e o
"faltam N" desce pra baixo do rótulo. Abaixo de `lg` o arranjo é o de hoje —
meta em cima, os dois embaixo.

### Ganhos e Em aberto viram link; a meta não

Número de funil sem porta é beco: o card diz "5 em aberto" e o aluno não tem
como ver **quais**. Os dois passam a abrir `/leads` filtrada — o mesmo destino
de clicar numa barra do card "Funil por estágio" logo acima, com a mesma
promessa: o total da lista é o número que estava no card.

**Leads abordados este mês continua sem link**, e isso é decisão, não
esquecimento: esse número não é recorte de `status`. Ele conta Leads com
**Abordagem enviada dentro da competência** (`lib/metas.ts`) — um Lead abordado
dia 3 e ganho dia 10 conta aqui **e** está em `ganho` no funil. Qualquer
`?estagio=` levaria a uma lista com outro total, e card cujo número não bate com
a lista que ele abre é pior que card sem link.

### `?estagio=em-aberto`

"Em aberto" não é coluna do kanban — são **quatro** (`contatado`, `respondeu`,
`qualificado`, `proposta`). O filtro da lista passa a aceitar, além de id de
coluna e status solto, o token `em-aberto`, que resolve pra `ESTAGIOS_EM_ABERTO`
— a mesma constante que o card usa pra somar. Número e filtro saem da mesma
lista: não dá pra um mudar sem o outro.

### Critérios de aceitação da emenda (b)
- [ ] **AC16** — Em `lg`, os três cards de resultado ficam na mesma linha, com a
      meta ocupando o dobro da largura de cada um dos outros dois.
- [ ] **AC17** — Clicar em **Ganhos** abre `/leads?estagio=ganhos` e clicar em
      **Em aberto** abre `/leads?estagio=em-aberto`; nos dois, o total da lista
      é igual ao número mostrado no card.
- [ ] **AC18** — `?estagio=em-aberto` filtra exatamente
      `contatado|respondeu|qualificado|proposta`, lidos de `ESTAGIOS_EM_ABERTO`.
- [ ] **AC19** — O card **Leads abordados este mês** não é link.

## Objetivo
Transformar a home (`/`) num **dashboard de funil read-only** que mostra, num
relance, **onde estão os Leads** e **onde o funil vaza**. Hoje a home tem um
funil de barras simples; a F010 a evolui para a visão de funil de venda
completa — incluindo os dois estágios de negociação novos (`qualificado`,
`proposta`) — e as **taxas de conversão** entre estágios.

É um pilar de **leitura**: não move Leads (as transições continuam pelos botões
da [F006](F006-follow-up-e-funil.md) em `/leads`). Tudo é **derivado do estado
atual** do banco — sem event log, sem nova infra, dentro do
[ADR-002](../04-decisions/ADR-002-sem-workers-fase-1.md).

## Mudança no domínio — dois estágios novos
O funil de venda hoje pula de `respondeu` direto pra `ganho`/`perdido`, sem
representar a conversa em andamento. A F010 adiciona dois `LeadStatus` (já
refletidos no [domain model](../01-domain-model.md)):

```
novo → enriquecido → priorizado → contatado → respondeu → qualificado → proposta → ganho
                                                    ↘ (qualquer pós-contatado) ↘ perdido
```

- **`qualificado`** — respondeu **e** demonstrou fit/verba/intenção (qualificação
  de venda). ⚠️ Termo distinto de "Lead pronto" (critério pré-contato da visão);
  ver glossário do domain model.
- **`proposta`** — orçamento/proposta enviado, aguardando decisão.

`perdido` pode vir de qualquer estágio pós-`contatado`. Marcar um desfecho
**nunca regride** o funil (regra herdada da F006).

### Transições novas (estende a F006)
A `registrarDesfecho` da F006 passa a aceitar `qualificado` e `proposta` no enum
de `desfecho`. Sem essa extensão não há como um Lead **entrar** nos novos
estágios.

| Ação               | De (origem típica)                  | Para          |
|--------------------|-------------------------------------|---------------|
| Registrar desfecho | `respondeu`                         | `qualificado` |
| Registrar desfecho | `qualificado`                       | `proposta`    |
| Registrar desfecho | `proposta`/`qualificado`/`respondeu`| `ganho`       |
| Registrar desfecho | qualquer pós-`contatado`            | `perdido`     |

A spec da F010 **não** redesenha a UI de `/leads`; só amplia o enum aceito e
adiciona os botões de desfecho correspondentes na área de ações da linha
(`qualificado`, `proposta`), no mesmo padrão dos existentes.

## Linguagem
- **Estágio do funil** = um valor de `Lead.status`.
- **Taxa de conversão (estágio→estágio)** = `contagem(estágio destino e além) /
  contagem(estágio origem e além)`. Calculada sobre as contagens atuais, **não**
  é taxa histórica de coorte (ver "Fora do escopo").
- **Em aberto** = Leads `contatado | respondeu | qualificado | proposta` (no
  funil de venda, sem desfecho final).

## UI — home `/` (read-only)
Layout no espírito da referência (`ref.png`), em cards sobre o tema escuro atual.
Todos os números vêm de uma única leitura do banco no server component.

1. **Funil por estágio** (card principal) — silhueta vertical com anéis
   (halo), cores por estágio, hover + legenda interativa; contagem e % do
   pico. Inclui `qualificado` e `proposta`. `perdido` fica como barra de
   vazamento lateral.
2. **Taxas de conversão** — entre os estágios do funil de venda:
   `contatado → respondeu → qualificado → proposta → ganho`. Cada passo mostra a
   % (ex.: "Contatado→Respondeu 40%"). Denominador 0 → exibe "—", nunca divisão
   por zero.
3. **KPIs** (cards pequenos) — Total de Leads · Score médio · Ganhos
   (com nº de perdidos) · **Em aberto** (contagem dos 4 estágios em aberto).
4. **Exigem atenção** — mantém o painel atual: `score ≥ 60` e ainda sem Abordagem
   enviado (`novo|enriquecido|priorizado`), top 5, link pra `/leads`.
5. **Follow-up pendente** — mantém o painel atual da F006 (`filaDeFollowUp`).

Estado vazio (0 Leads) mostra CTA pra coletar, como hoje.

## Fluxo
F010 é **leitura pura** — não há Server Action nova de dashboard. O server
component da home:
1. `prisma.lead.findMany` com a última Abordagem enviada incluída (já é assim).
2. Conta Leads por `status` e calcula taxas de conversão e KPIs em memória.
3. Renderiza. `export const dynamic = "force-dynamic"` (já é assim).

A única Server Action tocada é a `registrarDesfecho` (F006), que ganha os dois
novos valores de `desfecho`.

## Critérios de aceitação
- [ ] **AC1** — O card "Funil por estágio" lista os **9** estágios na ordem do
      funil, cada um com sua contagem correta a partir do banco.
- [ ] **AC2** — As taxas de conversão `contatado→respondeu→qualificado→proposta→
      ganho` são exibidas; quando o estágio de origem tem contagem 0, exibe "—"
      (sem `NaN`/divisão por zero).
- [ ] **AC3** — O KPI "Em aberto" conta exatamente os Leads em
      `contatado|respondeu|qualificado|proposta`.
- [ ] **AC4** — `registrarDesfecho` aceita `qualificado` e `proposta` e atualiza
      `Lead.status`; valores fora do enum → `{ erro }` sem efeito colateral.
- [ ] **AC5** — Botões **Qualificou** e **Proposta** aparecem na linha do Lead em
      `/leads` quando o Lead está num estágio pós-`contatado`, no padrão dos
      botões de desfecho existentes.
- [ ] **AC6** — Marcar desfecho nunca regride o funil de venda (ex.: clicar
      "Respondeu" num Lead `proposta` é tratado conforme regra de não-regressão
      da F006).
- [ ] **AC7** — Os painéis "Exigem atenção" e "Follow-up pendente" continuam
      funcionando idênticos ao comportamento atual.
- [ ] **AC8** — Com 0 Leads, a home mostra o estado vazio com CTA, sem erro.

## Decisões de implementação
- **Migração de enum**: adicionar `qualificado` e `proposta` ao enum
  `LeadStatus` no `schema.prisma` (após `respondeu`, antes de `ganho`). Migração
  própria; aplicar no Neon (mesma pendência operacional notada na F009).
- `src/app/page.tsx` — estende `ESTAGIOS` com os dois estágios e cores próprias
  (`qualificado` ex. `bg-teal-500`, `proposta` ex. `bg-indigo-500`); adiciona o
  bloco de taxas de conversão e o KPI "Em aberto". Sem novo arquivo de lib
  obrigatório; se o cálculo de conversão crescer, extrair pra `src/lib/funil.ts`
  (lógica de domínio sem dependência de Next).
- `src/actions/leads/registrarDesfecho.ts` — ampliar o `z.enum` para
  `["respondeu","qualificado","proposta","ganho","perdido"]`.
- `src/app/leads/desfecho-buttons.tsx` — adicionar os botões `qualificado` e
  `proposta`.
- Tipos derivados de `@prisma/client` (`LeadStatus`), **não** duplicados.

## Fora do escopo (F010)
- **Mover Leads pelo funil no dashboard** (board/kanban arrastável) — a home é
  read-only; transições seguem em `/leads`.
- **Métricas que exigem histórico de eventos**, presentes na referência mas sem
  dado de origem hoje:
  - **SLA de 1ª resposta** — exige timestamp de quando o Lead respondeu.
  - **Conversão no tempo / gráfico temporal** — exige event log de mudanças de
    status.
  - **CAC / custo** — exige rastrear custo de API por Lead.
  - **Top objeções** — exige um campo `motivo_perdido` no Lead + captura na
    `registrarDesfecho`.
  Cada um vira spec própria quando/se houver captura do dado. Listados aqui só
  para registrar que a referência os mostra e a F010 deliberadamente **não** os
  inventa.
- Filtros por nicho/região no dashboard — possível v2, fora do mínimo.

## Custo estimado
$0 — leitura pura do banco e uma migração de enum. Nenhuma chamada de API
externa.
