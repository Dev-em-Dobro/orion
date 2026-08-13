# F032 — Interface do Orion (shell, cards e detalhe com abas)

## Status
Implementada — 2026-08-10 · parte do [revamp do fluxo](../10-revamp-do-fluxo.md) (Fase B)

## Objetivo
Trocar a interface de **planilha** por uma de **trabalho**. Hoje `/leads` é uma
tabela de 7 colunas em que tudo — Diagnóstico, Abordagem, objeções, proposta,
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

## Sistema visual (2026-08-11)

Mora em `src/app/globals.css`. O Dashboard é o primeiro consumidor; as demais
telas migram usando as mesmas classes.

### O que estava errado, em número

| Medida | Antes | Depois |
|--------|-------|--------|
| Card (`#101013`) vs. fundo (`#09090b`) | **1.05:1** | 1.10:1 **+ borda + sombra + realce** |
| Borda (`#27272a`) vs. fundo | **1.34:1** | 2.1:1 (`#2f2f38`) |
| Corpo de texto | 14px | 15px |
| Informação secundária | 12px | 13px |
| Altura do `.btn-ghost` | ~26px | ~34px |

Em fundo quase preto, clarear a superfície tem retorno decrescente: mesmo
`#16161b` só chega a 1.10:1. Quem desenha a quina é a **combinação** —
preenchimento + borda + sombra + realce interno de 1px no topo (`--elev-1`). O
olho lê o gradiente da borda, não o contraste chapado. Por isso o token de
elevação é uma variável só, e não três decisões soltas por componente.

### Tipografia

Fira Sans → **Inter**; Fira Code → **JetBrains Mono**. A troca não é de gosto:
Fira Sans nasceu para a UI do Firefox OS e tem x-height modesto, então rende
menor que o tamanho nominal. Inter foi desenhada para tela, com x-height alto e
figuras tabulares. `tabular-nums` fica no `body` — sem isso a coluna de números
"dança" a cada atualização.

Escala: **13 · 15 · 16 · 18 · 22 · 28 · 34**, cada degrau com entrelinha
própria (corpo 1.5–1.6, título 1.15–1.35).

Versalete (`uppercase`) sobrevive **só** em rótulo curto de número
(`.metric-label`). Título de seção a 14px em versalete somava forma de palavra
achatada com corpo pequeno — o pior caso de leitura; virou 16px em caixa
normal (`.card-title`).

### Classes

| Classe | Uso |
|--------|-----|
| `.card` | Superfície padrão, `--elev-1` |
| `.card-interativo` | Card clicável: quina reage no hover |
| `.surface-2` | Caixa **dentro** de um card (senão some contra ele) |
| `.card-title` / `.card-sub` | Título e subtítulo de seção |
| `.metric-label` / `.metric-value` / `.metric-nota` | Trio do indicador |

### Layout do Dashboard

Os quatro indicadores saíram da coluna estreita ao lado do funil e ganharam
faixa própria de quatro colunas. Número de 30px espremido em 1/3 da largura não
é indicador, é rodapé.

O par funil + follow-up usa `items-start`: sem isso o card de follow-up estica
para acompanhar a altura do funil e vira um bloco vermelho quase vazio.

#### Reorganização de 2026-08-13 — três perguntas, três blocos

A home tinha seis blocos empilhados (fila, cobranças, quatro métricas, funil,
follow-up, taxas de conversão) e nenhuma leitura óbvia de *o que falta* e *o que
já foi feito*. Passa a responder três perguntas, uma por bloco:

```
┌──────────────────────────────────┬───────────────────┐
│ O QUE FAZER                      │ ONDE ESTÃO        │
│  Sua fila de hoje (cards)        │  Funil por        │
│  Pra fazer agora (cobranças)     │  estágio          │
└──────────────────────────────────┴───────────────────┘
┌──────────────────────────────────────────────────────┐
│ O QUE JÁ FIZ  ·  Ganhos · Em aberto                  │
└──────────────────────────────────────────────────────┘
```

**Por que "o que fazer" fica na coluna larga.** A Fila do dia
([F025](F025-fila-do-dia.md)) renderiza o **card de Lead inteiro**, o mesmo da
`/leads` — que pede ~320px. Em 1/3 da largura vira uma pilha de 10 cards muito
mais alta que o vizinho. Na coluna de 2/3 cabem duas colunas de card. O funil é
SVG vertical de 320px fixos: é ele que cabe no rail estreito, não a fila.

Isso também preserva a ordem de prioridade da F025 — *quem eu abordo agora*
antes de *como está o funil* — porque a coluna larga da esquerda é o primeiro
ponto de leitura.

**O que saiu, e por quê:**

| Saiu | Motivo |
|------|--------|
| Card **"Follow-up pendente"** | Quarta cópia do mesmo aviso: badge da sidebar + `/tarefas` + "Pra fazer agora" (que já traz `MANDAR_FOLLOWUP`) + este. Mesmo problema que a `/leads` teve ([F031](F031-central-de-tarefas.md)) |
| **Taxas de conversão** | A própria legenda dizia "aproximação sobre o estado atual (sem histórico)". Taxa tirada de foto do momento engana: quem converteu já saiu do estágio de origem |
| **Score médio** | Média de um número que na maioria ainda é estimativa da Triagem. Não muda decisão nenhuma |
| **Total de Leads** | O funil ao lado já mostra a distribuição, e a soma dela é o total |
| **"Exigem atenção"** | É a Fila do dia com outro recorte (score ≥ 60 sem Abordagem enviada, contra "diagnosticado, priorizado e não abordado"). Duas listas respondendo "quem eu abordo" na mesma tela, com resultados quase iguais e ordens diferentes |

> **Pendente: "o que já fiz" ainda é fraco.** Sem uma medida de esforço, o bloco
> tem só Ganhos e Em aberto — resultado raro e trabalho em curso, nada que dê
> noção de progresso no dia a dia. A medida natural é **Leads abordados no mês**
> (`Abordagem.enviado_em` já é persistido e já tem índice, então é consulta, não
> infra nova). Ficou fora desta rodada por decisão do Ricardo (2026-08-13).
> Quando entrar, precisa **não** parecer a barra de cota do plano
> ([F035](F035-planos-e-limites.md)): cota é teto que não se quer bater, meta é
> piso que se quer alcançar. E o número tem que conversar com a
> [visão](../00-product-vision.md), que hoje promete "10 Leads prontos por
> **semana**".

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
| **Skills** | Skills ([F030](F030-menu-skills.md)) |
| Conta | Planos ([F035](F035-planos-e-limites.md)) · Configuração |

> **Mudança de 2026-08-11 — o menu só tem prospecção.** Os grupos **Arena**
> (link externo pra `arena.devemdobro.com`) e **Materiais**
> ([F020](F020-menu-entregaveis.md)) saíram. Conteúdo de comunidade e material
> de curso não são o trabalho que o Orion faz; misturados no menu, competiam
> com a fila do dia pela atenção de quem abriu o app pra prospectar. As rotas
> de `/entregaveis` continuam de pé e gateadas — só não se chega nelas pelo
> menu.

Itens novos entram no mesmo componente (`src/components/sidebar.tsx`) e no
padrão de bloqueio por plano da [F035](F035-planos-e-limites.md): item visível,
com cadeado, apontando pra `/planos`.

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
  *Gerar abordagem*; com Abordagem não enviada → *Abrir WhatsApp / e-mail*;
  `contatado` → *Registrar desfecho*.
- Badge de site reusa o `SiteBadge` atual (sem site / link-in-bio / rede social
  / site).

O card é usado em três lugares: Fila do dia (F025), lista `/leads` e resultado
da busca (F033) — **um componente só**.

### Revisão 2026-08-13 — o card diz por que, não onde

O card acumulou dado de cadastro e perdeu o dado de decisão. Telefone e endereço
ocupavam duas linhas inteiras e **não decidem nada na varredura**: ninguém
escolhe qual Lead abordar pela rua em que ele fica, e o telefone só é usado
depois de decidir — no detalhe, onde ele está. Enquanto isso a **Dor**, que é a
razão de o Lead estar ali, tinha saído.

O que muda:

| Sai | Por quê |
|-----|---------|
| Número de telefone | Não decide nada na varredura; é uso do detalhe |
| Endereço | Idem — e gastava a linha mais larga do card |

| Entra / volta | Por quê |
|---------------|---------|
| **Dor principal**, com destaque | É o motivo do Lead existir na fila. Voltou de onde nunca devia ter saído |
| Chip **"sem telefone"** | Só quando `telefone = null`. Não é o número: é o aviso de que não dá pra ligar nem mandar WhatsApp — isso **sim** muda a decisão |
| Chip **"abordagem enviada"** | Evita retrabalho: o aluno vê na varredura que já falou com esse |

**Contraste no card verde da Fila do dia.** Botão e badges eram os dois pílula
branca, então a ação primária não tinha como ganhar — virava mais uma etiqueta.
Agora só a ação é sólida:

- **Ação**: pílula **branca com texto quase preto** (`.btn-card`). Preto sobre
  branco lê melhor que o verde da marca em texto pequeno.
- **Badges**: contorno branco sobre transparente, texto branco. Mesmo peso de
  informação de antes, sem competir com o botão.

No card escuro (`/leads`) nada disso muda: badges seguem coloridos e a ação usa
o verde da marca. A regra vale só onde a superfície é verde.

#### Critérios de aceitação da revisão
- [ ] **AC12** — O card não mostra telefone nem endereço em nenhuma das três
      telas onde é usado.
- [ ] **AC13** — Lead sem telefone mostra o chip "sem telefone"; Lead com
      telefone não mostra chip nenhum de contato.
- [ ] **AC14** — Lead com Dor detectada mostra a Dor principal em destaque;
      sem Dor, a linha some (não inventa texto).
- [ ] **AC15** — No card verde, a ação é a **única** superfície branca sólida;
      os badges são contorno.

## Lista `/leads`
- **Grid** responsivo: 1 coluna no mobile, 2 no tablet, 3–4 no desktop.
- **Largura: a lista usa a tela.** O container era `max-w-6xl` (1152px) dentro
  de uma sidebar de 240px — em 1920px sobravam **264px mortos de cada lado** e o
  grid parava em 3 colunas. O container da `/leads` passa a acompanhar a
  viewport (`px-6 lg:px-8`, sem teto), e a 4ª coluna entra em `2xl`.
  > Largura não vale pra texto: título, subtítulo e estados vazios mantêm
  > `max-w` próprio. Linha de 1600px é pior de ler que linha curta — o limite
  > confortável é 65–75 caracteres.
  >
  > O breakpoint é **do container, não da viewport**. `xl:grid-cols-3` mede a
  > janela e ignora os 240px de sidebar, então a 1280px o grid montava 3 colunas
  > numa área de 1040px. Container query (`@container`, nativo no Tailwind 4 —
  > sem lib nova, sem ADR) mede o espaço que o grid realmente tem.
- **Chips de filtro rápido** acima do grid: `Todos · Sem site · Score 60+ ·
  Com telefone · Sem atendimento automatizado ([F026](F026-sinal-atendimento-automatizado.md)) ·
  Descartados`. Os chips **compõem** com os filtros que já existem (categoria,
  tipo de site) e vivem na URL (`?` params), pra o link ser compartilhável e o
  back do navegador funcionar.
- **Seleção em massa**: checkbox por card + "Selecionar todos (da página)".
  Ações em lote na barra que aparece com a seleção: **Descartar**
  ([F024](F024-estado-do-lead-reversivel.md)) e **Exportar CSV**.
- **Cota: saiu do cabeçalho da página.** A F032 tinha posto `UsoDiarioBanner` e
  `UsoMensalBanner` no topo da `/leads`, copiando a referência. Os dois blocos
  empilhados comiam ~150px acima da dobra pra dizer `0/300` e `0/5` — e o
  primeiro Lead só aparecia depois do formulário de busca. Desde 2026-08-13 a
  cota vive no **medidor da topbar** ([F035](F035-planos-e-limites.md)), global
  e compacto.
- A **tabela some**. Quem precisa de visão densa usa o Exportar CSV.

## Detalhe do Lead `/leads/[id]`
Vira a tela de trabalho de verdade, com **abas**:

| Aba | Conteúdo | De onde vem |
|-----|----------|-------------|
| **Diagnóstico** | Dados do Lead, último Diagnóstico, Dores, atendimento automatizado, botão Diagnosticar/Recalcular | F002 · F026 · F003 |
| **Abordagem** | Abordagens (WhatsApp e e-mail), gerar 1º toque e follow-up, copiar, abrir, marcar enviada | F005 · F006 · F027 |
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
- [ ] **AC11** — Nenhuma regressão de ação: diagnosticar, gerar Abordagem,
      responder objeção, gerar proposta e registrar desfecho seguem
      funcionando a partir do detalhe.

## Decisões de implementação
- `src/app/(orion)/leads/lead-card.tsx` substitui `lead-row.tsx`; o `ui.tsx`
  (STATUS_BADGE, `scoreBadge`, `SimNao`) é reaproveitado e ganha
  `faixaDeScore()`.
- Abas por **query param** (`?aba=`), com server components — sem estado de
  cliente e sem lib de tabs.
- Os botões de ação existentes (`diagnosticar-button`, `gerar-abordagem-button`,
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
