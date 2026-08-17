# F012 — Gerador de Proposta com Preço Sugerido

## Status
Proposta — 2026-07-11 · **emendada em 2026-08-13** (ver abaixo).

## Emenda 2026-08-13 — PDF pra entregar, e trava por estágio do funil

Duas mudanças na aba **Proposta** do detalhe do Lead.

### 1. PDF em papel timbrado, não texto no WhatsApp

O "virar PDF simples" do objetivo original nunca saiu do papel: a saída era um
bloco de texto pra colar no chat. Uma proposta colada no WhatsApp compete com
mensagem de família — e o dono do negócio não tem o que encaminhar pro sócio.

A aba passa a ter **Baixar PDF**, que abre a folha A4 no diálogo de impressão
do navegador ("Salvar como PDF").

**Decisão: impressão do navegador, não renderização no servidor.** Playwright já
está no projeto (`src/lib/diagnostico-ux/screenshot.ts`) e um `page.pdf()`
funcionaria na máquina do aluno — mas **quebra no deploy hospedado**, onde não
há Chromium instalado, exatamente como o screenshot já quebra hoje. Impressão do
navegador não tem esse problema: roda em qualquer lugar, inclusive no celular,
custa zero de servidor e não adiciona lib nenhuma (**sem ADR**). O layout é
CSS (`@media print` em `globals.css` + `.folha-proposta`), então a elegância
está sob nosso controle e é revisável em PR.

A folha traz: cabeçalho com a marca (`BRAND.empresa`) e o nome do Lead, data,
resumo, escopo item a item, entregáveis, prazo, o investimento em destaque e um
rodapé com a validade. Sem nada da interface do Orion na página impressa.

### 2. A aba só libera a partir de `qualificado`

Antes, bastava ter Diagnóstico. Na prática isso convidava o aluno a gastar
geração de IA e cota montando proposta pra quem **ainda não pediu proposta** —
o erro clássico de quem está começando: proposta é resposta a um pedido, não
isca. Mandar preço antes da hora mata a conversa e queima o Lead.

A aba passa a exigir `Lead.status` ∈ `qualificado`, `proposta`, `ganho` — os
estágios em que o Lead **já demonstrou fit e intenção**
([domain model](../01-domain-model.md)). Nos estágios anteriores a aba explica
o porquê, aponta o próximo passo real (Abordagem / Objeções) e traz um **ícone
de interrogação** com a regra escrita, no mesmo padrão do `AjudaScore` da F003.

A trava é de **UI**. A Server Action não ganhou verificação de status: ela
continua exigindo Diagnóstico e cota, e nada nela é destrutivo — travar no
servidor só criaria um caminho de erro a mais sem proteger nada.

### Critérios de aceitação da emenda
- [ ] **AC10** — Lead em `novo`/`priorizado`/`contatado`/`respondeu` → a aba
      Proposta **não** mostra o botão de gerar; mostra a explicação e o
      ícone de ajuda.
- [ ] **AC11** — Lead em `qualificado`, `proposta` ou `ganho` (e com
      Diagnóstico) → a aba mostra o gerador normalmente.
- [ ] **AC12** — Com a Proposta gerada, **Baixar PDF** abre o diálogo de
      impressão com a folha A4 — sem sidebar, sem abas, sem botão nenhum do
      Orion na página impressa.
- [ ] **AC13** — A folha traz `BRAND.empresa`, o nome do Lead, a data, escopo,
      entregáveis, prazo e o investimento. *(A "faixa" desta AC virou valor
      fechado na emenda de precificação — ver AC23.)*
- [ ] **AC14** — Sem lib nova; nenhum ADR necessário.
- [ ] **AC17** — A folha imprime **com as cores**: faixa navy no cabeçalho e
      painel do investimento. Sem `print-color-adjust: exact` o navegador
      descarta fundo colorido, e a folha sai igual à versão preto-e-branco.
- [ ] **AC18** — O documento não carrega a marca do **Orion**: a identidade
      visual é neutra, e o único nome que aparece é `BRAND.empresa`, que é a
      empresa do aluno.
- [ ] **AC19** — A fonte de display não custa nada em navegação normal: ela só
      é usada dentro de `@media print`, então o arquivo só é baixado quando o
      aluno abre a impressão.

## Emenda visual (2026-08-16)

A folha da emenda anterior era correta e sem graça: Georgia, preto no branco,
régua cinza. Ela cumpria a AC13 e não ajudava a fechar negócio — e o PDF é
literalmente o documento que decide o `proposta → ganho`.

**A identidade é neutra, não é a do Orion.** Quem assina a proposta é o aluno
(`BRAND.empresa`), então o verde da marca do Orion não entra: seria o
fornecedor da ferramenta se anunciando no documento comercial de outra pessoa.
A paleta saiu do design system de "Trust & Authority" — navy `#0F172A`, texto
`#1E293B`, acento `#0369A1`, painel `#F1F5F9`.

**O que muda:**

- **Faixa navy sangrando no topo**, com o título em display serif. É o que
  separa "documento gerado" de "documento desenhado" à primeira vista. Para a
  cor alcançar a borda, `@page` perde a margem lateral e o recuo passa pra
  dentro da folha; a faixa cancela esse recuo com margem negativa.
  `@page :first` zera só a margem de cima, pra sangrar na primeira página sem
  colar o conteúdo no topo das seguintes.
- **Duas fontes com papéis distintos:** Libre Bodoni no título, no parágrafo de
  abertura e no valor do investimento; Inter em todo o resto. Inter já é a
  fonte do app (`next/font`, self-hosted), então só uma família nova entra — e
  ela é usada **apenas** dentro de `@media print`, o que faz o navegador só
  baixar o arquivo na hora de imprimir.
- **O investimento vira painel**, com tinta de fundo e barra de acento à
  esquerda, em vez de uma caixa de borda fina. É o número que o cliente procura
  primeiro; ele precisa ser o segundo ponto de parada do olho, depois do
  título.
- **Marcadores desenhados** (`::before` redondo) no lugar do bullet do
  navegador, que muda de desenho por sistema.

**`print-color-adjust: exact` não é detalhe.** Sem ele o navegador descarta
todo fundo colorido na impressão — a folha sairia igual à de antes, e a emenda
inteira viraria código morto. Daí a AC17.

## Emenda de precificação (2026-08-16) — o aluno fecha o preço

### O que estava errado

Duas coisas, e a segunda é mais grave que a primeira.

**1. A folha mandava uma faixa pro cliente.** *"Investimento: R$ 2.100 –
R$ 4.200"* num documento comercial faz duas coisas ruins ao mesmo tempo:
ancora o cliente no **piso** (ninguém lê faixa e escolhe o topo) e anuncia que
o fornecedor **não decidiu**. Faixa é ferramenta de quem vende, não informação
de quem compra. O preço tem que estar **fechado antes** de o PDF existir.

**2. O catálogo do app não é o que se ensina.** A tabela de precificação do
Arsenal (Builders Club) trabalha com **Projetos** e **Recorrência**, em
linguagem de venda. O app trabalhava com quatro serviços técnicos e um preço
calculado — e o próprio `precos.ts` se declarava: *"são chutes iniciais, não
tabela de verdade"*.

| | Antes | Agora |
|---|---|---|
| Catálogo | 4 serviços técnicos | 5 projetos + 3 recorrências |
| Preço | base × tier do nicho × porte | faixa de referência da tabela, **escolhida** pelo aluno |
| Recorrência | não existia | primeira classe — "a venda única paga o mês, a recorrência paga o aluguel" |
| Quem decide | o algoritmo | o aluno |
| No PDF | uma faixa | **um valor fechado** |

### Catálogo (da tabela do Arsenal)

**Projetos** (valor fechado, uma vez): Landing page (R$ 300–800), Site
institucional (R$ 800–2.500), Site + painel administrativo (R$ 2.500–6.000),
Sistema / e-commerce (R$ 5.000+), Agente de WhatsApp (R$ 500–1.500 de setup).

**Recorrência** (por mês): Manutenção do site (R$ 50–200), Manutenção do bot
(R$ 100–400), Hospedagem gerenciada (R$ 30–100).

As faixas são **referência visível ao aluno**, nunca ao cliente. Elas moram no
catálogo com a fonte citada, porque mudá-las é mudar o que se ensina — não é
ajuste de código.

### Uma proposta, um valor (revisto no mesmo dia)

A primeira versão desta emenda saiu com **três pacotes** (essencial, completo,
premium), seguindo o "pulo do gato" do guia: *"a do meio vira a escolha óbvia e
sobe seu ticket."* A técnica é boa e continua valendo **na conversa** — mas no
produto ela dobrava a tela (matriz de 8 serviços × 3 colunas, 6 campos de
valor) e dobrava o PDF, para um ganho que ninguém tinha pedido.

Ficou **uma proposta só**: o aluno marca os serviços e fecha um valor. Se ele
quiser apresentar três opções, gera três propostas — o que também é mais
honesto com o cliente, que recebe um documento por opção em vez de uma tabela
de preços.

### O Diagnóstico pré-marca, o aluno decide

A Dor detectada sugere itens (sem site → Site institucional; site lento →
Manutenção). O aluno desmarca e marca o que quiser. É o app continuando **motor
com opinião** em vez de formulário em branco.

Com a ressalva registrada: **o Orion não sabe se aquele cliente compra landing
de R$ 500 ou sistema de R$ 5.000**. A pré-marcação é chute educado sobre uma
decisão de venda, e por isso ela nunca é final — nenhum valor sai sem o aluno
digitar ou aceitar.

### O preço nunca passa pela IA

Invariante da F012 que **permanece** (`prompt.ts`): a IA não escreve dinheiro.
Ela escreve o resumo personalizado pela Dor e uma linha de descrição por
serviço selecionado. O valor é digitado pelo aluno e montado à parte.

Uma armadilha que só a geração de verdade mostrou: enquanto existiam três
pacotes, o prompt mandava o resumo "convidar a escolher entre as opções" — e o
texto saía com *"Veja as opções abaixo"* mesmo depois de os pacotes sumirem.
Instrução de prompt é comportamento, e sobrevive à remoção do código que a
motivou se ninguém for lá apagar.

### O prazo também é do aluno, e o preço vai por último

Duas correções de 2026-08-16, depois de ver a primeira proposta gerada.

**O prazo saiu da IA.** Ele era o único número que a IA ainda inventava — e é
compromisso contratual, não prosa. Quem entrega sabe quanto tempo leva; um
modelo chutando "2 a 3 semanas" a partir do nome do negócio é palpite com cara
de promessa. Agora é campo, ao lado do valor, com sugestão vinda do catálogo
(cada projeto declara sua faixa de semanas) e editável como todo o resto.

A diferença para o preço vale registrar: prazo de execução **é** conhecimento
do catálogo (landing leva menos que sistema), enquanto preço depende de
mercado, região e momento do aluno. Por isso o prazo nasce sugerido com
confiança e o preço nasce como faixa de referência.

**O valor foi para o fim da folha.** A ordem era resumo → investimento →
escopo, e isso contraria o guia que o próprio Arsenal ensina: *"Apresente o
valor antes do preço. Liste o que ele leva, depois o número."* Preço no topo é
o cliente lendo o número antes de saber o que compra, que é a definição de
âncora ruim.

A folha passa a ser: resumo → **o que está incluído** → **você recebe** →
observações → **prazo e investimento** → validade. O número é a última coisa,
logo depois de tudo que o justifica.

### Critérios de aceitação da emenda de precificação

- [ ] **AC20** — Antes de gerar, o aluno vê os 8 itens do catálogo com a faixa
      de referência de cada um, e marca quais entram em cada pacote.
- [ ] **AC21** — Cada pacote tem **um valor fechado** (à vista) e, quando há
      item recorrente, **um valor mensal**. Ambos digitados pelo aluno.
- [ ] **AC22** — O valor sugerido é o meio da faixa dos itens marcados, apenas
      como valor inicial do campo — sempre editável, nunca imposto.
- [ ] **AC23** — Nenhuma faixa aparece no PDF. O documento do cliente só mostra
      números fechados.
- [ ] **AC24** — O PDF mostra **um** valor: à vista, mensal, ou "à vista +
      mensal" quando há recorrência. Nunca três colunas, nunca faixa.
- [ ] **AC28** — O prazo é digitado pelo aluno antes de gerar, com sugestão
      vinda do catálogo. A IA **não** produz prazo.
- [ ] **AC29** — Na folha, o bloco de prazo e investimento é o **último** antes
      do rodapé: o cliente lê o que recebe antes de ler o número.
- [ ] **AC25** — Sem nenhum serviço marcado não há proposta: o botão de gerar
      fica desabilitado e a tela diz o que falta.
- [ ] **AC26** — A IA continua sem escrever dinheiro: nenhum "R$" no texto
      gerado, e o teste do `prompt.ts` continua valendo.
- [ ] **AC27** — `precificar()` (base × tier × porte) é **removido**, junto dos
      testes que o exercitavam. Preço calculado e preço escolhido não convivem:
      dois números de origem diferente na mesma tela é o começo de "qual dos
      dois vale?".

## Emenda 2026-08-16 (fim do dia) — a Proposta sai da IA

A geração do texto deixa de chamar LLM. `PropostaTexto` passa a ser **montado em
código**, a partir do catálogo e das Dores.

### O que a IA ainda estava fazendo

Depois da emenda de precificação, praticamente nada — e essa é a razão da
mudança. O inventário do que compõe uma Proposta hoje:

| Parte | Quem produz |
|---|---|
| Quais serviços entram | o aluno marca (`sugerirSelecao` pré-marca) |
| Valor à vista e mensal | o aluno digita |
| Prazo | o aluno digita (AC28) |
| Título de cada serviço | `catalogo.ts`, texto fixo |
| "O que inclui" de cada serviço | `catalogo.ts`, texto fixo |
| Montagem do documento | `formatarPropostaTexto`, código |
| **`resumo`, `escopo[].descricao`, `entregaveis`, `observacoes`** | **era a IA** |

Ou seja: a IA reescrevia **8 descrições fixas** do catálogo e escrevia ~5 frases
ligando-as a no máximo **6 Dores** conhecidas (`TipoDor`). Uma matriz 8×6 finita,
com as duas pontas já escritas à mão — o catálogo de um lado, `detalhes` da Dor
do outro. Isso é tabela, não geração.

### Por que agora, e por que a Proposta antes da Abordagem

Uma Proposta vai para **um** cliente, depois de uma conversa, uma vez. O
argumento que sustenta IA em texto frio — "não pode parecer template, porque o
destinatário recebe muitos" — não se aplica: o destinatário recebe **um**
documento, do fornecedor com quem ele já falou. Variação aqui não compra nada.

O que se ganha: a Proposta passa a ser **instantânea** (sem round-trip de LLM),
**determinística** (o mesmo Lead com a mesma seleção gera o mesmo documento — o
aluno pode reabrir sem medo de sair diferente), **offline-safe** (não quebra
quando a API do provedor cai) e **de custo zero**.

### O que o texto perde, e por que é aceitável

Perde a variação de frase entre uma Proposta e outra. Dois clientes do mesmo
nicho com a mesma Dor e os mesmos serviços recebem o mesmo escopo, palavra por
palavra. Aceito: eles não se conhecem, e o documento é assinado por pessoas
diferentes com valores diferentes. A personalização que importa — **qual Dor
abre o resumo** e **quais serviços entram** — continua vindo do Diagnóstico
daquele negócio.

### Invariantes que sobrevivem

- **O preço continua fora do texto** e continua sendo do aluno. O que era regra
  de prompt ("NUNCA cite preço") vira propriedade estrutural: o montador não tem
  acesso a `valor`/`mensal`, então não há como um número vazar pro escopo. A
  AC26 fica **mais forte**, não mais fraca.
- **`formatarPropostaTexto` e a folha A4 não mudam.** O contrato `PropostaTexto`
  (`resumo`, `escopo[]`, `entregaveis[]`, `observacoes`) é o mesmo — a UI, o PDF
  e o botão Copiar não sabem quem escreveu.

### Critérios de aceitação da emenda

- [ ] **AC30** — Gerar Proposta **não** faz chamada de LLM: nenhuma chave de
      provedor é lida e a Action funciona com a API do provedor fora do ar.
- [ ] **AC31** — Determinismo: a mesma seleção no mesmo Lead gera `PropostaTexto`
      idêntico em duas execuções.
- [ ] **AC32** — O escopo traz **um item por serviço marcado, na ordem do
      catálogo**, com o título exatamente igual ao de `catalogo.ts`.
- [ ] **AC33** — O `resumo` cita a Dor de maior severidade do Lead
      (`dorPrincipal`); sem Dor detectada, usa a abertura neutra e **não inventa
      problema**.
- [ ] **AC34** — Nenhum "R$", número de dinheiro ou prazo aparece em `resumo`,
      `escopo[].descricao`, `entregaveis[]` ou `observacoes` — garantido por
      construção, não por instrução.
- [ ] **AC35** — Cada item do catálogo tem entregáveis próprios; marcar dois
      serviços não repete entregável (a lista é a união, sem duplicata).
- [ ] **AC36** — A Proposta **não tem teto de plano**: gerar não chama
      `verificarLimiteMensal` nem `consumirMensal`, e o aluno Free gera quantas
      precisar. Ver [F035](F035-planos-e-limites.md#por-que-a-proposta-não-tem-teto-2026-08-16).
      É o que destrava a recomendação das três opções desta mesma spec — com
      3/mês, apresentar três opções gastava o mês num cliente só.

## Objetivo
Gerar, para um Lead, uma **Proposta comercial** estruturada — escopo,
entregáveis, prazo e uma **faixa de preço sugerida** — a partir da Dor concreta
do Diagnóstico ([F002](F002-diagnostico-de-presenca-digital.md)) e do Tier de
nicho/porte ([F003](F003-score-e-priorizacao.md)). Editável e copiável pra
enviar no WhatsApp ou virar PDF simples.

Ataca a etapa **`qualificado → proposta → ganho`** — o passo literalmente antes
do `ganho` e hoje sem nenhuma ferramenta. O aluno dev **congela na hora de
precificar** e some por dias montando orçamento; o Lead esfria. Uma proposta em
1 clique, ancorada no diagnóstico que ele mesmo fez, mantém o timing e
transforma o "diagnóstico gratuito" ([F008](F008-diagnostico-ux-ia.md)) em
contrato.

> **Princípio de confiança do preço:** o preço é **calculado de forma
> determinística** (`src/lib/proposta/precos.ts`), **nunca gerado pela Claude**.
> A IA escreve só a **prosa** (escopo, entregáveis, justificativa) e é proibida
> de citar números — a faixa vem do cálculo. Isso evita preço alucinado e segue
> o padrão de funções puras da F003.

## Linguagem
- **Proposta** — o artefato comercial gerado (escopo + entregáveis + prazo +
  faixa de preço). O status `proposta` do funil já existe no
  [domain model](../01-domain-model.md). **Não persiste como entidade na v1**
  (só a transição de status é gravada — ver Fora do escopo).
- **Serviço** — item de escopo derivado de uma Dor (ex.: Dor `SEM_SITE` →
  Serviço `CRIACAO_SITE`). Catálogo em `src/lib/proposta/servicos.ts`.
- **Faixa de preço** — intervalo `min–max` em BRL, soma dos Serviços aplicados,
  ajustada por Tier de nicho e porte.

## Dor → Serviço (catálogo)
Derivado das **Dores persistidas** ([F004](F004-deteccao-de-dor.md)); o
Diagnóstico alimenta a detecção. Mapeado por `src/lib/proposta/servicos.ts`
(e equivalente por `TipoDor` quando aplicável):

| Situação do Diagnóstico | Serviço sugerido |
|-------------------------|------------------|
| `tem_site = false` | `CRIACAO_SITE` — site institucional do zero |
| `site_e_agregador = true` (só link-in-bio/perfil — [F009](F009-sinal-site-agregador.md)) | `CRIACAO_SITE` — site próprio substituindo o agregador |
| `performance_mobile < 50` | `OTIMIZACAO_PERFORMANCE` — deixar rápido no celular |
| `tem_https = false` | `SSL_SEGURANCA` — cadeado/HTTPS |
| site no ar sem Dor técnica clara (perf ≥ 50, HTTPS ok) | `PRESENCA_BASE` — melhorias de captação/conversão |

`CRIACAO_SITE` não empilha com os demais (o serviço já é o site inteiro).

## Preço (determinístico, calibrável)
`src/lib/proposta/precos.ts` — constantes que são **botões de calibragem** (como
os pesos da F003): mudá-las é mudança de estratégia → **editar esta spec/constante
antes do código**.

**Preço-base por Serviço (BRL, faixa min–max)** — *defaults de partida; o
operador DEVE ajustar ao seu mercado. São chutes iniciais, não tabela de verdade:*

| Serviço | base_min | base_max |
|---------|----------|----------|
| `CRIACAO_SITE` | 1.500 | 3.000 |
| `OTIMIZACAO_PERFORMANCE` | 600 | 1.200 |
| `SSL_SEGURANCA` | 200 | 500 |
| `PRESENCA_BASE` | 800 | 1.500 |

**Multiplicador por Tier de nicho** (via `tierDoNicho` da F003):
`ALTO ×1.4 · MÉDIO ×1.0 · BAIXO ×0.7`.

**Multiplicador por porte** (`num_avaliacoes`, proxy de verba —
[playbook](../05-playbook/nichos-alto-valor.md)):
`null/0–20 ×0.9 · 21–80 ×1.0 · 81–300 ×1.15 · 300+ ×1.3`.

`faixa_min = round(Σ base_min × mult_tier × mult_porte)` e idem para `faixa_max`.
Arredondar pra múltiplos de R$50. O cálculo é **puro e testável isolado**.

## Input (UI)
Botão **Gerar Proposta** na área de ações de cada linha em `/leads`, visível
para Leads `respondeu`/`qualificado`/`proposta` (pós-resposta) e que tenham ao
menos um Diagnóstico.

| Campo     | Tipo   | Validação                |
|-----------|--------|--------------------------|
| `lead_id` | string | obrigatório, cuid válido |

## Saída (UI)
Painel com:
- **Resumo** (2–3 frases) ancorado na Dor.
- **Escopo** (itens com descrição) e **Entregáveis** (lista).
- **Prazo estimado**.
- **Faixa de preço** (bloco próprio, renderizado do cálculo determinístico —
  ex.: *"Investimento sugerido: R$ 2.100 – R$ 4.200"*).
- Botão **Copiar** → texto plano = prosa da Claude + a linha de preço do cálculo
  (a IA não escreve o número; a linha é anexada pela action).
- A promoção do funil a `proposta` **reusa o botão "Proposta" já existente**
  (`registrarDesfecho`, [F006](F006-follow-up-e-funil.md)/[F010](F010-dashboard-funil.md)) —
  a F012 **não** adiciona action de transição (evita duplicar a lógica
  never-regress de `src/lib/funil.ts`).

## Fluxo
### Gerar — `gerarProposta({ lead_id })`
1. Valida com Zod. Lead inexistente → `{ erro: "Lead não encontrado" }`.
2. `ANTHROPIC_API_KEY` ausente → `{ erro: "ANTHROPIC_API_KEY não configurada" }`
   antes de qualquer chamada.
3. Carrega o Lead + último Diagnóstico (`take: 1`, `executado_em desc`).
   Sem Diagnóstico → `{ erro: "Diagnostique o Lead antes de gerar a Proposta" }`.
4. Deriva **dores** (`src/lib/dores/derivarDoDiagnostico`) e mapeia →
   **serviços** (`src/lib/proposta/servicos`).
5. Calcula a **precificação** (`src/lib/proposta/precos`): `{ servicos,
   faixa_min, faixa_max, moeda: "BRL" }`. Determinístico, sem IA.
6. Chama `src/lib/proposta/gerarProposta({ nome, categoria, dores, servicos,
   oferta })` → `{ resumo, escopo[], entregaveis[], prazo_estimado, observacoes }`
   (Claude API, structured output; **proibido citar preço** — ver contrato).
7. Monta `texto_copiavel` = prosa + linha de preço do passo 5. Retorna
   `{ proposta, precificacao, texto_copiavel }`. **Não muda status, não persiste
   conteúdo.**

### Transição `→ proposta` (reuso, não é nova action)
A promoção do Lead a `proposta` acontece pelo **botão "Proposta" já existente**
(`registrarDesfecho`, F006/F010), que já trata `qualificado`/`proposta` e nunca
regride o funil (`podeRegistrarDesfecho` em `src/lib/funil.ts`). A F012 **não
duplica** essa lógica.

## Critérios de aceitação
- [ ] **AC1** — Lead Tier ALTO (`dentist`), `num_avaliacoes = 150`, Diagnóstico
      `tem_site = false` → Serviço `CRIACAO_SITE`; `mult_tier = 1.4`,
      `mult_porte = 1.15`; `faixa_min = round(1500×1.4×1.15)=2415 → 2400`,
      `faixa_max = round(3000×1.4×1.15)=4830 → 4850`. (Faixa determinística,
      testável isolada.)
- [ ] **AC2** — A prosa gerada pela Claude **não contém valores em R$**; o preço
      aparece só no bloco/linha vindos do cálculo. (Validação manual.)
- [ ] **AC3** — Lead com `performance_mobile = 40` e `tem_https = false` → dois
      Serviços (`OTIMIZACAO_PERFORMANCE` + `SSL_SEGURANCA`), faixa = soma dos dois
      com os multiplicadores.
- [ ] **AC4** — Lead sem nenhum Diagnóstico → `{ erro }` específico, sem chamar a
      Claude API.
- [ ] **AC5** — `ANTHROPIC_API_KEY` ausente → `{ erro }` descritivo, sem chamada.
- [ ] **AC6** — Gerar Proposta **não** altera `Lead.status`; a promoção a
      `proposta` é feita pelo botão "Proposta" existente (`registrarDesfecho`),
      que já garante never-regress (F006/F010). A F012 não adiciona action de
      transição.
- [ ] **AC7** — Gerar não cria registro algum (não persiste conteúdo da Proposta).
- [ ] **AC8** — Funções de `src/lib/proposta/` (servicos, precos) são **puras**
      (sem dep de Next/Prisma) e testáveis com os exemplos das AC1/AC3.
- [ ] **AC9** — Falha da Claude API (refusal/`parsed_output` nulo) → `{ erro }`
      na UI, sem quebrar a app.
- [ ] **AC10** — `lead_id` inválido (Zod) ou inexistente → `{ erro }`, sem efeitos.

## Decisões de implementação
- `src/lib/proposta/servicos.ts` — puro: `Diagnostico → Serviço[]`.
- `src/lib/proposta/precos.ts` — puro: catálogo base + multiplicadores (Tier via
  `tierDoNicho` da F003, porte via faixa de `num_avaliacoes`) → `{ faixa_min,
  faixa_max }`. Constantes = botões de calibragem.
- `src/lib/proposta/prompt.ts` — `SYSTEM_PROMPT_PROPOSTA` (consultor montando
  proposta pra dono de negócio local; linguagem simples; **proibido citar
  preço**; honesto, sem prometer resultado) + builder de contexto. Lê a oferta de
  `src/lib/brand.ts` (`propostaDeValor`, `descricaoEmpresa`).
- `src/lib/proposta/gerarProposta.ts` — cliente Claude via SDK, structured
  output; lança `PropostaError`. Modelo **`claude-opus-4-8`**. Sem dep de Next.
- `src/lib/proposta/formatar.ts` — puro: `faixaBRL` + `formatarPropostaTexto`
  (prosa + linha de preço) pro botão Copiar e pra exibição da faixa.
- `src/actions/leads/gerarProposta.ts` — fina (só geração; **sem** action de
  transição — a promoção a `proposta` reusa `registrarDesfecho`).
- `src/app/leads/gerar-proposta-button.tsx` — painel, padrão dos existentes.
- `src/lib/dores/` — detecção/persistência na [F004](F004-deteccao-de-dor.md);
  textos via `textosDasDores`. Reusa também `src/lib/score/tierDoNicho` (F003).
- Lib nova? Não — reusa `@anthropic-ai/sdk` ([ADR-005](../04-decisions/ADR-005-anthropic-sdk-abordagem.md)). **Sem ADR.**

## Fora do escopo (F012)
- **Persistência da Proposta** como entidade (`Proposta`, Lead 1—N) — exigiria
  migração e delta no [domain model](../01-domain-model.md); especar como
  **F012.1** quando o fluxo provar valor (aí guarda faixa enviada, versão, e
  fecha o loop de "qual preço converte"). Na v1, o operador copia e envia.
- **Export em PDF** — v1 entrega texto plano copiável; PDF é F012.1.
- Uso do resultado da **F008 (Diagnóstico UX)** como insumo — hoje a F008 não
  persiste; quando persistir (F008.1), a proposta pode citar os achados de UX.
- Cálculo de desconto/parcelamento, múltiplos pacotes (bronze/prata/ouro).

## Custo estimado

**$0** — a Proposta é montada em código desde a emenda de 2026-08-16 (fim do
dia). Não há chamada de LLM.

> O número que ficou aqui por um mês — "~R$0,15–0,25 por Proposta" — era
> anterior à análise de token da [11 §3](../11-custos-e-precificacao.md#3-custo-por-operação),
> que mediu **R$0,07**, 3× menos. Ele havia vazado como fonte pra outras contas
> (a tabela de custo da [F018](F018-limites-diarios.md) usava esse valor). Fica
> registrado porque estimativa velha que ninguém apaga vira número oficial por
> inércia — que foi exatamente o que aconteceu.
