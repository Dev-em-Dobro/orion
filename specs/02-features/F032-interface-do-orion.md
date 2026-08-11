# F032 — Interface do Orion (shell, cards e detalhe com abas)

## Status
Implementada — 2026-08-10 · parte do [revamp do fluxo](../10-revamp-do-fluxo.md) (Fase B)

## Objetivo
Trocar a interface de **planilha** por uma de **trabalho**. Hoje `/leads` é uma
tabela de 7 colunas em que tudo — Diagnóstico, Outreach, objeções, proposta,
desfecho — está espremido dentro de um modal único
(`src/app/(orion)/leads/lead-row.tsx`, 388 linhas). O aluno não consegue bater o
olho e saber quem abordar, e o detalhe do Lead (`/leads/[id]`) hoje mostra só
nome, categoria e endereço.

A F032 define a **casca visual** que as outras features do revamp usam:
grid de cards, detalhe com abas e a navegação da sidebar.

## Referência
Telas do **LeadSite** (concorrente direto), em
`C:\Users\Ricardo\Downloads\ref use lead`. Adotamos a **estrutura** — cards em
grid, chips de filtro rápido, cota no topo, seleção em massa, abas no detalhe e
navegação `1/N` entre Leads. **Não** adotamos o vocabulário dele (ver abaixo)
nem as features que o Orion não tem (agendamentos, gerador de site).

### O que **não** copiamos: "Quente / Morno"
A referência rotula Lead como *Quente*, *Morno* e *Tier 3*. No Orion isso é o
**score** ([F003](F003-score-e-priorizacao.md)) e o **Tier de nicho** — que já
existem e já têm nome. Criar "temperatura" seria sinônimo, e sinônimo é
proibido pelo [domain model](../01-domain-model.md).

O que entra é uma **faixa visual do próprio score**, sem termo novo de domínio:

| Faixa | Score | Uso |
|-------|-------|-----|
| Alto | ≥ 60 (`SCORE_QUALIFICADO`) | Verde |
| Médio | 30–59 | Âmbar |
| Baixo | < 30 | Cinza |

São exatamente os cortes que `scoreBadge()` em
`src/app/(orion)/leads/ui.tsx` **já usa** — a F032 só passa a exibir o rótulo
junto da cor, e a lógica continua num único lugar.

## Navegação (sidebar)

> **Implementação (2026-08-10):** os itens **Funil**, **Tarefas**, **Agente** e
> **Skills** entram junto com as features que os servem (F034, F031, F029,
> F030). Adicioná-los agora seria pôr no menu quatro links que dão 404 — o
> resto da F032 não depende disso.

Grupos, na ordem:

| Grupo | Itens |
|-------|-------|
| Prospecção | Dashboard · Leads · **Funil** ([F034](F034-funil-kanban.md)) · **Tarefas** (badge) ([F031](F031-central-de-tarefas.md)) · **Agente** ([F029](F029-agente-orion.md)) |
| Treino | Simulador de venda |
| Arena | Arena Dobro (externo) |
| Materiais | Entregáveis ([F020](F020-menu-entregaveis.md)) |
| **Skills** | Skills ([F030](F030-menu-skills.md)) |
| Conta | Configuração |

Itens novos entram no mesmo componente e no mesmo padrão de bloqueio por compra
que já existe (`src/components/sidebar.tsx`).

## Card de Lead
Substitui a linha da tabela. Anatomia, de cima pra baixo:

```
┌──────────────────────────────────────────────┐
│ Barbearia do Zé              [92 Alto]  [☐]  │  score + faixa + seleção
│ Barbearia · MÉDIO             ★ 4.7 · 128    │  categoria · Tier · avaliações
│ (41) 99999-0000            [sem site]        │  contato + badge de site
│ ⚡ Sem site — oportunidade de construir       │  Dor principal
│ R. XV de Novembro, 100 — Curitiba            │  endereço
│ ┌────────────────────┐ ┌───────┐ ┌────────┐  │
│ │  Gerar abordagem   │ │ Abrir │ │Descartar│ │  ação primária + secundárias
│ └────────────────────┘ └───────┘ └────────┘  │
└──────────────────────────────────────────────┘
```

- **Score** exibe `~` quando `score_estimado = true` ([F025](F025-fila-do-dia.md)).
- **Dor principal** = a Dor de maior severidade do Lead, com o texto de
  `src/lib/dores/textos.ts`. É melhor que a "dica" genérica da referência
  porque sai de um Diagnóstico real. Sem Dor detectada, a linha some (não
  inventa texto).
- **Ação primária** muda com o estado: `novo` → *Diagnosticar*; `priorizado` →
  *Gerar abordagem*; com Outreach não enviada → *Abrir WhatsApp / e-mail*;
  `contatado` → *Registrar desfecho*.
- Badge de site reusa o `SiteBadge` atual (sem site / link-in-bio / rede social
  / site).

O card é usado em três lugares: Fila do dia (F025), lista `/leads` e resultado
da busca (F033) — **um componente só**.

## Lista `/leads`
- **Grid** responsivo: 1 coluna no mobile, 2 no tablet, 3–4 no desktop.
- **Chips de filtro rápido** acima do grid: `Todos · Sem site · Score 60+ ·
  Com telefone · Sem atendimento automatizado ([F026](F026-sinal-atendimento-automatizado.md)) ·
  Descartados`. Os chips **compõem** com os filtros que já existem (categoria,
  tipo de site) e vivem na URL (`?` params), pra o link ser compartilhável e o
  back do navegador funcionar.
- **Seleção em massa**: checkbox por card + "Selecionar todos (da página)".
  Ações em lote na barra que aparece com a seleção: **Descartar**
  ([F024](F024-estado-do-lead-reversivel.md)) e **Exportar CSV**.
- **Cota no topo** (barra + `N/M hoje`): o `UsoDiarioBanner` já existe; passa a
  ficar no cabeçalho da página, como na referência.
- A **tabela some**. Quem precisa de visão densa usa o Exportar CSV.

## Detalhe do Lead `/leads/[id]`
Vira a tela de trabalho de verdade, com **abas**:

| Aba | Conteúdo | De onde vem |
|-----|----------|-------------|
| **Diagnóstico** | Dados do Lead, último Diagnóstico, Dores, atendimento automatizado, botão Diagnosticar/Recalcular | F002 · F026 · F003 |
| **Abordagem** | Outreaches (WhatsApp e e-mail), gerar 1º toque e follow-up, copiar, abrir, marcar enviada | F005 · F006 · F027 |
| **Objeções** | Painel de objeções | F011 |
| **Proposta** | Gerar/ver proposta | F012 |

- **Header fixo**: `[92 Alto] Nome do Lead` + status + `Corrigir status` (F024).
- **Navegação `1/10 ‹ ›`** entre os Leads do contexto de onde o aluno veio
  (fila ou filtro atual), preservando os parâmetros na URL. É o que permite
  trabalhar a fila inteira sem voltar pra lista.
- O guard atual **não muda**: `requireLeadOwned` → `notFound()` em Lead de
  outro aluno ([F015](F015-multi-tenant.md) AC6).
- O modal do `lead-row.tsx` é **removido** — vira este detalhe.

## Critérios de aceitação
- [ ] **AC1** — `/leads` renderiza cards em grid responsivo (1/2/3–4 colunas) e
      a tabela não existe mais.
- [ ] **AC2** — O card mostra score com a faixa correta (≥60 Alto verde, 30–59
      Médio âmbar, <30 Baixo cinza) e `~` quando o score é estimado.
- [ ] **AC3** — O card mostra a Dor de maior severidade; Lead sem Dor não
      exibe a linha (nada inventado).
- [ ] **AC4** — A ação primária do card muda conforme o estado do Lead
      (Diagnosticar / Gerar abordagem / Abrir / Registrar desfecho).
- [ ] **AC5** — Chips de filtro vivem na URL: recarregar a página e usar o back
      do navegador preservam o filtro.
- [ ] **AC6** — Selecionar N cards e clicar Descartar descarta exatamente esses
      N, com confirmação.
- [ ] **AC7** — `/leads/[id]` mostra as 4 abas com o conteúdo certo e mantém a
      aba escolhida na URL (`?aba=abordagem`).
- [ ] **AC8** — A navegação `‹ ›` percorre os Leads do filtro de origem, na
      mesma ordem da lista, e some quando há um Lead só.
- [ ] **AC9** — Lead de outro usuário em `/leads/[id]` continua dando 404.
- [ ] **AC10** — Tudo responsivo: no mobile o grid vira 1 coluna e as abas
      viram scroll horizontal, sem quebra de layout.
- [ ] **AC11** — Nenhuma regressão de ação: diagnosticar, gerar Outreach,
      responder objeção, gerar proposta e registrar desfecho seguem
      funcionando a partir do detalhe.

## Decisões de implementação
- `src/app/(orion)/leads/lead-card.tsx` substitui `lead-row.tsx`; o `ui.tsx`
  (STATUS_BADGE, `scoreBadge`, `SimNao`) é reaproveitado e ganha
  `faixaDeScore()`.
- Abas por **query param** (`?aba=`), com server components — sem estado de
  cliente e sem lib de tabs.
- Os botões de ação existentes (`diagnosticar-button`, `gerar-outreach-button`,
  `responder-objecao-panel`, `gerar-proposta-button`, `desfecho-buttons`) são
  **movidos**, não reescritos.
- Sem lib nova (nada de biblioteca de tabela, grid ou tabs) → **sem ADR**.

## Fora do escopo (F032)
- Redesign de marca (cores, tipografia, logo) — a paleta atual permanece.
- Tabela como alternativa de visualização ("ver como lista").
- Colunas/cards configuráveis pelo aluno.
- Agendamentos com calendário e gerador de site-demo (existem na referência;
  ficam fora desta rodada).
- Drag & drop — é da [F034](F034-funil-kanban.md).

## Custo estimado
**$0** — só UI sobre dados que já existem.
