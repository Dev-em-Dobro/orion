# F040 — Tour do menu

## Status
Implementada e validada — 2026-08-16.

Validada no navegador contra a conta de seed local (plano Pro, 15 Leads), em
1440×900 e 375×812, nos dois temas. Duas coisas que só a tela mostrou:

- **O contador abriu em "de 11", não "de 12"** — a conta não tem skill
  publicada, o item não existe no menu, o passo foi descartado. É a AC3
  acontecendo sem ninguém programar o caso.
- **Nenhuma requisição de rede durante o tour inteiro.** `network` limpo do
  primeiro ao último passo (AC11).

## Objetivo
Responder **"o que é cada coisa deste menu?"** apontando para o item, na tela
real, um de cada vez.

A [F039](F039-primeiros-passos.md) resolveu a **ordem do trabalho** — buscar →
aprofundar → abordar → acompanhar. Ela não resolve o mapa: um aluno que já sabe
a ordem abre o app e ainda vê onze itens de menu sem saber o que é "Fila do
dia", por que "Leads" vem antes de "Funil", ou o que uma "Skill" faz ali.

O painel da F039 não serve pra isso, e não por falta de espaço: **ele não
aponta**. Descrever onze itens em texto corrido é pedir pro aluno traduzir uma
lista num menu que está a dez centímetros de distância, e essa tradução é
exatamente o trabalho que a gente quer poupar. Coach mark resolve porque o
item **acende**: o balão fala de uma coisa só, e essa coisa está iluminada
enquanto ele lê.

## Por que agora, se a F039 chamou isso de "fora de escopo"

A F039 excluiu coach marks por dois motivos declarados. Os dois têm resposta.

1. **"Exigiria lib nova — logo ADR."** Não exige. O efeito são três coisas: um
   `<div>` transparente que come os cliques, um `<div>` do tamanho do alvo com
   `box-shadow` de spread gigante (é o `box-shadow` que escurece o resto da
   tela — o alvo não é apagado, ele fica no buraco) e um balão posicionado por
   aritmética de `getBoundingClientRect`. Nenhuma dependência, nada no bundle.
2. **"Quebra a cada mexida de layout, e na Fase 3 isso acontece toda semana."**
   Esse é o motivo de verdade, e é ele que a implementação tem que desarmar:
   **passo cujo alvo não está no DOM é pulado**, não quebra e não deixa balão
   apontando pro nada. O contador "N de M" se ajusta ao que existe. Renomear
   uma rota ou remover um item do menu degrada o tour em um passo a menos —
   nunca em tela travada. É a mesma escolha da F030, que só mostra o grupo
   Skills quando há skill publicada: menu com link morto é pior que menu sem
   o item.

### Por que não a Intro.js

A biblioteca citada como referência (`intro.js`) está fora por um motivo **além**
do ADR: desde a v3 ela é **dual-licenciada AGPL-3.0 + licença comercial paga**.
O Orion é produto hospedado e fechado — AGPL não serve, e a licença comercial é
custo recorrente pra entregar um overlay e um balão. As alternativas MIT
(driver.js, shepherd.js, react-joyride) resolveriam a licença e continuariam
custando ADR, bundle e uma API de terceiro pra manter viva a cada mexida de
layout. **Sem lib nova → sem ADR.**

## Relação com a F039

Dois gatilhos vizinhos no rodapé do menu, e a diferença tem que caber no rótulo:

| | Pergunta | Forma | Estado |
|---|---|---|---|
| **Tour do menu** (F040) | "Onde fica o quê?" | Aponta pro menu, passo a passo | Nenhum — o menu é igual pra todo mundo, tirando o cadeado |
| **Primeiros passos** (F039) | "Em que ordem eu faço?" | Painel com a sequência | Lido da base do aluno |

Nada é duplicado: o tour **não** repete a ordem do trabalho, e o último passo
dele é justamente o botão da F039 — "e quando quiser saber por onde começar, é
aqui". O caminho inverso também existe: o painel da F039 ganha um link
secundário que fecha o painel e começa o tour.

## Os passos

Um por item de menu, na ordem em que eles aparecem. O texto de cada um responde
**o que é** e **quando se usa** — nunca "clique aqui para".

| # | Alvo (`data-tour`) | Título | O que diz |
|---|---|---|---|
| 1 | — (centralizado) | Este é o menu do Orion | Abre o tour dizendo quanto tempo leva e que dá pra sair a qualquer momento |
| 2 | `dashboard` | Dashboard | A Fila do dia: os melhores Leads já com Dor e Abordagem prontas ([F025](F025-fila-do-dia.md)) |
| 3 | `leads` | Leads | Onde a busca acontece e onde ficam todos — é o começo de tudo ([F033](F033-busca-estruturada.md)) |
| 4 | `funil` | Funil | O kanban: onde cada Lead parou depois que você falou com ele ([F034](F034-funil-kanban.md)) |
| 5 | `agente` | Agente | Pergunta em português sobre a sua própria base ([F029](F029-agente-orion.md)) |
| 6 | `tarefas` | Tarefas | O que está parado e cobrando resposta ([F031](F031-central-de-tarefas.md)) |
| 7 | `ranking` | Ranking | O placar do mês entre os alunos ([F037](F037-ranking-de-builders.md)) |
| 8 | `treino` | Simulador de venda | Treinar a conversa antes de gastar um Lead de verdade ([F013](F013-simulador-de-venda.md)) |
| 9 | `skills` | Skills | As aulas aplicadas ao seu caso ([F030](F030-menu-skills.md)) |
| 10 | `planos` | Planos | O que cada plano abre, e o teto de uso do seu ([F035](F035-planos-e-limites.md)) |
| 11 | `configuracao` | Configuração | As configurações da conta ([F016](F016-configuracao-de-chaves.md)) |
| 12 | `primeiros-passos` | Primeiros passos | O gatilho da F039 — a ordem do trabalho, com o seu progresso |

O passo 9 (Skills) **não existe** quando não há skill publicada, e não por regra
própria: o item some do menu pela F030, o alvo não é encontrado, o passo é
pulado. Nenhuma lista precisa saber disso duas vezes.

### O balão espelha o cadeado, e hoje não há cadeado

A v2 da [F035](F035-planos-e-limites.md) **revogou o gate por recurso**: os três
planos liberam Funil, Agente, Tarefas e exportar CSV, e o que separa plano de
plano é cota, não feature. A máquina de cadeado (`Recurso` + modal) continua no
código pra quando voltar a existir recurso fechado.

O tour segue essa decisão em vez de repeti-la: os passos de Funil, Agente e
Tarefas declaram o `recurso` que o item exige, e o balão só ganha a linha
"fechado no seu plano" quando `temRecurso(plano, recurso)` for falso — a mesma
função que decide o cadeado no menu. **Hoje essa linha nunca aparece**, e é o
resultado certo: um tour dizendo "recurso pago" ao lado de um item sem cadeado
mentiria pro aluno.

Não há lista de "itens pagos" escrita aqui. No dia em que um plano fechar um
recurso, o cadeado acende no menu e o aviso acende no tour, sem tocar nesta
spec. O que decide é o `plano` que a sidebar já tem em mãos; nenhuma consulta
nova.

### O tour não navega

Nenhum passo tem botão de "ir para". Um tour que troca de rota no meio destrói
o próprio contexto: o menu é o mesmo em todas as telas, então navegar não
mostraria nada de novo, e o `loading.tsx` da rota destino piscaria por baixo do
overlay. Quem navega é o aluno, depois — e o item já está aceso na frente dele.

Isso também é o que faz o tour ser **estado zero**: nada é lido do banco, nada é
gravado. Ele funciona igual no minuto zero (sem chave, sem Lead) e no aluno com
mil Leads — e é o único tutorial do app que funciona com o banco fora do ar.

## UI

**O gatilho** é um item fixo no rodapé do menu, logo acima de "Primeiros
passos", nos dois lugares em que o menu aparece (sidebar do desktop e drawer do
mobile). Como o da F039, é `<button>` com `aria-haspopup="dialog"`, não rota.

**O tour** tem três camadas, todas `fixed`:

1. **Bloqueio** (`z-70`), transparente, cobre a tela: enquanto o tour roda, o
   clique é do tour. Clicar nele encerra — mesma regra de "clique fora fecha"
   dos diálogos da F035 e da F039.
2. **Recorte** (`z-71`), `pointer-events: none`, do tamanho exato do alvo:
   `box-shadow` de 3px na cor primária (o anel) seguido de um spread de
   `100vmax` em preto a 65% (o escurecimento do resto). O alvo não é levantado
   de camada — **o escuro é que passa por fora dele**. Levantar o item por
   `z-index` não funcionaria: a sidebar é `z-40` posicionada, logo um contexto
   de empilhamento, e nada de dentro dela sobe acima de um overlay irmão.
3. **Balão** (`z-72`), largura fixa, posicionado por aritmética.

```
┌──────────────┐
│  Dashboard   │      ┌────────────────────────────────────┐
│ ▸ Leads   ◀──┼──────┤ Tour do menu              3 de 12  │
│  Funil    🔒 │      │                                    │
│  Agente   🔒 │      │ Leads                              │
│              │      │ Onde a busca acontece: escolha o   │
│              │      │ nicho e a cidade, e o Orion traz   │
│              │      │ os estabelecimentos já triados.    │
│              │      │                                    │
│              │      │ Pular          Anterior  Próximo ▸ │
│              │      └────────────────────────────────────┘
```

**Posicionamento do balão** — tentativa em ordem, e a primeira que couber na
viewport vence: direita → esquerda → abaixo → acima → centro. No desktop a
sidebar está na borda esquerda e ganha "direita"; no mobile o drawer está na
borda direita e ganha "esquerda". Não há regra por dispositivo, e é de
propósito: a conta é sobre onde o alvo **está**, não sobre o tamanho da tela.
O eixo cruzado é centralizado no alvo e preso à viewport com uma margem, pra
nenhum balão nascer cortado.

**No mobile o tour abre o drawer.** Os itens de menu só existem no DOM com o
drawer aberto — um tour disparado do painel da F039 no Dashboard não teria alvo
nenhum e pularia tudo. Quem abre é a `Sidebar`, que é dona dos dois estados; se
foi o tour que abriu, é o fim do tour que fecha.

**Teclado:** `→` / `Enter` avança, `←` volta, `Escape` encerra e devolve o foco
ao gatilho. O foco entra no balão a cada passo — é o que faz o leitor de tela
anunciar o passo novo sem `aria-live` paralelo.

**O tour segue o tema do app**, pelo mesmo motivo e pelo mesmo caminho da F039:
ele cobre a tela inteira, é disparado de dentro da sidebar escura, e quem manda
é o cookie do tema. A leitura do cookie no cliente vira função pura em
`lib/tema` em vez de uma segunda cópia dentro do componente.

**Movimento:** o recorte desliza de um item pro outro em 200ms — é o que mostra
que o tour andou. Sob `prefers-reduced-motion: reduce` ele salta, sem transição.

## Copy

Cada balão tem **duas frases no máximo**. O tour é lido em pé, no meio de outra
coisa; texto de três linhas por passo vira doze parágrafos que ninguém termina.

Linguagem ubíqua sem exceção: Lead, Diagnóstico, Dor, Abordagem, score
(`/specs/01-domain-model.md`).

## Modelo de dados

**Nenhuma mudança.** Sem tabela, sem coluna, sem migração — e sem `localStorage`
(ver "Fora do escopo").

## Critérios de aceitação

- [x] **AC1** — O item "Tour do menu" aparece no rodapé do menu no desktop e no
      drawer do mobile, acima de "Primeiros passos", e abre o tour em vez de
      navegar.
- [x] **AC2** — O primeiro passo é centralizado, sem alvo; do segundo em diante
      cada passo acende **um** item do menu, na ordem do menu.
- [x] **AC3** — Passo cujo alvo não está no DOM é omitido, o tour continua, e o
      total do contador reflete só os passos que existem. *Verificado sem
      encenação: a conta de seed não tem skill publicada e o tour abriu em
      "1 de 11".*
- [x] **AC4** — Nenhum passo navega: a rota no fim do tour é a mesma do começo.
- [x] **AC5** — O aviso de "fechado no seu plano" aparece num passo **se e
      somente se** `temRecurso(plano, recurso)` for falso — a mesma condição do
      cadeado no menu. Com o catálogo de hoje (F035 v2, todos os recursos em
      todos os planos), nenhum passo mostra o aviso, inclusive no Free.
      *Coberto por teste; sem nada pra ver na tela, que é o resultado certo.*
- [x] **AC6** — O balão nunca nasce fora da viewport: com o alvo na borda
      esquerda ele abre à direita, com o alvo na borda direita **e espaço** ele
      abre à esquerda, e sem espaço na horizontal (o caso do drawer no celular)
      cai pra abaixo/acima/centro.
- [x] **AC7** — Teclado: `→`/`Enter` avança, `←` volta, `Escape` encerra; o foco
      entra no balão a cada passo e volta pro gatilho no fim.
- [x] **AC8** — Enquanto o tour roda, clique na página não aciona a página:
      clicar fora do balão encerra o tour.
- [x] **AC9** — No mobile, o tour aberto pelo painel da F039 abre o drawer,
      acende os itens dele e fecha o drawer ao terminar.
- [x] **AC10** — `Escape` durante o tour encerra **só** o tour: o drawer do
      mobile não fecha junto no mesmo pressionar. *Drawer aberto pelo aluno
      continua aberto; drawer aberto pelo tour fecha (AC9) — são casos
      diferentes e foram testados separados.*
- [x] **AC11** — O tour funciona sem chave configurada, sem Lead e sem consulta
      ao banco: nenhuma Server Action é chamada em nenhum passo.
- [x] **AC12** — No tema claro o balão sai claro pelos dois gatilhos (rodapé da
      sidebar e painel da F039), não escuro por um e claro pelo outro.

## Decisões de implementação

- `src/lib/tutorial/tour.ts` — catálogo dos passos + duas **funções puras**, que
  é o que os testes exercitam:
  - `passosDoTour(plano)`: marca `bloqueado` nos passos de recurso pago (AC5);
  - `posicionarBalao(alvo, balao, viewport)`: a aritmética de direita →
    esquerda → abaixo → acima → centro, com o eixo cruzado preso à viewport
    (AC6). Recebe retângulos, não elementos — sem DOM, sem Next.
- `src/components/tour-do-menu.tsx` — client: as três camadas, a medição do
  alvo (`getBoundingClientRect` + `scrollIntoView`), o teclado e o foco. É quem
  descarta os passos sem alvo (AC3), escolhendo sempre o alvo **visível** —
  sidebar e drawer marcam o mesmo `data-tour`, e só um dos dois tem caixa.
- `src/components/sidebar.tsx` — `data-tour` em cada item, o gatilho no rodapé,
  a abertura do drawer no mobile (AC9) e o `Escape` que o tour toma pra si
  enquanto roda (AC10).
- `src/lib/tema.ts` — `classeDoTemaDoCookie(document.cookie)`, pura: o mesmo
  cálculo que a F039 fazia dentro do componente, agora com um dono só (AC12).
- Comunicação entre o painel da F039 e a sidebar por `CustomEvent`
  (`EVENTO_TOUR`), não por contexto novo: é um sinal sem carga, de um botão pra
  um listener, e um provider no shell custaria re-render em toda rota (F028).
- `tests/unit/tour-do-menu.test.ts` — cobre AC3, AC5 e AC6 sobre as funções
  puras.
- **Sem lib nova → sem ADR.**

## Fora do escopo (F040)

- **Abrir sozinho no primeiro login.** Mesma decisão da F039: o aluno aciona
  quando quer. Auto-start exigiria lembrar quem já viu — `localStorage` (que
  não sobrevive a trocar de máquina) ou coluna nova (migração pra uma
  preferência que não é dado de domínio). Nenhum dos dois se paga aqui.
- **"Não mostrar de novo".** Consequência do item acima: sem auto-start não há
  o que dispensar.
- Tour dentro das telas (a Fila do dia, a aba Abordagem, o kanban). Este é o
  tour **do menu**; tour de tela é outra feature, e só depois que o layout da
  Fase 3 parar de se mexer.
- Fluxo com passo que exige ação do aluno ("clique aqui pra continuar").
- Vídeo, GIF ou qualquer mídia hospedada.

## Custo estimado

**$0.** Nenhuma chamada de API externa, nenhum token de LLM, nenhuma consulta ao
banco, nenhuma infra nova.
