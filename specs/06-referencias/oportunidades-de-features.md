# Referências — Oportunidades de Feature (o que faz o aluno fechar)

## Status
Análise — 2026-07-11 · derivada do [dossiê de concorrentes](concorrentes.md)

## Pergunta que este doc responde
Dentre as funcionalidades dos concorrentes ([Apollo](concorrentes.md#1-apolloio),
[Leads Per Hour](concorrentes.md#2-leads-per-hour-lph),
[MapLeads](concorrentes.md#3-mapleads)) e das boas práticas de prospecção,
**quais têm mais chance de fazer o aluno FECHAR negócio** — e quais **3** o
prospect-engine ainda **não tem**.

> O usuário real desta ferramenta é o **aluno** (freelancer dev em formação).
> A fraqueza dele **não é achar Lead** (o produto já faz isso muito bem) — é
> **converter a conversa em cliente pagante**. As oportunidades abaixo miram
> exatamente essa fraqueza.

## O diagnóstico do funil atual (a lacuna)
O funil é: `novo → enriquecido → priorizado → contatado → respondeu →
qualificado → proposta → ganho`.

| Etapa | Feature que ajuda hoje |
|-------|------------------------|
| novo → enriquecido | F002 Diagnóstico · F008 Diagnóstico UX |
| enriquecido → priorizado | F003 Score |
| priorizado → contatado | F005 Abordagem · F006 marcar enviada |
| contatado → (re-toque) | F006 Follow-up |
| **contatado → respondeu** | *(nada)* |
| **respondeu → qualificado** | ❌ **nada** |
| **qualificado → proposta** | ❌ **nada** |
| **proposta → ganho** | ❌ **nada** |

**Toda etapa até `contatado` tem ferramenta. Nenhuma etapa depois tem.** O
produto é excelente em *chegar na conversa* e dá **zero apoio pra vencer a
conversa** — que é onde o aluno trava (o "tá caro", o "vou pensar", a proposta
que nunca sai). É aí que estão as 3 maiores alavancas de fechamento.

---

## As 3 escolhidas (não temos + maior alavanca de fechamento)

### 1. Assistente de Resposta a Objeções
**Inspiração:** LPH **Meet** (coach ao vivo que detecta objeção e sugere
resposta com dados do CRM).

**A lacuna:** move `respondeu → qualificado`. Hoje, quando o Lead responde
("achei caro", "já tenho site", "não tenho tempo", "me manda por e-mail"), o
aluno está sozinho — e é aqui que a maioria dos negócios morre.

**O que é:** o aluno cola a mensagem do Lead; a Server Action chama a Claude API
com o **contexto do Lead** (Diagnóstico F002 + Diagnóstico UX F008 + oferta do
`brand.ts`) e devolve **2–3 respostas sugeridas**, curtas, em PT-BR, que
reancoram no valor e desarmam a objeção específica — sem prometer o que não
temos (mesma disciplina de honestidade da F005).

**Por que fecha (e por que pro aluno):** a objeção bem respondida é o momento de
maior alavancagem de venda que existe. O aluno dev sabe fazer site; não sabe
dizer "entendo, e é por isso que o diagnóstico é grátis — você só decide depois
de ver o resultado". A ferramenta empresta esse repertório.

**Encaixe na stack:** Claude API síncrona (reusa ADR-005), sem lib nova, sem
infra. LGPD-safe (só usa dados que já temos). Persistência opcional (pode nem
persistir, como F007/F008). **Esforço: baixo.**

---

### 2. Gerador de Proposta com preço sugerido
**Inspiração:** Apollo **Deal Execution** (pré-meeting insights, pipeline) — mas
aqui resolve um buraco **nosso**: o status `proposta` existe no funil e **nada
gera a proposta**.

**A lacuna:** move `qualificado → proposta → ganho`. É o passo literalmente
antes do `ganho`, e o mais direto rumo ao fechamento.

**O que é:** a partir do Diagnóstico (F002) + Diagnóstico UX (F008) + Tier de
nicho (F003), gera uma **proposta estruturada**: escopo, entregáveis, prazo e
uma **faixa de preço sugerida** calibrada pela Dor e pelo Tier (dentista Tier
ALTO ≠ lanchonete Tier BAIXO). Editável e copiável (WhatsApp/PDF simples).

**Por que fecha (e por que pro aluno):** o aluno dev **congela na hora de
precificar** e some por dias montando orçamento — o Lead esfria. Uma proposta em
1 clique, ancorada na Dor concreta que ele mesmo diagnosticou, tira o atrito e
mantém o timing. Transforma o "diagnóstico gratuito" (F008) em contrato.

**Encaixe na stack:** Claude API síncrona, structured output (escopo/itens/
preço), sem infra. Fecha o ciclo Diagnóstico → Proposta que o produto já quase
tem. **Esforço: baixo–médio** (talvez persistir a proposta e mover o status).

---

### 3. Simulador de Venda (Roleplay)
**Inspiração:** LPH **Roleplay** (simulações de SDR geradas de calls reais, com
scorecard de competências).

**A lacuna:** não move um Lead — **constrói a habilidade** que faz o aluno fechar
*todos* os Leads. É o pilar de **treino**, irmão do inbound da F007.

**O que é:** o aluno escolhe um cenário (categoria/Dor reais, ou um Lead do
banco) e **treina a conversa de venda** contra a Claude API fazendo o papel do
**dono do negócio cético** ("tá caro", "meu sobrinho faz de graça", "não vejo
resultado"). Ao fim, um **scorecard**: descoberta, resposta a objeção,
proposta de valor, fechamento — com o que melhorar.

**Por que fecha (e por que pro aluno):** é a feature **mais "aluno" de todas** —
alinhada com o DNA de educação. Quem ensaia a venda 10× fecha mais que quem
improvisa na primeira call real de verdade. Compõe com a #1 (objeções) e a #2
(proposta): pratica o que as outras duas municiam.

**Encaixe na stack:** Claude API multi-turn síncrona, sem persistência
obrigatória (como F007/F008), sem lib/infra nova. **Esforço: médio** (é
conversa multi-turn + scorecard, um pouco mais que as one-shot).

---

## Por que estas 3 (e não as outras)
Formam a **"camada de fechamento"** que falta: municiar a conversa (#1),
produzir o artefato que precede o `ganho` (#2) e treinar a habilidade que
destrava tudo (#3). Todas: **Claude API síncrona, sem lib/infra nova, LGPD-safe,
e mirando a fraqueza real do aluno (vender, não achar Lead).**

## Runner-ups considerados (e por que ficaram de fora)
- **Enriquecimento do decisor** (← Apollo: nome + WhatsApp/e-mail direto do dono).
  **Maior impacto bruto de todos** — falar com quem decide, não com o balcão.
  **Mas colide com a restrição da visão** ("sem enriquecimento via dados
  pessoais"). Versão possível e limpa: extrair contato que **o próprio negócio
  publicou** (site/Instagram público). **Exige ADR + decisão de escopo antes** —
  por isso não entra nas 3 "prontas pra virar spec".
- **Sinal "já anuncia" (Meta/Google Ads)** — quem paga anúncio **tem verba e
  quer cliente agora**: ótimo *sinal de qualificação/timing*, mas é upstream
  (prioriza), não fecha. Candidato a incrementar a F003, não a "camada de
  fechamento".
- **Canal e-mail na Abordagem** — Apollo/MapLeads são multicanal. No local BR o
  WhatsApp domina; ganho marginal de fechamento. Baixa prioridade.
- **Escrita de e-mail por IA / disparo em massa** (MapLeads) — já coberto pela
  F005 no espírito certo (personalizado, manual), e o "massa" conflita com LGPD.

## Especadas (2026-07-11)
As 3 viraram specs em `/specs/02-features`:
- **#1 Objeções → [F011](../02-features/F011-assistente-de-objecoes.md)**
- **#2 Proposta → [F012](../02-features/F012-gerador-de-proposta.md)**
- **#3 Roleplay → [F013](../02-features/F013-simulador-de-venda.md)**

Sugestão de **ordem de implementação** por alavanca de fechamento (independe do
nº do ID): **F012 Proposta** (mais direta pro `ganho`) → **F011 Objeções** →
**F013 Roleplay**. Nenhuma muda o domain model nem exige lib/ADR novos (todas
reusam o [ADR-005](../04-decisions/ADR-005-anthropic-sdk-abordagem.md)).
