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

### A medida de esforço: meta de 100 Leads abordados no mês

Ganhos e Em aberto sozinhos não davam noção de progresso — resultado raro e
trabalho em curso. Faltava **esforço**, e abordagem enviada é exatamente isso.

Conta **Lead distinto** com Abordagem enviada na competência, não Abordagens:
três follow-ups pro mesmo Lead são um Lead abordado, senão a meta premiaria
insistência em vez de alcance. `Abordagem.enviado_em` já é persistido e já tem
índice — é consulta, sem cron (ADR-002). Meta igual pra todo plano: objetivo de
trabalho não é coisa que se compra.

**Meta não compartilha componente nem lugar com a cota**, e isso é deliberado:

| | Onde vive | O que é |
|---|---|---|
| Cota ([F035](F035-planos-e-limites.md)) | medidor da topbar | **teto** que não se quer bater |
| Meta | bloco "o que já fiz" | **piso** que se quer alcançar |

Duas barras "X / Y este mês" com sentidos invertidos confundiriam mais do que
informam, então a meta é desenhada como conquista: barra que enche, "faltam N",
estado de meta batida.

> **Em aberto:** a [visão](../00-product-vision.md) promete "10 Leads prontos
> por **semana**", que é outra unidade (prontos ≠ abordados) e outro período.
> As duas métricas convivem hoje; se divergirem na prática, uma das duas muda.

## Navegação (sidebar)

> **Implementação (2026-08-10):** os itens **Funil**, **Tarefas**, **Agente** e
> **Skills** entram junto com as features que os servem (F034, F031, F029,
> F030). Adicioná-los agora seria pôr no menu quatro links que dão 404 — o
> resto da F032 não depende disso.

Grupos, na ordem:

| Grupo | Itens |
|-------|-------|
| Prospecção | Dashboard · **Funil** ([F034](F034-funil-kanban.md)) · Leads · **Agente** ([F029](F029-agente-orion.md)) · **Tarefas** (badge) ([F031](F031-central-de-tarefas.md)) · **Ranking** ([F037](F037-ranking-de-builders.md)) |

> **Funil em segundo (2026-08-13).** A ordem segue a sequência de perguntas do
> dia: *como estou* (Dashboard) → *onde cada Lead parou* (Funil) → *quem são*
> (Leads). O kanban é onde o aluno **mexe** o funil; a lista bruta é consulta, e
> consulta vem depois de operação.
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

### Badge de score: o estilo diz o quanto confiar

> **Mudança de 2026-08-13.** O badge mostrava `92~` para score estimado e
> `90 Alto` para confirmado, com a **mesma cor** nos dois — `scoreBadge()`
> pintava só pela faixa do número.

Duas coisas estavam erradas:

1. **O `~` era símbolo sem legenda.** A explicação vivia só no atributo `title`,
   que não existe no toque e é ruim para leitor de tela. Na prática o aluno via
   um sinal em alguns cards e não em outros, e a leitura era de inconsistência,
   não de informação. (E estava do lado errado: a convenção de "aproximadamente"
   é **antes** do número.)
2. **A cor mentia.** Um `92` estimado recebia o mesmo verde de um `90`
   confirmado. A cor é uma **promessa de confiança**, e a Triagem não tem como
   sustentá-la: ela chuta a partir de nicho e porte, sem abrir o site. Essa é a
   única diferença que importa para decidir quem abordar, e era justamente a que
   o visual apagava.

O badge passa a comunicar as duas coisas:

| Estado | Aparência | Texto |
|---|---|---|
| **Confirmado** (pós-Diagnóstico) | preenchido, na cor da faixa | `90 Alto` |
| **Estimado** (Triagem) | contorno neutro, sem preenchimento | `92` |

A ausência da palavra já era o sinal — o `~` era redundante. Para quem não vê o
estilo, um `sr-only` diz "estimado pela Triagem, ainda sem Diagnóstico": estilo
não chega em leitor de tela, e sem isso o badge leria só "92".

A régua vive em `scoreBadge(score, estimado)` (`lib/leads/faixa.ts`) e vale nas
**três** superfícies que mostram score: card, detalhe e board do funil.

### Status: rótulo, não valor de enum
O card imprimia `lead.status` cru — o aluno lia "enriquecido" e "priorizado",
termos internos que não descrevem trabalho nenhum dele. Passa por
`ROTULO_ESTAGIO` (`lib/funil.ts`), junto da ordem canônica do funil.

> **Pendente de decisão de produto:** `priorizado` continua sendo mostrado, mas
> desde a [F025](F025-fila-do-dia.md) ele é automático — o aluno vê um estado
> que não executou e não controla. Ou o rótulo muda para algo que descreva o que
> ele significa para quem trabalha ("pronto pra abordar"), ou o estágio some do
> badge. As duas saídas mexem no domínio, então ficam fora desta emenda.

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

### Revisão 2026-08-13 — o card cabe numa varredura

O card acumulou dado de cadastro. Telefone e endereço ocupavam duas linhas
inteiras e **não decidem nada na varredura**: ninguém escolhe qual Lead abordar
pela rua em que ele fica, e o telefone só é usado depois de decidir — no
detalhe, onde ele está.

O card fica com o que se lê de relance: nome, score com faixa, categoria, e uma
fila de badges (site, status, avaliações, avisos). Nada em texto corrido.

O que muda:

| Sai | Por quê |
|-----|---------|
| Número de telefone | Não decide nada na varredura; é uso do detalhe |
| Endereço | Idem — e gastava a linha mais larga do card |

| Dor principal, em texto corrido | Ver abaixo — tentada e retirada no mesmo dia |

| Entra | Por quê |
|-------|---------|
| Chip **"sem telefone"** | Só quando `telefone = null`. Não é o número: é o aviso de que não dá pra ligar nem mandar WhatsApp — isso **sim** muda a decisão |
| Chip **"abordagem enviada"** | Evita retrabalho: o aluno vê na varredura que já falou com esse |

**A linha da Dor não fica no card.** Foi tentada duas vezes em 2026-08-13 e
retirada nas duas, a segunda vez com o card já renderizado na tela. O
raciocínio a favor era bom no papel — a Dor é o motivo de o Lead estar na fila
— mas em texto corrido ela é a linha mais larga da caixa e, numa grade de 3–4
colunas, empurra todo card pra altura de um parágrafo. Na prática ela repete,
com mais tinta, o que os badges de site já dizem em duas palavras: "sem site",
"rede social", "link-in-bio".

A Dor continua viva onde decide alguma coisa: no detalhe (aba Diagnóstico), no
prompt da Abordagem e no escopo da Proposta. Só não disputa espaço na varredura.

> `LeadCardProps.dorPrincipal` saiu junto. Ficam sem leitor `temAbordagem`,
> `waLink` e `temDiagnostico`, órfãos desde que o card perdeu os botões de ação
> em 2026-08-13 — limpar os três encolhe o `INCLUDE_CARD`, e isso é mudança de
> query em duas telas: fica pra uma passada própria.

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
- [ ] **AC14** — O card **não** mostra a Dor em texto corrido. O sinal de site
      (sem site / rede social / link-in-bio) segue como badge.
- [ ] **AC15** — No card verde, a ação é a **única** superfície branca sólida;
      os badges são contorno.

### Revisão 2026-08-13 (b) — hierarquia dentro do card verde

O card verde ficou legível, mas chapado: nome, categoria, badges e estrela
chegavam quase com o mesmo peso. A regra anterior resolveu o contraste **do
botão** e deixou o resto no mesmo branco. Três ajustes, sobre o que já existe:

- **Nome do Lead em semibold.** Era `font-medium` (500), o mesmo peso do resto
  do card. O nome é o primeiro ponto de leitura e passa a pesar como tal (600),
  nos dois cards — verde e escuro da `/leads` —, porque é o mesmo componente e
  o mesmo papel.
- **Estrela da avaliação dourada.** O tema claro derruba `amber-400` pra
  `#b45309`, o tom que passa 4.5:1 sobre branco; sobre o verde ele vira marrom
  e a estrela deixa de parecer estrela. No card verde ela volta a ser dourada —
  é ícone decorativo (`aria-hidden`), quem carrega o dado é o número ao lado.
- **Badge de score preenchido.** Contorno branco igual ao dos outros fazia o
  score — o número que decide quem abordar primeiro — disputar em pé de
  igualdade com "site" e "WhatsApp no braço". Ganha fundo de tinta escura
  (preto sobre o verde da marca, **sem hex novo**, como o resto da profundidade
  do card) e mantém o anel branco. Não vira pílula branca sólida: o branco
  sólido segue reservado pra ação (AC15).

**"Resolver" é ação primária e passa a parecer uma.** O botão da cobrança
([F031](F031-central-de-tarefas.md)) usava `.btn-ghost` — contorno neutro em
cima do card âmbar de "Pra fazer agora", onde a borda praticamente não aparece:
o alvo lia como texto, não como botão. Vira `.btn-card` (sólido, verde da
marca) nos **dois** lugares onde a linha de Tarefa existe: o bloco da home e a
`/tarefas`. Lá ele fica ao lado do `⋯`, que continua fantasma — primária
sólida, secundária contorno, a mesma regra do card.

#### Critérios de aceitação da revisão (b)
- [ ] **AC16** — O nome do Lead é semibold nos dois cards (verde e escuro).
- [ ] **AC17** — No card verde a estrela da avaliação é dourada, não marrom.
- [ ] **AC18** — No card verde o badge de score é o **único** badge com fundo
      próprio, e a ação continua sendo a única superfície branca sólida.
- [ ] **AC19** — "Resolver" é sólido na home e em `/tarefas`; o `⋯` de ações
      secundárias continua fantasma.

### Revisão 2026-08-14 — o tema sai da página e vai pro shell

O tema claro nasceu como piloto da `/leads` (revisão de 2026-08-13), com a
classe `tema-claro` no `<main>` de cada página convertida — `/leads`, `/` e
`/ranking`. Converter as demais telas uma a uma repetiria o mesmo erro em mais
dez arquivos, e o piloto já tinha exposto três buracos que a página **não tem
como** fechar, porque estão fora dela:

1. **O esqueleto de rota pintava no tema errado.** `loading.tsx` é irmão do
   `page.tsx`, não descendente: a classe no `<main>` nunca o alcançava. Cada
   clique no menu dava um flash — esqueleto escuro, página clara.
2. **O `BannerChaves` ficava de fora**, porque mora acima do `<main>`.
3. **As telas não convertidas continuavam escuras**, e a lista só crescia.

**A regra agora:** quem veste o tema é o `AppShell`, numa classe só na coluna
de conteúdo (`AppShellClient`). Toda rota autenticada — inclusive o esqueleto
dela e o banner — nasce no tema escolhido. A **sidebar continua escura de
propósito**: a referência do tema claro é sidebar escura + fundo claro + cards
brancos, e isso não mudou.

**O verde da marca se divide em dois no tema claro.** `--color-primary` é o
mesmo token do preenchimento (`bg-primary`) e do texto (`text-primary`), e o
`#22c55e` sobre branco dá **2,04:1** — reprova para texto por larga margem.
Enquanto o tema claro era só a `/leads` isso passava despercebido; valendo no
app inteiro, atinge todo link de ação ("Abrir →", "Ver planos →", "A fila de
hoje"), o preço de aluno e o `text-primary` dentro de `bg-primary/20`. Então:

- **Ação e texto** usam `#15803d` (green-700) — 5,01:1 sobre branco, e os
  mesmos 5,01:1 de branco sobre ele: um token só serve de texto e de botão.
- **Preenchimento grande** (o card da Fila do dia) mantém o `#22c55e` da marca,
  via `--verde-marca`. Área grande com texto branco por cima não tem o problema
  do texto verde de 15px, e escurecer o card tiraria o único ponto de cor cheia
  da tela.

**Botão secundário sobre fundo claro ganha superfície.** `.btn-ghost` é
transparente com `border-border`; no claro esse token vira `#e4e4e7`, que sobre
o fundo `#f4f5f7` dá 1,05:1 — o botão sumia e sobrava um texto que não parecia
clicável. No tema claro ele passa a ter preenchimento (`--color-card`) e
contorno `--color-border-strong`.

**Avisos: os degraus -50/-100/-200 também invertem.** Banner de chaves,
onboarding BYOK e aviso do ScreenshotOne usam tinta a 10% + texto quase branco
da mesma cor. Sobre branco, `text-amber-100` dava ~1,1:1. Como são os tons mais
claros da escala, viram os mais **escuros** da inversão (-800/-900) — não -700
como os de badge. E os modificadores de alfa (`/70`, `/80`, `/85`, `/90`)
saíram desses avisos: eles existiam pra abaixar texto claro sobre tinta escura,
e invertidos clareavam texto escuro sobre tinta clara, derrubando o contraste.

**Hover que trocava de cor virou opacidade** onde a direção de "mais claro" se
inverte com o tema (`hover:text-white` no banner âmbar pintava de branco um
texto que precisa ser escuro).

#### Critérios de aceitação da revisão (2026-08-14)
- [ ] **AC20** — Trocar o tema em `/configuracao` muda **todas** as rotas
      autenticadas, não só `/leads`, `/` e `/ranking`.
- [ ] **AC21** — O esqueleto de carregamento de cada rota aparece no mesmo tema
      da página que está chegando (sem flash escuro→claro).
- [ ] **AC22** — No tema claro, texto e ação em verde passam 4.5:1 sobre
      branco; o card verde da Fila do dia mantém o `#22c55e` da marca.
- [ ] **AC23** — No tema claro, `.btn-ghost` tem superfície e contorno visíveis
      sobre o fundo da página, e continua reagindo ao hover.
- [ ] **AC24** — Nenhum texto de aviso (âmbar, azul, verde) fica abaixo de
      4.5:1 sobre a própria tinta, nos dois temas.

### Revisão 2026-08-14 (b) — feedback de navegação em toda rota

O menu já tinha voltado a `<Link>` puro pra o `loading.tsx` de cada rota
aparecer (revisão de 2026-08-13), mas a cobertura estava incompleta e a lacuna
não era acidental — era estrutural:

- **`/skills` e `/entregaveis` não podiam ter `loading.tsx`**, porque um
  boundary ali cobriria `[slug]`, que chama `notFound()` e precisa de 404 de
  verdade ([F015](F015-multi-tenant.md) AC6). Resolvido com **grupo de rota**:
  a lista mora em `(lista)/`, que aceita o `loading.tsx` sem alcançar a irmã.
- **O `loading.tsx` mora dentro do `layout.tsx` da rota.** Enquanto o layout
  espera — e o de `/skills` e `/entregaveis` faz consulta de compra — não há
  esqueleto nenhum pra mostrar. E `/` e `/leads` não podem ter boundary pelo
  mesmo motivo do `notFound()`. Nesses quatro casos o sinal passa a ser um
  **ponto pulsante no item do menu**, via `useLinkStatus` do Next: ele só
  existe dentro do `<Link>`, descreve a navegação daquele link e zera sozinho
  quando outra começa — que é exatamente o que o `useTransition` à mão não
  fazia quando os três spinners ficavam girando juntos.
- **Cada esqueleto usa a largura da própria rota.** `RotaSkeleton` era
  `max-w-6xl` fixo pra todas, e as páginas vão de `max-w-2xl` (Configuração) a
  `max-w-[100rem]` (Funil): o conteúdo pulava de largura ao chegar. Esqueleto
  que não bate com a página é layout shift disfarçado de carregamento.
- **`/leads/[id]` passa a pintar o cabeçalho antes do corpo.** A tela fazia
  sete consultas num `Promise.all` e só então renderizava; nome, score e
  estágio saem do `requireLeadOwned`, que já resolveu. O 404 continua decidido
  **fora** de qualquer `<Suspense>`.
- **`/entregaveis/[slug]` não tem o que suspender** (o `page.tsx` não faz E/S),
  mas a espera existe no `<iframe>`. Ganhou esqueleto próprio, removido no
  `onLoad`.

#### Critérios de aceitação da revisão (b)
- [ ] **AC25** — Clicar em qualquer item do menu produz feedback visível antes
      da tela nova chegar, inclusive em `/`, `/leads`, `/skills` e
      `/entregaveis`.
- [ ] **AC26** — O esqueleto de cada rota tem a mesma largura de conteúdo da
      página correspondente.
- [ ] **AC27** — `/leads/[id]` de outro aluno continua devolvendo **404**
      (nenhum boundary de rota acima dela).
- [ ] **AC28** — Toda `page.tsx` sob `(orion)` tem `loading.tsx` acima,
      `<Suspense>` na própria página, ou esqueleto próprio — garantido por
      `tests/unit/feedback-de-navegacao.test.ts`.

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
