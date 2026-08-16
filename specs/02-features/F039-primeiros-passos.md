# F039 — Primeiros passos (tutorial guiado)

## Status
Implementada — 2026-08-15

## Objetivo
Dar ao aluno **a ordem do trabalho** em um lugar só: **buscar → aprofundar →
abordar → acompanhar no funil**.

Hoje o app não tem primeiro passo. Cada tela vazia se explica e oferece uma
saída — a `/` sem Lead manda coletar, a `/leads` sem chave manda configurar, a
fila vazia manda buscar — e mesmo assim ninguém diz a **sequência**. O aluno
entende cada tela isolada e continua sem saber por onde começar.

Espalhar mais explicação não resolve: **quem não sabe a ordem também não sabe em
que tela procurar**. Por isso a forma é um **botão** — sempre no mesmo lugar do
menu, acionado quando o aluno quiser — que abre a sequência inteira numa tela
só, com o que é cada passo, por que ele existe e o botão que leva à tela onde se
faz.

E o painel **lê a base do aluno**: cada passo já vem marcado como feito ou não.
O tutorial acompanha o trabalho em vez de ser um texto que se lê uma vez e
nunca mais.

## Por que não é o Agente Orion

O [Agente](F029-agente-orion.md) já responde "O que eu faço agora?" — é uma das
sugestões da tela vazia dele. Ele **não** serve como tutorial, por três razões,
e todas apontam pro mesmo buraco: ele falha exatamente no aluno que precisa.

1. **Agente é recurso de plano pago** ([F035](F035-planos-e-limites.md)). O
   aluno novo é Free: clica no item do menu e bate no cadeado. O tutorial é do
   produto, não do plano.
2. **Agente depende de chave de IA.** Em BYOK sem chave configurada ele não
   responde — e "sem chave" é o estado do minuto zero. O tutorial precisa
   funcionar justamente aí, porque o primeiro passo dele é *configurar a chave*.
3. **Resposta de LLM varia.** A ordem do produto não pode variar de execução
   pra execução, nem custar tokens pra ser lida.

Os dois convivem, e a divisão é clara: o **tutorial** responde "como este
produto funciona"; o **Agente** responde "e agora, no meu caso, com os meus
Leads". Nada é duplicado — o Agente continua sendo quem olha a base e opina.

## Os passos

Quatro ou cinco, na ordem em que o trabalho acontece — o primeiro só existe pra
quem usa chave própria. Nenhum é inventado pra tutorial: cada um é uma tela que
já existe.

| # | Passo | Pergunta que responde | Tela | Feito quando |
|---|-------|----------------------|------|--------------|
| 1 | **Ligue as chaves** (só em BYOK) | "Por que nada roda?" | `/configuracao` | `chavesEssenciaisFaltando` volta vazio |
| 2 | **Busque estabelecimentos** | "De onde vêm os Leads?" | `/leads` | o aluno tem ≥ 1 Lead |
| 3 | **Aprofunde os melhores** | "O que é aprofundar?" | `/` (Fila do dia) | ≥ 1 Lead com `score_estimado = false` |
| 4 | **Aborde o primeiro da fila** | "E quando eu falo com o dono?" | `/` → detalhe do Lead, aba Abordagem | ≥ 1 Abordagem com `enviado = true` |
| 5 | **Registre o que aconteceu** | "E depois que eu mandei?" | `/funil` | ≥ 1 Lead com status **além** de `contatado` |

Notas de cada regra:

- **Passo 1 não existe no modo Orion.** Quem usa as chaves da casa
  ([F018](F018-limites-diarios.md)) não tem o que configurar — o passo saía
  marcado como feito e com a linha "Chaves da plataforma — nada a fazer aqui",
  que é um item de tutorial ensinando a não fazer nada. Some da lista, e o
  contador passa a ser **de 4**. É a única exceção a "passo feito não some"
  (abaixo), e por um motivo diferente: os outros o aluno **fez**; este ele
  nunca teria feito.
- **Passo 3 usa `score_estimado`, não o status.** É o campo que a
  [F025](F025-fila-do-dia.md) usa pra separar score chutado pela Triagem de
  score confirmado por Diagnóstico — que é exatamente o que "aprofundar" faz.
- **Passo 4 exige Abordagem *enviada*, não gerada.** Gerar texto não é abordar.
  Quando existe Abordagem gerada e nenhuma marcada como enviada, o passo fica em
  aberto e a linha de detalhe diz isso — é o erro mais provável do aluno novo, e
  é o que trava a Central de Tarefas ([F031](F031-central-de-tarefas.md)), que
  conta a partir do envio.
- **Passo 5 é "além de `contatado`", não "chegou em `contatado`".** Marcar
  enviada já promove o Lead pra `contatado` (`marcarEnviado`), então parar aí
  faria o passo 5 se dar por feito junto com o 4, sem o aluno tocar no funil.
  Vale `respondeu`, `qualificado`, `proposta`, `ganho` ou `perdido` — os
  estágios que só existem porque **alguém registrou**.

### Estado derivado, não persistido

Nada de tabela nova, coluna nova ou flag de "tutorial concluído". Cada passo é
uma **consulta** sobre dado que já existe — a mesma escolha da Fila do dia
(F025) e da Central de Tarefas (F031). Três consequências, todas desejadas:

- não dessincroniza (não há dois lugares dizendo se o aluno buscou);
- vale retroativamente — quem já prospecta abre o painel e vê tudo marcado, sem
  migração de dado;
- desfazer volta atrás sozinho: excluir os Leads descartados, por exemplo,
  reabre o passo se a base ficar vazia.

### Passo feito não some

Um passo concluído continua na lista, com marca de feito. A **sequência é a
aula**: sumir com o começo deixaria o aluno com um pedaço do meio e nenhuma
noção de onde ele está. O que muda é o destaque — o painel aponta o **passo
atual**, que é o primeiro não feito.

A exceção é o passo que **nunca foi passo pra aquele aluno**: as chaves no modo
Orion. Não é trabalho que ele fez, é trabalho que não existe — e listar isso
como conquista ensina errado sobre o que o produto pede.

## UI

**O gatilho** é um item fixo no rodapé do menu, acima do "Sair", nos dois
lugares em que o menu aparece (sidebar do desktop e drawer do mobile). Ele
**não é rota**: é `<button>` que abre um diálogo — mesma regra do item
bloqueado da F035, porque link que não navega confunde teclado e leitor de tela.

O aluno novo cai no Dashboard, não no menu; por isso a tela vazia do funil
(0 Leads) ganha o mesmo gatilho como ação secundária, ao lado de "Coletar
Leads". Um botão, dois lugares de onde chamar.

**O painel** é o diálogo modal da F035 (`Escape` fecha, clique fora fecha,
`role="dialog"` + `aria-modal`), com:

```
Primeiros passos                                  2 de 4     (conta no modo Orion)
Do zero ao primeiro cliente, na ordem.

 ✓  1. Busque estabelecimentos  47 Leads na sua base.
 ✓  2. Aprofunde os melhores    12 Leads com score confirmado.
 →  3. Aborde o primeiro da fila                    [ Ir para a Fila do dia ]
       O Orion escreve a Abordagem a partir da Dor do Lead. Marque como
       enviada depois de mandar — é isso que move o Lead pro funil.
    4. Registre o que aconteceu
       Respondeu? Virou proposta? Fechou? Arrastar o card no funil é o que
       fecha o ciclo — e o que faz o Dashboard dizer a verdade.
```

Em BYOK a mesma lista abre com **"Ligue as chaves"** na frente, e o contador é
de 5.

- **Um botão por passo**, e só no passo atual: dois botões primários lado a lado
  numa lista de cinco viram cinco decisões, que é o oposto do que o painel
  resolve. Os passos feitos mostram o número da base no lugar do botão; os
  futuros ficam só com o texto.
- O botão **navega e fecha** o diálogo.
- Com os cinco feitos, o cabeçalho diz que o ciclo está fechado e o painel segue
  servindo de consulta — não vira parabéns nem some do menu.

**O painel segue o tema do app, não o do canto de onde foi aberto.** Quem pinta
o tema claro é o shell, e só na coluna de conteúdo — a sidebar é escura de
propósito ([F032](F032-interface-do-orion.md)). Com um gatilho na sidebar e
outro no Dashboard, o mesmo diálogo saía escuro por um caminho e claro pelo
outro. Ele cobre a tela inteira, então lê o cookie do tema no cliente e aplica
a classe na própria raiz. (O modal do item bloqueado da F035 tem o mesmo
defeito, pelo mesmo motivo; corrigi-lo não é desta feature.)

**O estado é carregado ao abrir**, nunca no render das páginas. O medidor de uso
já ensinou essa conta ([F028](F028-desempenho.md)): consulta no shell é pedágio
em **toda** rota. O botão em si não consulta nada; o clique dispara uma Server
Action que devolve os passos com estado.

## Copy

Sem texto novo onde já existe texto bom. O passo 3 usa `APROFUNDAR_EXPLICACAO`
(`src/lib/leads/aprofundamento.ts`), que é a melhor explicação do conceito no
app e já cita o tamanho do lote e o custo em cota — se o lote mudar, o tutorial
muda junto, no mesmo arquivo.

Linguagem ubíqua sem exceção: Lead, Diagnóstico, Dor, Abordagem, score
(`/specs/01-domain-model.md`).

## Modelo de dados

**Nenhuma mudança.** Sem tabela, sem coluna, sem migração.

## Critérios de aceitação

- [ ] **AC1** — O item "Primeiros passos" aparece no rodapé do menu no desktop e
      no drawer do mobile, e abre um diálogo em vez de navegar.
- [ ] **AC2** — O diálogo lista os passos na ordem canônica, com o contador
      "N de M" — M é 5 em BYOK e 4 no modo Orion.
- [ ] **AC3** — Conta zerada (sem Lead, sem chave, modo BYOK) → cinco passos,
      nenhum feito, e o passo atual é "Ligue as chaves".
- [ ] **AC4** — Conta no modo Orion sem Lead → **quatro** passos (sem o das
      chaves), nenhum feito, e o passo atual é "Busque estabelecimentos".
- [ ] **AC5** — Abordagem **gerada e não enviada** não conclui "Aborde o
      primeiro da fila"; a linha do passo diz que falta marcar como enviada.
- [ ] **AC6** — Lead em `contatado` não conclui "Registre o que aconteceu";
      `respondeu` (ou qualquer estágio adiante, inclusive `perdido`) conclui.
- [ ] **AC7** — O passo atual é sempre o primeiro não feito, e é o único com
      botão de ação; clicar navega e fecha o diálogo.
- [ ] **AC8** — Nenhuma rota ganha consulta nova: o estado só é buscado quando o
      diálogo abre.
- [ ] **AC9** — Os dados são do tenant do aluno (F015): as contagens saem de
      `requireTenant`, e conta de outro aluno não influencia nenhum passo.
- [ ] **AC10** — Com todos os passos feitos, o painel continua abrindo e o
      cabeçalho reflete o ciclo fechado.
- [ ] **AC11** — Teclado: `Escape` fecha, o foco entra no diálogo ao abrir e o
      gatilho anuncia `aria-haspopup="dialog"`.

## Decisões de implementação

- `src/lib/tutorial/passos.ts` — catálogo dos passos (id, título, o que é,
  por que, rótulo e destino do botão) + `passosComEstado(fatos)`, **função
  pura**: recebe os números da base, tira o passo das chaves no modo Orion, e
  devolve os passos com `feito` e o índice
  do passo atual. Sem Next, sem Prisma — é o que os testes exercitam.
- `src/lib/tutorial/consultar.ts` — `fatosDoAluno(userId)`: as contagens
  (Leads, Leads com score confirmado, Abordagens geradas/enviadas, Leads além de
  `contatado`) + `chavesEssenciaisFaltando`. Todas escopadas por `user_id`.
- `src/actions/tutorial/primeirosPassos.ts` — Server Action fina: `requireTenant`
  → `fatosDoAluno` → `passosComEstado`.
- `src/components/primeiros-passos.tsx` — client: botão + diálogo, no padrão do
  `ModalBloqueado` da sidebar.
- `tests/unit/tutorial-passos.test.ts` — cobre AC3 a AC7 sobre a função pura.
- **Sem lib nova → sem ADR.**

## Fora do escopo (F039)

- ~~**Coach marks** (balões ancorados em elementos da tela, com overlay e
  "próximo"): exigiria lib nova — logo ADR — e quebra a cada mexida de layout,
  que na Fase 3 acontece toda semana.~~ **Revisto em 2026-08-16 pela
  [F040](F040-tour-do-menu.md)**, que responde aos dois motivos: o overlay é um
  `box-shadow` e não uma dependência, e passo cujo alvo sumiu do DOM é **pulado**
  em vez de quebrar. O escopo lá é o **menu**; coach mark dentro das telas
  continua fora, e pelo motivo original — o layout da Fase 3 ainda se mexe toda
  semana.
- Vídeo, GIF ou qualquer mídia hospedada.
- Checklist persistida, "dispensar passo", "não mostrar de novo".
- Abrir sozinho no primeiro login: o aluno aciona quando quer (decisão de
  2026-08-15). A descoberta é resolvida pelo gatilho na tela vazia do Dashboard.
- Prêmio ou pontuação por concluir — isso é a [F037](F037-ranking-de-builders.md).

## Custo estimado

**$0.** Nenhuma chamada de API externa, nenhum token de LLM, nenhuma infra nova.
Cinco `count` no Postgres por abertura do painel.
