# Relatório de custos — 2026-08-16

Recálculo do custo variável por aluno depois da saída da IA da **Abordagem**
([F005](../specs/02-features/F005-abordagem-whatsapp.md)) e da **Proposta**
([F012](../specs/02-features/F012-gerador-de-proposta.md)), e análise de onde
ainda haveria o que cortar.

Números-fonte: [spec 11 §3](../specs/11-custos-e-precificacao.md#3-custo-por-operação).
Câmbio assumido **$1 = R$5,50**. Perfil = **aluno no teto do plano** (pior caso,
não caso típico).

---

## 1. O resultado

| | Free | Pro | Agência |
|---|---|---|---|
| Antes | R$1,96 | R$15,09 | R$32,67 |
| **Agora** | **R$0,68** | **R$6,34** | **R$15,18** |
| Redução | **−65%** | −58% | −54% |

O Free caiu mais que os pagos porque levou duas mudanças: a saída da IA **e** o
teto de Leads de 60 → 40, que tira uma página inteira de Places do custo.

**Margem do Pro** — a que mais importa, porque o preço de aluno era o piso do
produto:

| | Preço cheio (R$39) | Preço aluno (R$31,20) |
|---|---|---|
| Antes | 61% | **52%** |
| Agora | 84% | **80%** |

O piso de margem do produto sobe de 52% para 80%. Nenhum plano fica abaixo.

---

## 2. Free, linha a linha

Teto de Leads revisto para **40/mês** em 2026-08-16 (era 60) — ver
[F035](../specs/02-features/F035-planos-e-limites.md#por-que-40-no-free-revisto-em-2026-08-16-era-60).

| Operação | Volume/mês | Unitário | Custo |
|---|---|---|---|
| Places (coleta) | **2 req** | $0,035 | $0,070 · R$0,39 |
| Diagnóstico | 40 | $0 | **$0** |
| Abordagem | **ilimitada** | **código** | **$0** |
| Proposta | **ilimitada** | **código** | **$0** |
| Objeções (fora do catálogo) | 5 | $0,008 | $0,040 · R$0,22 |
| Agente (mini) | 5 | $0,0012 | $0,006 · R$0,03 |
| Simulador (mini) | 20 | $0,00035 | $0,007 · R$0,04 |
| **Total** | | | **$0,123 · R$0,68** |

**Na prática o Free custa R$0,29, não R$0,68.** O free tier do Google são 1.000
requisições/mês na conta inteira; a **2 req/aluno**, os primeiros **500 alunos
Free não geram custo de Places nenhum**. Para eles sobra só a IA: R$0,29/mês.

Isso reposiciona o Free duas vezes. A
[11 §5](../specs/11-custos-e-precificacao.md) tratava o aluno Free como "custo
puro, R$1,96/mês por pessoa" — hoje são R$0,68, e **R$0,29 dentro do free tier**.
E a capacidade gratuita subiu junto: cabem **500 alunos** onde cabiam 333.

| | Antes | Agora |
|---|---|---|
| Alunos Free a custo zero de Places | ~333 | **~500** |
| Custo de 1.000 inscritos gratuitos | R$1.960/mês | **R$680/mês** |

---

## 3. Pro, linha a linha

| Operação | Volume/mês | Unitário | Custo | % do total |
|---|---|---|---|---|
| **Places (coleta)** | 15 req | $0,035 | $0,525 · **R$2,89** | **46%** |
| **Objeções** (fora do catálogo) | 50 | $0,008 | $0,400 · **R$2,20** | **35%** |
| Agente (mini) | 100 | $0,0012 | $0,120 · R$0,66 | 10% |
| Simulador (mini) | 300 | $0,00036 | $0,108 · R$0,59 | 9% |
| Diagnóstico | 300 | $0 | $0 | — |
| Abordagem | **ilimitada** | **código** | **$0** | — |
| Proposta | **ilimitada** | **código** | **$0** | — |

| **Total** | | | **$1,153 · R$6,34** | |

> **Abordagem e Proposta perderam o teto de plano em 2026-08-16** (F035). Custo
> zero permite, e os dois tetos tinham virado contradição: 3 Propostas/mês contra
> a recomendação da própria F012 de gerar três para apresentar três opções, e 150
> Abordagens contra os 300 Leads que o Pro compra — com o follow-up consumindo a
> mesma cota, davam 75 Leads trabalhados de 300.
>
> **Não muda nenhum número deste relatório:** $0 × ∞ continua $0. A régua que
> ficou é que só tem teto o que custa — e as quatro linhas com teto acima são
> exatamente as quatro que aparecem nesta tabela com custo.

---

## 4. Onde ainda dá pra cortar

Ordenado por quanto rende, não por quanto é fácil.

### 4.1 Places / Coleta — R$2,89, e o pior caso é 10× isso

É a maior linha, e a **única sem teto de plano**. O motivo é o desenho do medidor
mensal: ele conta **Lead novo**, e busca duplicada não consome cota nenhuma
([F035](../specs/02-features/F035-planos-e-limites.md) AC15). Quem rebusca
"dentista Curitiba" toda semana gasta Places toda semana e não encosta em limite.

O teto real não é $0,525 — é a **cota diária**: 5 buscas/dia × 30 = 150
requisições = **$5,25 · R$28,88**. Dez vezes o orçado, e é o pior caso que a
[F018](../specs/02-features/F018-limites-diarios.md) permite hoje.

Dois caminhos, nesta ordem:

1. **Cache de busca por `(nicho, cidade, página)`.** Repetir a mesma busca dentro
   de N dias devolve o resultado guardado, sem tocar no Places. É o corte com
   melhor relação valor/risco do documento: não tira nada do aluno — ele já ia
   receber os mesmos resultados, porque o dedupe já os descartava.
2. **Baixar a cota diária de coleta.** Fecha o buraco dos 10×, mas cobra do
   aluno legítimo. Só vale se o cache não der conta.

Nenhum dos dois está especificado. É o trabalho de custo que sobrou.

### 4.2 Objeções — R$2,20 no papel, provavelmente muito menos na prática

**Esta linha está superestimada e o documento-fonte não sabe disso.** A
[F011](../specs/02-features/F011-assistente-de-objecoes.md) foi emendada em
2026-08-13: a aba passou a abrir com um **catálogo curado escrito à mão**, sem
IA e sem cota, e a IA virou um bloco recolhido ("Outra objeção") para o que cai
fora do catálogo. A spec 11 nunca foi atualizada — ela ainda supõe que as 50
objeções/mês do Pro batem todas no modelo.

Ou seja: **o corte que eu recomendaria aqui já foi feito, há três dias.** O que
sobrou de IA é a saída de escape para objeções genuinamente novas — e é
justamente onde a qualidade mais importa, porque é texto que vai pro cliente
numa situação que o catálogo não previu. Não é candidato a downgrade pra `mini`.

**O que fazer:** medir a taxa de uso da saída de escape. Se for baixa (a
expectativa do desenho da F011), o custo real do Pro não é R$6,34 — é mais perto
de **R$4,20**, e Places passa a ser 69% de tudo.

### 4.3 Remover o Agente ou o Simulador — não recomendo

Você levantou essa possibilidade explicitamente, então vai respondida com o
número na mão:

| | Economia/mês | % do custo Pro | Custo da decisão |
|---|---|---|---|
| Remover o Agente | R$0,66 | 10% | uma linha da tabela de `/planos` |
| Remover o Simulador | R$0,59 | 9% | outra linha da tabela |
| **Os dois** | **R$1,25** | **19%** | duas das seis linhas |

São as **duas menores linhas do documento**. Juntas economizam menos da metade
do que o Places sozinho, e menos que a Objeções sozinha. Removê-las para
economizar R$1,25 num custo de R$6,34, enquanto a maior linha nunca foi
otimizada, é cortar pelo lugar errado.

Tem um segundo motivo, e ele é mais forte que o financeiro: **essas duas são a
IA que não dá pra virar template.** A Abordagem e a Proposta saíram porque
combinavam entradas finitas e conhecidas — 6 Dores, 8 serviços, uma oferta fixa.
O Agente responde perguntas sobre a base *daquele* aluno, que ninguém escreveu
antes; o Simulador é conversa interativa, onde a próxima fala depende do que o
aluno acabou de dizer. Não existe tabela que faça isso.

Vale registrar o que sobrou depois desta mudança: a IA do Orion custa **R$1,25
por Pro/mês** (Agente + Simulador). O resto é uma API do Google e uma saída de
escape. Não há muito mais o que cortar de IA — e o que há é o tipo certo.

### 4.4 Ordem recomendada

| # | Ação | Economia estimada | Custo pro produto |
|---|---|---|---|
| 1 | Cache de busca do Places | a medir (a linha vale R$2,89) | nenhum |
| 2 | Medir a saída de escape da F011 e corrigir a spec 11 | até R$2,14 **de erro**, não de gasto | nenhum |
| 3 | Prompt caching no Agente ([11 §6](../specs/11-custos-e-precificacao.md), alavanca 4) | ~R$0,30 | nenhum |
| — | Remover Agente/Simulador | R$1,25 | duas features vendidas |

Os três primeiros somam mais que o quarto e não tiram nada de ninguém.

---

## 5. Quando isto para de importar

O custo fixo compartilhado (Vercel + Neon + Resend + Sentry) é ~$0–20/mês **no
total**, não por aluno. A R$6,34 de variável por Pro, o fixo ainda é ruído.

Mas se as ações 1 e 2 forem feitas, o Pro cai pra ~R$1,83/mês — e aí, com ~200
alunos, o custo fixo já é da mesma ordem do variável. **A partir daí, cortar
custo variável deixa de ser a pergunta certa.** A pergunta vira o custo fixo, e
depois nem isso: vira o que o produto precisa ser.

---

## 6. O que precisa ser medido

Herdado da [11 §7](../specs/11-custos-e-precificacao.md), com duas linhas novas:

- [ ] **Tokens reais por operação** — os unitários da 11 §3 são estimativa de
      prompt, nunca instrumentada. *(pendência antiga)*
- [ ] **Preço real do `gpt-4o`** — as fontes públicas divergem ($2,50/$10 vs
      $1,25/$5). Se for a segunda, todo o custo de IA deste documento cai pela
      metade. *(pendência antiga)*
- [ ] **Taxa de uso da saída de escape da F011** — decide se o Pro custa R$6,34
      ou R$4,20. *(nova)*
- [ ] **Taxa de rebusca** — quantas buscas por aluno/mês retornam Leads que o
      dedupe descarta. Decide o tamanho do prêmio da ação 4.1. *(nova)*

Nenhuma das quatro exige infra: são contadores.
