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

> ## Pausa de 2026-08-17 — a UI de planos sai do ar
>
> **Todo mundo entra no Free.** Enquanto os `product_id` da Hubla não existirem
> (ver Status), não há plano pago pra vender — e uma tela que compara três
> planos, com preço e "Checkout em breve", oferece ao aluno uma escolha que ele
> não tem. Some da UI: `/planos` sai do ar e **nenhuma menção a plano aparece
> em tela**, nem em mensagem de erro, nem nas páginas públicas.
>
> É **pausa, não remoção.** O interruptor é a constante `PLANOS_NA_UI` em
> `src/lib/planos/exibicao.ts`. Nada foi apagado: cada ponto de exibição
> pergunta pela constante, então religar a tela é trocar `false` por `true` num
> lugar só — **mais** recriar o `loading.tsx` da rota, o único arquivo que a
> pausa apagou (ver abaixo; o `PlanosSkeleton` continua em `page-skeleton.tsx`,
> intacto):
>
> ```tsx
> // src/app/(orion)/planos/loading.tsx
> import { PlanosSkeleton } from "@/components/page-skeleton";
>
> export default function Loading() {
>   return <PlanosSkeleton />;
> }
> ```
>
> Ele **tem** que sair junto: `loading.tsx` embrulha a página num `<Suspense>`,
> o shell é enviado antes da página rodar, e aí o `notFound()` chega depois do
> status — a rota respondia **200** com cara de 404. É a mesma armadilha que a
> [F028](F028-desempenho.md) documenta, e a razão pela qual os gates de página
> desta spec rodam fora do boundary.
>
> O que a pausa **não** toca — e é o ponto: os limites continuam valendo e
> sendo cobrados (Free = 40 Leads/mês), o medidor continua na topbar mostrando
> `usado / limite`, e `planoDoUsuario` continua derivando o plano dos
> entitlements. Quem tiver entitlement ativo recebe o limite maior **sem ver a
> palavra "plano"**. O que sai é o vocabulário e o upsell, não a régua.
>
> Consequência aceita: sem `/planos`, o aluno que estoura o limite lê o que
> acabou e quando zera, mas não tem para onde ser mandado. É exatamente o que
> hoje já acontecia de fato — o botão da tela dizia "Checkout em breve".

> ## Período de teste do Pro (2026-08-18 → 2026-11-16)
>
> **Todos os alunos existentes ganham 90 dias de Pro.** Decidido em 2026-08-18
> (prazo inicial: 1 mês); **emenda de 2026-08-20** alonga o teste para **90 dias**
> (vence em **2026-11-16**), pra dar tempo de montar o produto pago na Hubla.
>
> ### O problema que isto resolve
>
> A pausa acima tira a `/planos` da UI mas **mantém a régua**: Free = 40 Leads
> novos/mês, cobrados em `coletar.ts`. Medido em produção em 2026-08-18, a base
> criou **1.385 Leads em 7 dias** com ~28 alunos ativos — da ordem de **200
> Leads/aluno/mês, 5× o teto**. Subir o revamp sem mais nada não seria "limitar":
> seria cortar o uso real da base em ~95%, e mandar quem estourasse para uma tela
> que responde 404.
>
> O teto de 40 não está errado — ele é a divisão do free tier do Google
> ([11 §4](../../11-custos-e-precificacao.md#o-free-tier-do-google-é-o-que-decide-o-limite-do-free)).
> O que está errado é aplicá-lo a uma base que **nunca teve teto mensal** e que
> não tem plano pago para assinar. O teste separa as duas coisas: o revamp entrega
> agora, a cobrança começa quando houver o que cobrar.
>
> ### Como funciona
>
> A frase da pausa ("quem tiver entitlement ativo recebe o limite maior") é o
> mecanismo da régua. Basta:
>
> 1. `HUBLA_PRODUCT_ID_PRO=trial-pro-2026-11` na Vercel (Production);
> 2. um `HublaEntitlement` `ativo` com esse `product_id` para o e-mail de cada
>    aluno — `scripts/conceder-trial-pro.mjs` faz o lote.
>
> `PLANOS_NA_UI` continua `false`: `/planos` segue em 404 e não há upsell nem
> checkout. O medidor lê `x/300` em vez de `x/40`.
>
> ### O que o aluno VÊ do teste (emenda 2026-08-20)
>
> A pausa original dizia "sem a palavra plano". No teste isso escondia demais:
> o aluno ganhava 300 Leads e não sabia por quê. Exceção **só** para estes dois
> sinais — não religa a loja:
>
> 1. **Flag PRO** no medidor da topbar (fechado e no popover), quando o plano
>    resolvido é `pro` ou `agencia`. Rótulo curto (`PRO` / `AGÊNCIA`), sem link
>    pra `/planos` e sem a palavra "plano".
> 2. **Aviso de free trial** (banner dismissível no shell autenticado) enquanto
>    `HUBLA_PRODUCT_ID_PRO` for o id do teste (`trial-pro-*`) **e** o aluno
>    estiver em `pro`: informa que tem **3 meses** de acesso Pro liberado, com
>    data de fim **2026-11-16**. Fechar grava no `localStorage` e não volta a
>    aparecer naquele browser.
>
> Fora esses dois pontos, a pausa segue: nada de "Ver planos", nada de menu
> Planos, nada de CTA de checkout.
>
> ### O interruptor de emergência
>
> **Apagar `HUBLA_PRODUCT_ID_PRO` da Vercel devolve todo mundo ao Free na hora,
> sem deploy** — `mapaProdutoPlano()` volta a ser vazio e `planoDoUsuario`
> curto-circuita em `free` (`resolver.ts:62`). É o mesmo motivo pelo qual a
> ausência da variável era o estado desejado antes: a variável **é** o
> interruptor. Encerrar pelo caminho normal é `--revogar` no script.
>
> ### Custo aceito
>
> Um Pro no teto custa **R$6,34/mês** ([11 §4](../../11-custos-e-precificacao.md#4-custo-por-alunomês)),
> e ~46% disso é Places. Com 56 alunos no Pro seriam 840 requisições/mês —
> **dentro das 1.000 grátis** que o Google dá na conta inteira. Então o custo
> mensal estimado fica em **R$100–130** (× ~3 meses do teste ≈ R$300–390 no
> período). É barato o bastante para não ser decisão difícil.
>
> ### O que isto NÃO resolve
>
> **O precipício é adiado, não removido.** Em **2026-11-16** todos voltam a 40
> com a `/planos` ainda em 404, a menos que os `product_id` reais existam na
> Hubla até lá. O teste compra **90 dias** para construir isso — e essa é a
> única razão de ele ter prazo em vez de ser permanente. Se a data chegar sem
> produto pago, a decisão volta à mesa: ou existe plano, ou o teto do Free sobe
> de vez (e aí é [11 §4](../../11-custos-e-precificacao.md) que precisa ser
> reescrito, não esta seção).

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
| **Leads novos / mês** | **40** | 300 | 800 |
| **Abordagem WhatsApp ([F005](F005-abordagem-whatsapp.md))** | **Ilimitada** | Ilimitada | Ilimitada |
| **Proposta ([F012](F012-gerador-de-proposta.md))** | **Ilimitada** | Ilimitada | Ilimitada |
| **Objeções ([F011](F011-assistente-de-objecoes.md)) / mês** | **5** | 50 | 80 |
| **Agente Orion ([F029](F029-agente-orion.md)) / mês** | **5** | 100 | 300 |
| **Simulador ([F013](F013-simulador-de-venda.md)) / mês** | **20 msg** | 300 | 1.000 |
| Aprofundamento por busca ([F025](F025-fila-do-dia.md)) | 10 | 20 | 20 |
| Central de Tarefas ([F031](F031-central-de-tarefas.md)) | ✅ | ✅ | ✅ |
| Funil kanban ([F034](F034-funil-kanban.md)) | ✅ | ✅ | ✅ |
| Exportar CSV | ✅ | ✅ | ✅ |

**Custo nosso no teto:** R$1,96 (Free) · R$15,09 (Pro) · R$32,67 (Agência).
Margem: 61%/66% no preço cheio, 52%/58% no preço de aluno.

### Por que a Abordagem não tem teto (2026-08-16)

Mesma decisão da Proposta, um degrau antes no funil: **ilimitada nos três
planos**, fora de `OPERACOES_MENSAIS`.

**O teto contradizia o teto de Leads.** O Pro comprava 300 Leads novos e podia
abordar 150 — metade da base entrava no funil sem poder ser contatada. Lead que
não pode virar conversa não é Lead, é linha em tabela; vender 300 e liberar 150
é vender duas coisas que não conversam.

**E a conta real era pior**, porque o follow-up consome a mesma cota. A
[F006](F006-follow-up-e-funil.md) diz que a maior parte das respostas vem do
2º–4º toque — então 150 Abordagens com um follow-up cada dão **75 Leads
trabalhados** dos 300 comprados. O plano financiava o dobro do que deixava
executar.

**O número 150 nunca foi decisão de produto.** Ele veio da linha de custo da
[11 §4](../11-custos-e-precificacao.md#4-custo-por-alunomês) (`150 · $1,200`),
quando cada Abordagem custava $0,008 de `gpt-4o`. Com a
[F005](F005-abordagem-whatsapp.md) montando o texto em código, o custo é **$0** e
o número perdeu a origem.

**E não era freio de spam.** Esse é o argumento que parece bom e não é: o Orion
**não envia**. A F005 registra que disparo automático é proibido pela visão — o
aluno copia o texto e manda pelo `wa.me`, à mão, um a um. O teto nunca limitou
quantas mensagens saem; limitava quantos rascunhos a ferramenta escreve. Quem
quisesse disparar em massa escreveria a mensagem por conta própria e o Orion não
saberia. O que contém abuso aqui continua sendo o teto de **Leads** e o envio
manual, não uma cota de geração de texto.

### Por que a Proposta não tem teto (2026-08-16)

A Proposta sai da tabela de limites: **ilimitada nos três planos**. Sai também de
`OPERACOES_MENSAIS` — operação sem teto não é operação limitada, e mantê-la ali
com um número simbólico seria escada de preço fingida.

**Custa R$0.** Desde que a [F012](F012-gerador-de-proposta.md) passou a montar o
texto em código, gerar uma Proposta é leitura no banco mais concatenação de
string. Não há chamada de API pra proteger.

**O teto do Free brigava com o manual do próprio produto.** A F012 recomenda,
com todas as letras: *"se ele quiser apresentar três opções, gera três
propostas"*. Com 3/mês, seguir essa recomendação consumia o mês inteiro **num
único cliente** — o aluno montava as três opções pro primeiro Lead que qualificou
e acabava agosto. Limite que impede o fluxo recomendado pela spec não é limite,
é bug de produto.

**E é a etapa errada pra limitar.** A Proposta é a última coisa antes do
`ganho`. Pôr teto ali é pôr teto na capacidade de **fechar**, que é exatamente o
que o aluno pagou pra fazer — cobra-se mais de quem está tendo sucesso. O lugar
natural do teto é a **entrada** (Leads novos), e ele continua lá.

Duas notas pra evitar mal-entendido:

- **"Ilimitada" é literal, não figura de linguagem.** A Proposta não é limitada
  pelo número de Leads: nada impede gerar várias pro mesmo Lead (a Action não
  persiste nada — F012 AC7), e a F012 recomenda fazer isso. Tirar o teto tira o
  teto mesmo.
- **O funil já limita na prática.** A aba de Proposta só abre em `qualificado`,
  `proposta` ou `ganho`. O aluno não gera Proposta pra Lead que não respondeu —
  o que segura o volume é quantos Leads chegam lá, e isso é consequência do teto
  de Leads, não de um teto próprio.

`/planos` continua listando a Proposta (AC22), agora como linha de **Ilimitada**
em vez de número. É argumento de venda melhor que "3/mês", e é verdade.

### A régua que sobrou: cobra-se o que custa

Depois de Abordagem e Proposta saírem, todo teto que resta corresponde a um custo
real nosso — e nenhum custo real ficou sem teto:

| Operação | Custo unitário | Tem teto |
|---|---|---|
| Leads novos | Places, $0,035/req | **sim** — é o teto do produto |
| Objeções (fora do catálogo) | `gpt-4o`, $0,008 | sim |
| Agente | `gpt-4o-mini` | sim |
| Simulador | `gpt-4o-mini` | sim |
| Abordagem | **$0** — código | **não** |
| Proposta | **$0** — código | **não** |
| Diagnóstico | **$0** — PageSpeed é free tier | **não** (já era assim) |

A regra fica explícita, e ela decide os próximos casos sem discussão nova:
**limite existe para conter custo, não para criar degrau de venda.** Onde o custo
é zero, o teto só serve pra fazer o produto brigar com o próprio manual — foi o
que aconteceu com a Proposta (3/mês contra a recomendação de gerar três opções) e
com a Abordagem (150 contra 300 Leads).

O que o plano vende passa a ser, com uma frase só: **quantos negócios você
descobre por mês.** O resto do funil é ilimitado, porque o resto do funil não nos
custa nada.

> **Consequência aceita:** a diferença entre Free e Pro fica concentrada em
> `lead_novo` (40 vs 300) e nas três operações de IA. É menos linha de tabela
> pra mostrar em `/planos`, e isso é bom — a comparação vira "quantos negócios
> você quer alcançar", em vez de seis números que o aluno não sabe pesar.

### Por que 40 no Free (revisto em 2026-08-16, era 60)

O free tier do Google são **1.000 requisições/mês na conta inteira**, e a busca
traz 20 Leads por página ([F033](F033-busca-estruturada.md)). O teto do Free é,
portanto, uma escolha de **quantos alunos cabem de graça**:

| Teto do Free | Páginas/aluno | Alunos Free a custo **zero** |
|---|---|---|
| 100 | 5 | ~200 |
| 60 *(anterior)* | 3 | ~333 |
| **40** *(atual)* | **2** | **~500** |

**40 é o teto que faz o Free escalar.** Meio milhar de alunos gratuitos sem pagar
um centavo de Places é a diferença entre o Free ser canal de aquisição e ser
conta a pagar — e o Places é a única linha de custo do produto que não zeramos.

**O que se perde:** com 60, a explicação era "uma busca de 60 é exatamente um mês
de Free", porque 60 é a opção do meio da F033. Com 40 essa frase morre — 40 não é
opção de busca. A substituta é igualmente simples: **duas buscas de 20 são um mês
de Free.** A opção de 20 é a menor da F033, então o aluno Free tem uma escolha
que cabe inteira, que é o que a revisão do 50 tinha ido buscar.

**O que não muda:** as opções de 60 e 100 continuam não cabendo num mês Free, e
continuam sendo oferecidas. O diálogo de confirmação abaixo já trata isso, e a
decisão de mostrar o que não cabe segue valendo — é aí que o limite vende.

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
**40/mês** — as duas maiores não cabem inteiras num mês Free. Então:

- A busca coleta até onde a cota alcança e **grava o que coube**.
- O resultado diz o que aconteceu: *"38 Leads novos · 12 não couberam no limite
  do mês"*, com link pra `/planos`.
- **Nunca** rejeita a busca inteira por não caber: o aluno já pagou a chamada ao
  Places, jogar fora o resultado é queimar dinheiro nosso e tempo dele.

> Efeito colateral aceito: no Free, buscar 100 num mês zerado entrega 40 e avisa.
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
│  10 este mês (plano Free: 40/mês).           │
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
No Free, não — senão o limite de 40 vira 80 só trocando de chave, e a decisão
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
  campos de chave. Quem tem `key_mode = "orion"` (ou nenhum registro) não vê
  nada sobre chaves — o subtítulo da página já diz que o modo é Orion e que há
  limites diários; um card explicando as chaves incluídas seria ruído sobre algo
  que o aluno não configura.
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

> **2026-08-16 — Proposta e Abordagem passam a ter só a mensal.** Ver a
> [F018](F018-limites-diarios.md#limites-modo-orion). Resumo: "quem bate primeiro
> vence" estava entregando a vitória pro lado errado. Com 5/dia contra 150
> Abordagens/mês, o Pro precisava de **30 dias** no talo pra receber o que esta
> tabela vende; a diária tinha virado o limite de produto, e o teto que a linha
> "Abordagem WhatsApp / mês" anuncia era inalcançável na prática.
>
> A regra que fica: **operação cujo teto mensal já limita o consumo de API não
> precisa de cota diária.** Vale pra Proposta e Abordagem (1 chamada de LLM cada,
> teto mensal por plano). Não vale pra Coleta nem Diagnóstico, onde o mensal conta
> **entrega** (Lead novo, primeiro Diagnóstico) e não **consumo**: duplicata e
> re-diagnóstico gastam API cobrando zero de cota, então ali a diária é a única
> trava real.

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
  *"Você adicionou 40 Leads este mês — o limite do plano Free. Sua busca e
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

> **Fora do ar desde 2026-08-17** — ver "Pausa" no topo da spec. A rota responde
> **404** (não redirect: a página não existe hoje, e mandar pra outro lugar
> esconderia isso de quem tem o link salvo). A página em si continua no
> repositório, íntegra, atrás de `PLANOS_NA_UI`.

## Critérios de aceitação
- [ ] **AC1** — Usuário sem entitlement de plano é `free` e vê limite de 40.
- [ ] **AC2** — Diagnosticar um Lead **sem** Diagnóstico anterior incrementa o
      medidor do mês; **re-diagnosticar o mesmo Lead não** incrementa.
- [ ] **AC3** — Diagnóstico manual e aprofundamento em lote contam **igual**.
- [ ] **AC4** — No limite: diagnosticar (individual ou lote) devolve erro
      específico com CTA, **sem** criar Diagnóstico e **sem** consumir chave de
      API.
- [ ] **AC5** — **BYOK não isenta**: aluno Free com `key_mode = byok` é barrado
      nos mesmos 40.
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
- [ ] **AC23** — Com `PLANOS_NA_UI = false`: `/planos` responde **404** para
      quem está logado — quem não está cai na regra de auth do grupo `(orion)`,
      que roda no layout, antes da página. O item "Planos" não existe no menu (e
      o tour não visita alvo fora do DOM), e **nenhum** link do app — tela
      autenticada, mensagem de erro de limite ou página pública — aponta pra
      `/planos`.
- [ ] **AC24** — Com `PLANOS_NA_UI = false`, nenhum texto de UI diz "plano"
      (exceto a flag `PRO`/`AGÊNCIA` e o aviso de trial da emenda de
      2026-08-20 — ver AC26/AC27): nem o formulário de coleta, nem as mensagens
      de limite, nem upsell. O que sobra é uso (`usado / limite`) + os dois
      sinais do teste quando cabem.
- [ ] **AC25** — A pausa é só de exibição: com `PLANOS_NA_UI = false` o Free
      continua barrado nos 40 Leads/mês e o medidor continua mostrando
      `usado / limite`. Trocar a constante por `true` devolve a tela e os links
      sem nenhuma outra edição.
- [ ] **AC26** — Aluno com plano `pro` (ou `agencia`) vê a flag correspondente
      no medidor da topbar, com `PLANOS_NA_UI = false` e sem link pra `/planos`.
- [ ] **AC27** — Com `HUBLA_PRODUCT_ID_PRO` no prefixo `trial-pro-` e aluno em
      `pro`, o shell autenticado mostra o aviso de 3 meses de acesso Pro
      (fim em 2026-11-16). Dismissível; após fechar, não reaparece no mesmo
      browser. Sem o prefixo de trial (ou no Free), o aviso não renderiza.

> **Nota do AC9 (exportar CSV):** o CSV era montado no navegador, a partir dos
> cards já entregues na página — ali "gate no servidor" seria mentira. A
> exportação virou a Server Action `exportarLeadsCsv`, que faz `exigirRecurso`
> e refaz a query com `whereUser`. O botão continua visível no Free, com
> cadeado, levando a `/planos`.

## Decisões de implementação
- `src/lib/planos/exibicao.ts` — a constante `PLANOS_NA_UI` da pausa, e **nada
  mais**: arquivo sem import pra poder ser lido por Client Component (o barrel
  `@/lib/planos` puxaria Prisma). Um único interruptor em vez de um `if` por
  arquivo é o que faz a volta ser uma linha.
- `src/lib/planos/trial.ts` — janela e copy do free trial Pro; `trialProAtivoNoAmbiente()`
  liga o banner só com `HUBLA_PRODUCT_ID_PRO` no prefixo `trial-pro-`.
- `src/components/aviso-trial-pro-server.tsx` + `aviso-trial-pro.tsx` — AC27.
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
