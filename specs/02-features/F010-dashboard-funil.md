# F010 — Dashboard de Funil de Prospecção

## Status
Proposta — 2026-06-20

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
4. **Exigem atenção** — mantém o painel atual: `score ≥ 60` e ainda sem Outreach
   enviado (`novo|enriquecido|priorizado`), top 5, link pra `/leads`.
5. **Follow-up pendente** — mantém o painel atual da F006 (`filaDeFollowUp`).

Estado vazio (0 Leads) mostra CTA pra coletar, como hoje.

## Fluxo
F010 é **leitura pura** — não há Server Action nova de dashboard. O server
component da home:
1. `prisma.lead.findMany` com a última Outreach enviada incluída (já é assim).
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
