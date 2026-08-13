# F035 — Planos e limites de uso

## Status
Implementada — 2026-08-11 · parte do [revamp do fluxo](../10-revamp-do-fluxo.md)
· custos e preços em [11](../11-custos-e-precificacao.md)

> **Falta um dado, não código:** os `product_id` dos planos na Hubla. Enquanto
> `HUBLA_PRODUCT_ID_PRO` / `HUBLA_PRODUCT_ID_AGENCIA` estiverem vazios, todo
> mundo é `free` — que é o comportamento **correto** (não existe plano pago
> configurado), não uma falha. Criar os produtos na Hubla e preencher as duas
> vars liga a feature sem tocar em código.
>
> Os **preços** continuam proposta: dependem da medição pendente em
> [11 §7](../11-custos-e-precificacao.md#7-o-que-precisa-ser-medido-antes-de-publicar-preço).

## Objetivo
Transformar o Orion de "tudo liberado pra todo aluno" em produto com **planos**.

> ## Revisão de 2026-08-13 — nada é bloqueado, tudo é limitado
>
> A v1 desta spec separava planos por **recurso**: o Free não tinha Central de
> Tarefas, kanban, CSV nem Agente. A partir de agora **o Free faz tudo** — o que
> muda entre planos é **quanto**.
>
> Por quê: recurso bloqueado ensina o aluno que o produto não serve pra ele.
> Recurso liberado com teto ensina que serve — e que o teto chegou. O gatilho de
> venda passa a ser "acabou minha cota", que só acontece com quem já usou.
>
> Três mudanças acompanham:
> - **BYOK encerrado para novos alunos** (ver "Fim do BYOK").
> - **Abordagem por e-mail sai do produto** ([F027](F027-abordagem-por-email.md)).
> - **O medidor mensal passa a contar Lead coletado**, não diagnosticado.

## Conceitos

### Plano
`free` | `pro` | `agencia`. Um por usuário, `free` por padrão.

Todos os limites são **mensais** (competência em `America/Sao_Paulo`). Números
derivados da análise de margem em [11 §4–5](../11-custos-e-precificacao.md).

| | Free | Pro | Agência |
|---|---|---|---|
| Preço cheio (BRL/mês) | R$0 | R$39 | R$97 |
| Preço aluno (−20%) | R$0 | R$31,20 | R$77,60 |
| **Leads novos / mês** | **60** | 300 | 800 |
| **Abordagem WhatsApp / mês** | **20** | 150 | 300 |
| **Proposta ([F012](F012-gerador-de-proposta.md)) / mês** | **3** | 30 | 60 |
| **Objeções ([F011](F011-assistente-de-objecoes.md)) / mês** | **5** | 50 | 80 |
| **Agente Orion ([F029](F029-agente-orion.md)) / mês** | **5** | 100 | 300 |
| **Simulador ([F013](F013-simulador-de-venda.md)) / mês** | **20 msg** | 300 | 1.000 |
| Aprofundamento por busca ([F025](F025-fila-do-dia.md)) | 10 | 20 | 20 |
| Central de Tarefas ([F031](F031-central-de-tarefas.md)) | ✅ | ✅ | ✅ |
| Funil kanban ([F034](F034-funil-kanban.md)) | ✅ | ✅ | ✅ |
| Exportar CSV | ✅ | ✅ | ✅ |

**Custo nosso no teto:** R$1,96 (Free) · R$15,09 (Pro) · R$32,67 (Agência).
Margem: 61%/66% no preço cheio, 52%/58% no preço de aluno.

### Por que 60 no Free, e não 50 nem 100
O free tier do Google são **1.000 requisições/mês na conta inteira**. A 3
requisições por aluno (60 leads = 3 páginas exatas), cabem ~333 alunos Free a
custo zero; a 100 leads (5 páginas) caem pra ~200. E 60 é a **opção do meio da
busca** ([F033](F033-busca-estruturada.md)): uma busca de 60 é exatamente um mês
de Free, o que é fácil de explicar e some com a colisão que 50 criava (nenhuma
das opções de busca cabia no teto).

### Por que Agência caiu de 1.500 para 800
A 1.500 leads o custo vai a R$58,55/mês: 39% de margem no preço cheio e **25%**
no preço de aluno. Ver [11 §5](../11-custos-e-precificacao.md) para a
alternativa (1.500 a R$197).

> **O Simulador entra na tabela de `/planos`.** Ele existe desde a F013 e nunca
> apareceu ali — aluno nenhum sabe que tem treino de venda incluído. Passa a ser
> linha da tabela comparativa, não só item de menu.
>
> **Nota de dimensionamento:** um roleplay inteiro consome ~20 mensagens, então
> 20/mês no Free é **uma conversa por mês**. Coerente com a régua de aperitivo
> do Agente, mas vale saber que é isso — não é "treinar quando quiser".

**Nenhuma linha é ❌.** Se um dia voltar a existir recurso fechado, ele volta
pela mesma máquina (`Recurso` + cadeado + modal), que continua no código.

Os números são **constantes em `src/lib/planos/catalogo.ts`**. Mudá-los é
mudança de produto → editar esta spec antes.

### Os 5 usos do Agente são aperitivo, não ferramenta
Cinco perguntas por **mês** não resolvem o trabalho de ninguém — é o suficiente
pra o aluno ver o Agente responder sobre a base dele e entender o que perdeu. É
o único limite da tabela desenhado pra ser insuficiente, e isso é deliberado.

### O medidor conta **Lead novo**, não Lead diagnosticado

> **Mudança de 2026-08-13.** O medidor contava Lead que recebeu o primeiro
> Diagnóstico. Passa a contar **Lead criado pela coleta**.

Duas consequências que a implementação tem que respeitar:

**1. Só conta Lead novo — duplicata não consome cota.** A coleta já separa
`criados` de `ignorados` (dedupe por `@@unique([user_id, place_id])`). Buscar
"dentista Curitiba" duas vezes no mesmo mês não pode cobrar duas vezes pelos
mesmos estabelecimentos: o aluno não ganhou nada na segunda.

**2. A busca para na cota, sem perder o que já trouxe.** As opções de quantidade
da [F033](F033-busca-estruturada.md) são **20 · 60 · 100**, e o teto do Free é
**50/mês** — as duas maiores não cabem inteiras num mês Free. Então:

- A busca coleta até onde a cota alcança e **grava o que coube**.
- O resultado diz o que aconteceu: *"38 Leads novos · 12 não couberam no limite
  do mês"*, com link pra `/planos`.
- **Nunca** rejeita a busca inteira por não caber: o aluno já pagou a chamada ao
  Places, jogar fora o resultado é queimar dinheiro nosso e tempo dele.

> Efeito colateral aceito: no Free, buscar 100 num mês zerado entrega 50 e avisa.
> A alternativa — esconder as opções que não cabem — foi descartada: o aluno
> precisa **ver** que existe mais, e é justamente aí que o limite vende.

### Confirmação antes de estourar (aviso *antes*, não depois)

Se a quantidade escolhida **não cabe** na cota restante, o clique em "Buscar"
abre um diálogo em vez de sair buscando:

```
┌──────────────────────────────────────────────┐
│  🔒  Sua cota do mês não cobre essa busca    │
│                                              │
│  Você pediu 100 Leads e ainda pode adicionar │
│  10 este mês (plano Free: 50/mês).           │
│                                              │
│  Se continuar, o Orion vai buscar os 100 no  │
│  Google, guardar os 10 primeiros e           │
│  DESCARTAR os outros 90 — eles não ficam     │
│  salvos e a busca não pode ser desfeita.     │
│                                              │
│  [ Buscar só 10 ]  [ Ver planos ]  [ Cancelar ]
└──────────────────────────────────────────────┘
```

Três coisas que o texto precisa deixar explícitas, porque as três custam algo:

1. **Quanto sobrou** — o número, não "você atingiu o limite".
2. **O que se perde** — os resultados acima da cota são descartados. O que
   **não** se perde é a lista que já existe: busca nova soma, nunca substitui.
3. **Que a chamada ao Google acontece do mesmo jeito** — é dinheiro gasto pra
   trazer 100 e guardar 10. É por isso que o aviso vem **antes**, e é por isso
   que a opção default do diálogo é reduzir a busca, não seguir com 100.

Com a cota **zerada**, o diálogo não oferece "buscar só 0": vira aviso de limite
atingido, com `/planos` como única ação. Buscar sem poder salvar nada seria
gastar Places por nada.

### O medidor: **Lead diagnosticado no mês**
Conta **1** quando um Lead recebe seu **primeiro Diagnóstico** dentro da
competência (mês corrente, fuso `America/Sao_Paulo`).

Três consequências deliberadas:
- **Re-diagnosticar não conta de novo.** O aluno pode reprocessar um Lead antigo
  à vontade — o valor já foi entregue.
- **Diagnóstico manual conta igual ao automático.** Se só o aprofundamento em
  lote contasse, bastaria clicar "Diagnosticar" 200 vezes pra furar o limite — e
  o custo de PageSpeed seria o mesmo. O nome do limite na UI é "Leads
  diagnosticados", não "leads do lote".
- **Coleta e Triagem ficam livres.** Buscar e ver o score estimado dos 83
  resultados não consome nada ([F025](F025-fila-do-dia.md): triagem é
  aritmética local). O aluno enxerga o que existe; o plano decide quantos ele
  **aprofunda**.

### Bônus BYOK
Aluno em `key_mode = byok` **num plano pago** tem o limite mensal **dobrado**.
No Free, não — senão o limite de 50 vira 100 só trocando de chave, e a decisão
(1) diz o contrário.

### Fonte do plano: Hubla
O plano vem dos **entitlements ativos** que a [F019](F019-webhook-hubla.md) já
grava (`HublaEntitlement`, por `email` + `product_id`): cada plano tem um
`product_id` na Hubla; sem entitlement de plano → `free`. Nenhuma infra de
cobrança nova — o webhook que já existe passa a mapear mais produtos.

Precedência quando há mais de um: `agencia` > `pro` > `free`.

## Fim do BYOK (2026-08-13)

O modo **BYOK** — aluno cola as próprias chaves de Google e de IA
([F016](F016-configuracao-de-chaves.md)/[F017](F017-multi-provider-llm.md)) —
**encerra para novos alunos**. Todo mundo passa a usar as chaves da Orion.

**Desligado por feature flag, não por remoção de código:**

```
BYOK_NOVOS_ALUNOS=0   # padrão a partir de agora
```

- Com a flag desligada, `/configuracao` **não oferece** o modo BYOK nem os
  campos de chave. Quem tem `key_mode = "orion"` (ou nenhum registro) só vê o
  card "Chaves incluídas".
- **Quem já configurou continua.** Aluno com `key_mode = "byok"` e chave salva
  segue funcionando e segue vendo os campos pra trocar ou remover a chave dele.
  Desligar por baixo quebraria quem depende disso hoje.
- Uma vez que um aluno grandfathered **sai** do BYOK, não consegue voltar
  enquanto a flag estiver desligada. O aviso disso aparece na tela antes de ele
  trocar o modo.
- Ligar a flag de novo (`=1`) reabre pra todo mundo, sem deploy de código.

### O que isso quebra, e a spec assume

O **bônus de +100% de limite por BYOK** morre com o modelo. Ele existia porque
BYOK zerava nosso custo variável; sem BYOK novo, não há o que compensar. A
coluna "Bônus BYOK" saiu da tabela de planos, e `limiteMensal()` deixa de somar
o bônus — **exceto** para os grandfathered, que mantêm o que já tinham.

E o custo variável **vira nosso**: a
[11 — Custos](../11-custos-e-precificacao.md) partia de "BYOK ≈ $0 pra nós" como
a alavanca #5 de barateamento. Com BYOK encerrado, o free tier do Google (1.000
requisições Enterprise/mês) passa a ser o teto real de quantos alunos Free cabem
sem custo — e o número de páginas por busca da F033 vira a variável mais cara do
produto. A spec 11 é atualizada junto.

## Saída da Abordagem por e-mail (2026-08-13)

A [F027](F027-abordagem-por-email.md) sai do produto. O canal de abordagem volta
a ser **só WhatsApp** (F005).

- Some da UI: seletor de canal no detalhe do Lead, botão "Gerar e-mail",
  `mailto:`, e o aviso de texto longo.
- **Sem migração destrutiva**: `Lead.email` e `Lead.email_origem` **ficam** no
  banco. Apagar coluna é irreversível, o dado já capturado não incomoda ninguém,
  e a feature pode voltar. O que para é a **escrita** e o **uso**.
- A leitura de e-mail no Diagnóstico
  ([ADR-016](../04-decisions/ADR-016-leitura-do-site-do-lead.md)) para de rodar:
  sem canal de e-mail, capturar endereço de contato vira coleta de dado pessoal
  sem finalidade — o oposto do que a LGPD pede. Isso **reduz** a superfície de
  dados do produto, então é melhoria, não perda.
- Termos e Política de Privacidade citam o canal de e-mail e precisam ser
  atualizados junto.

## Modelo de dados

> **Desvio na implementação:** o `enum Plano` **não** foi criado no banco.
> Nenhuma coluna o referencia (o plano é derivado dos entitlements), e um enum
> sem coluna é schema morto que ainda assim exige migração pra mudar. O tipo
> vive em `src/lib/planos/catalogo.ts`.

```prisma
model UsoMensal {
  id                    String   @id @default(cuid())
  user_id               String
  competencia           String   // "2026-08" (America/Sao_Paulo)
  // Contador da v1: Lead que recebeu o primeiro Diagnóstico. Mantido para não
  // reescrever histórico — o consumo de agosto/2026 foi medido com esta régua.
  leads_diagnosticados  Int      @default(0)
  // 2026-08-13 — a régua nova: Lead criado pela coleta.
  leads_novos           Int      @default(0)
  // 2026-08-13 — o que era cota diária (F018) e virou teto mensal de plano.
  agente_msg            Int      @default(0)
  simulador_msg         Int      @default(0)
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  user User @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([user_id, competencia])
  @@index([user_id])
  @@map("uso_mensal")
}
```

**Colunas novas, não substituição.** `leads_diagnosticados` fica: apagar a
coluna reescreveria o consumo já medido de agosto e o `default(0)` faria todo
aluno parecer zerado no mês corrente. As colunas novas nascem em 0 — a virada de
régua **perdoa** o que já foi consumido no mês da migração, o que é o lado certo
de errar.

**Por que mensal, e não mais uma cota diária da F018.** As duas convivem e têm
papéis diferentes:

| | [F018](F018-limites-diarios.md) — cota diária | F035 — teto mensal |
|---|---|---|
| Existe pra | conter abuso/loop num dia | definir o que o plano vende |
| Reseta | meia-noite | virada de competência |
| Some com plano pago? | não | sim, sobe |

Agente e Simulador passam a ter as duas: a diária continua barrando um loop
acidental, e a mensal é o que diferencia Free de Pro. Quem bate primeiro vence —
no Free, com 5 perguntas/mês, a mensal sempre chega antes.

`User` **não** ganha coluna de plano: o plano é **derivado** dos entitlements,
como já é feito com a compra verificada (F019.1). Uma coluna seria um segundo
lugar pra verdade morar.

## Fluxo

### Resolver o plano — `planoDoUsuario(userId)`
1. Lê os `HublaEntitlement` ativos do e-mail do usuário (query que a F019 já
   tem).
2. Mapeia `product_id → Plano` pelo catálogo; devolve o maior.
3. Sem match → `free`.
4. Resultado memoizado por request (React `cache()`) — é consultado pela
   sidebar, pelos gates e pelos banners.

### Consumir o medidor — dentro do Diagnóstico
Na transação que cria o `Diagnostico` ([F002](F002-diagnostico-de-presenca-digital.md)
/ [F025](F025-fila-do-dia.md)):
1. Se o Lead **já tem** Diagnóstico anterior → não conta, segue.
2. Senão, `upsert` em `UsoMensal` com `leads_diagnosticados + 1`.
3. O incremento é **na mesma transação** do `Diagnostico` — sem contador
   fantasma quando o diagnóstico falha.

### Barrar no limite — `verificarLimiteMensal(userId)`
Chamado **antes** de diagnosticar (individual e em lote):
- Dentro do limite → segue.
- No limite → lança `LimiteDoPlanoError` com o texto pronto pra UI:
  *"Você diagnosticou 50 Leads este mês — o limite do plano Free. Sua busca e
  sua fila continuam funcionando; para aprofundar mais Leads, veja os planos."*
- O lote da F025 **para no limite** e devolve `{ processados, restantes,
  limiteAtingido: true }` — sem perder o que já processou.

### Gate de feature — `exigirRecurso(userId, recurso)`
`recurso` ∈ `email` | `tarefas` | `kanban` | `agente` | `exportar_csv`.
- Server Actions e rotas verificam **no servidor** (esconder botão não é gate).
- Na UI, o recurso bloqueado aparece **visível e com cadeado** — não some. Ver
  é o que gera a vontade de assinar; sumir não vende nada.

## UI

### Medidor de uso (topbar global)

> **Mudança de 2026-08-13.** A barra vivia como bloco no corpo de `/leads` e de
> `/` (dois cards empilhados, com o uso diário da [F018](F018-limites-diarios.md)
> logo abaixo). Ocupava ~150px do topo das duas telas mais usadas pra mostrar
> `0/300` — informação **ambiente**, sem nada pra fazer com ela. Subiu pra uma
> **topbar global**, e o corpo da página voltou a começar no conteúdo.

**Fechado (estado normal, abaixo de 80%)** — no canto direito da topbar, em
todas as rotas autenticadas: barra fina + `12 / 300`, em fonte tabular. É um
`<button>` que abre o detalhe.

**Aberto (popover)** — o que os dois cards mostravam, junto:
`12 / 300 Leads diagnosticados este mês · Plano Pro` + barra · uso diário do
modo Orion por operação (F018) · "Os limites resetam à meia-noite (Brasília)" ·
link pra `/planos`.

**O medidor fechado não pode virar só um ícone.** O upsell da F035 nasce
**nele**, a partir de 80% — se o número só existir depois do clique, o gatilho
morre. Por isso o estado fechado carrega o número e muda de cor sozinho:
verde → **âmbar aos 80%** → **vermelho no limite**, quando ganha "Ver planos"
ao lado, ainda fechado.

Páginas com cota de **uma operação específica** (`/agente`, `/treino`) mantêm o
`UsoDiarioBanner` local: ali a cota é do trabalho em curso, não ambiente.

### Onde o upsell aparece (e onde não aparece)
- **Aparece**: na barra de uso a partir de 80%; no card de feature bloqueada
  (cadeado + "Disponível no Pro"); ao tentar usar a feature bloqueada.
- **Não aparece**: no meio da fila do dia, em modal automático, em banner
  recorrente. O gatilho é o aluno **esbarrar no limite**, não o Orion
  interromper o trabalho dele.

### `/planos`
Tabela comparativa (a de cima), plano atual destacado, botão de checkout Hubla
por plano. Quem já tem plano vê o que ganharia subindo.

## Critérios de aceitação
- [ ] **AC1** — Usuário sem entitlement de plano é `free` e vê limite de 50.
- [ ] **AC2** — Diagnosticar um Lead **sem** Diagnóstico anterior incrementa o
      medidor do mês; **re-diagnosticar o mesmo Lead não** incrementa.
- [ ] **AC3** — Diagnóstico manual e aprofundamento em lote contam **igual**.
- [ ] **AC4** — No limite: diagnosticar (individual ou lote) devolve erro
      específico com CTA, **sem** criar Diagnóstico e **sem** consumir chave de
      API.
- [ ] **AC5** — **BYOK não isenta**: aluno Free com `key_mode = byok` é barrado
      nos mesmos 50.
- [ ] **AC6** — Aluno **pago** em BYOK tem o limite dobrado (Pro: 600).
- [ ] **AC7** — Coleta e Triagem funcionam normalmente com o medidor estourado
      (o aluno continua vendo score estimado e a base cresce).
- [ ] **AC8** — Virada de mês zera o consumo (competência nova), sem job
      agendado — a competência é derivada da data, não persistida por cron.
- [ ] ~~**AC9**~~ — *Revogado em 2026-08-13.* Free passa a acessar `/tarefas`,
      `/funil`, `/agente` e exportar CSV. O que limita é cota, não recurso.
- [ ] ~~**AC10**~~ — *Revogado junto com o AC9.* A máquina de cadeado + modal
      continua no código pra quando voltar a existir recurso fechado, mas hoje
      **nenhum item do menu é bloqueado**.
- [ ] **AC15** — O medidor mensal conta **Lead criado pela coleta**. Buscar o
      mesmo nicho/cidade duas vezes no mês consome cota **só na primeira**: o
      que o dedupe ignora não incrementa.
- [ ] **AC16** — Busca maior que a cota restante **grava o que cabe** e informa
      quantos ficaram de fora; não rejeita a busca inteira nem grava além do
      limite.
- [ ] **AC17** — Buscar com a cota estourada não chama o Places: devolve o aviso
      de limite direto, sem gastar requisição.
- [ ] **AC18** — Agente Orion: **5 perguntas/mês** no Free, contadas por
      competência (não por dia). A 6ª devolve erro com CTA de plano.
- [ ] **AC19** — Com `BYOK_NOVOS_ALUNOS=0`, aluno em modo `orion` não vê a opção
      BYOK nem campos de chave; aluno com `key_mode = "byok"` **continua** vendo
      e gerenciando as chaves dele.
- [ ] **AC20** — Nenhum caminho da UI gera Abordagem de e-mail; a Server Action
      recusa `canal = "email"` mesmo se chamada direto.
- [ ] **AC21** — Simulador de venda: **20 mensagens/mês** no Free, contadas por
      competência. A 21ª devolve erro com CTA de plano.
- [ ] **AC22** — A tabela de `/planos` lista Simulador de venda e Agente Orion
      com os limites de cada plano — nenhum recurso do produto fica fora dela.
- [ ] **AC11** — Entitlement de `pro` chegando pelo webhook (F019) libera as
      features **sem** o aluno precisar deslogar.
- [ ] **AC12** — Contagem correta sob concorrência: dois lotes simultâneos não
      furam o limite (incremento atômico no `upsert`).
- [ ] **AC13** — Isolamento (F015): `UsoMensal` é escopado por `user_id`.
- [ ] **AC14** — O medidor fechado da topbar mostra `usado / limite` em toda
      rota autenticada, fica **âmbar a partir de 80%** e **vermelho no limite**
      — sem depender de abrir o popover. Nem `/leads` nem `/` repetem o medidor
      no corpo da página.

> **Nota do AC9 (exportar CSV):** o CSV era montado no navegador, a partir dos
> cards já entregues na página — ali "gate no servidor" seria mentira. A
> exportação virou a Server Action `exportarLeadsCsv`, que faz `exigirRecurso`
> e refaz a query com `whereUser`. O botão continua visível no Free, com
> cadeado, levando a `/planos`.

## Decisões de implementação
- `src/lib/planos/catalogo.ts` (limites e features por plano — dado puro),
  `competencia.ts` (mês em `America/Sao_Paulo`, puro), `resolver.ts`
  (entitlements → plano, memoizado por request), `medidor.ts` (consulta,
  verificação e incremento), `gate.ts` (`exigirRecurso`,
  `redirectSeRecursoBloqueado`), `erros.ts` (`LimiteDoPlanoError` e
  `RecursoDoPlanoError`, ambos tratados por `mensagemEscopo`).
- O incremento entrou na transação do Diagnóstico
  (`src/lib/diagnostico/persistir.ts`), que passou de transação de **array**
  para **interativa**: o medidor precisa saber, dentro dela, se este é o
  primeiro Diagnóstico do Lead.
- Os gates de página (`/tarefas`, `/funil`, `/agente`) rodam **antes** do JSX,
  fora do `<Suspense>` — dentro do boundary o `redirect` chegaria depois do
  shell e viraria 200 (mesma armadilha que a [F028](F028-desempenho.md)
  documenta para o `notFound()`).
- Competência via `America/Sao_Paulo` num helper puro e testável — nada de
  `new Date()` espalhado.
- O gate reusa o padrão de `redirectSeCompraPendente` (F019.1), que já existe.
- Sem lib nova → **sem ADR**. (Cobrança segue na Hubla, fora do app.)

## Fora do escopo (F035)
- **Cobrança dentro do Orion** (checkout, cartão, NF). Continua na Hubla.
- Trial automático, cupom, período de graça, downgrade proporcional.
- Limite por equipe / multi-assento.
- Compra de pacote avulso de Leads ("+100 por R$X").
- Analytics de conversão de plano (quantos batem no limite e assinam) — precisa
  de event log; ver [F028](F028-desempenho.md)/observabilidade.
- Preço definitivo: os valores desta spec são **proposta** e dependem da
  medição pendente listada em [11 §7](../11-custos-e-precificacao.md#7-o-que-precisa-ser-medido-antes-de-publicar-preço).

## Custo estimado
**$0** de infra nova (uma tabela). O efeito é o inverso: a F035 é o que **põe
teto** no custo variável por aluno — hoje ilimitado. Modelo completo em
[11 — Custos e Precificação](../11-custos-e-precificacao.md).
