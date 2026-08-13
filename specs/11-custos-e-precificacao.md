# 11 — Custos e Precificação

## Status
Proposta — 2026-08-10 · insumo da [F035](02-features/F035-planos-e-limites.md)

Responde três perguntas: **quanto cada operação do Orion custa**, **quanto custa
um aluno por mês**, e **quais planos cobrem isso com margem**. Números com
fonte; suposições marcadas como suposição.

---

## 1. Quem paga o quê hoje

O modo de chave ([F018](02-features/F018-limites-diarios.md)) decide o pagador:

| Modo | Google (Places + PageSpeed) | LLM | Quem paga |
|------|------------------------------|-----|-----------|
| **Orion** (padrão) | `ORION_GOOGLE_API_KEY` | `ORION_OPENAI_API_KEY` | **Nós** |
| **BYOK** | chave do aluno | chave do aluno (Anthropic/OpenAI/Gemini) | **O aluno** |

> **Fato do código, não do plano:** em modo Orion o provider de LLM é **sempre
> OpenAI**, mesmo que o aluno tenha escolhido Anthropic ou Gemini na UI —
> `createLlmForUser` (`src/lib/llm/for-user.ts`) chama
> `createLlmClient("openai", …)` direto. A escolha de provider da
> [F017](02-features/F017-multi-provider-llm.md) só vale no BYOK, porque só
> existem chaves Orion para `google` e `openai`
> (`src/lib/chaves/orion.ts`). Qualquer conta de custo no modo Orion é conta
> de OpenAI.

---

## 2. Tabela de preços dos insumos

### Google Places API (New) — Text Search
Fonte: [contrato do projeto](03-contracts/google-places.md), que espelha a
tabela do Google. **É o insumo mais caro do Orion.**

| SKU | Grátis/mês | Preço |
|-----|-----------|-------|
| IDs Only | ilimitado | $0 |
| Pro | 5.000 | $32 / 1.000 |
| **Enterprise** (o que usamos) | **1.000** | **$35 / 1.000** |

A `FieldMask` do Orion pede `nationalPhoneNumber` e `websiteUri` → dispara
**Enterprise**. Cada página de resultados (até 20 Leads) = **1 requisição =
$0,035** depois do free tier.

> ⚠️ Hoje **toda coleta pagina até 5 vezes** (`PLACES_MAX_PAGES = 5`), o aluno
> querendo ou não: **$0,175 por busca**. A [F033](02-features/F033-busca-estruturada.md)
> torna isso escolha (20/40/60 → 1/2/3 páginas, padrão 1) e **corta 80% do custo
> Places de uma vez**.

### PageSpeed Insights
**Grátis.** Quota de 25.000 req/dia e 400/100s. O aprofundamento da
[F025](02-features/F025-fila-do-dia.md) cabe folgado — 100 alunos × 10
diagnósticos/dia = 1.000 req/dia (4% da quota).

### LLM — OpenAI (modo Orion)
Modelos configurados em `src/lib/llm/modelos.ts`: `gpt-4o` (strong) e
`gpt-4o-mini` (fast).

| Modelo | Input / 1M | Output / 1M |
|--------|-----------|-------------|
| `gpt-4o` | ~$2,50 | ~$10,00 |
| `gpt-4o-mini` | ~$0,15 | ~$0,60 |

> **Confirmar antes de fechar preço.** As fontes públicas divergem para o
> `gpt-4o` (uma tabela indica $1,25/$5,00). Validar na página oficial da OpenAI
> antes de publicar plano pago. A ordem de grandeza — mini ≈ **6% do custo** do
> strong — é o que importa aqui e é estável.

### LLM — Anthropic (BYOK, e referência do [ADR-005](04-decisions/ADR-005-anthropic-sdk-abordagem.md))
Fonte: tabela oficial de modelos (consultada em 2026-08-10).

| Modelo | Input / 1M | Output / 1M |
|--------|-----------|-------------|
| Claude Opus 5 | $5,00 | $25,00 |
| Claude Sonnet 5 | $3,00 ($2,00 promocional até 31/08/2026) | $15,00 ($10,00 promocional) |
| Claude Haiku 4.5 | $1,00 | $5,00 |

Dois mecanismos de desconto que valem para qualquer operação nossa:
- **Prompt caching** — leitura do cache custa **~0,1×** do input; escrita custa
  1,25× (TTL 5 min) ou 2× (TTL 1h). Paga-se a partir da 2ª requisição com o
  mesmo prefixo.
- **Batch API** — **50% de desconto**, resposta assíncrona (até 24h). Não serve
  para o fluxo síncrono atual, mas serve para qualquer geração em lote futura.

> O `modelos.ts` ainda aponta `claude-opus-4-8` como strong da Anthropic.
> Atualizar para `claude-opus-5` (mesmo preço, mais capaz) numa PR própria.

---

## 3. Custo por operação

Tokens estimados a partir dos prompts atuais (suposição: prompt + contexto do
Lead ≈ 2.000 tokens de entrada; saída conforme a operação). Câmbio assumido:
**US$ 1,00 = R$ 5,50** — atualizar quando fechar o preço.

| Operação | Insumo | Custo unitário (modo Orion) |
|----------|--------|------------------------------|
| **Busca** (20 Leads, 1 página — F033) | 1 req Places Enterprise | **$0,035** · R$0,19 |
| Busca (padrão de hoje, 5 páginas) | 5 req Places | $0,175 · R$0,96 |
| **Triagem** (score de todos, F025) | — | **$0** |
| **Diagnóstico** de 1 Lead (F002 + F026 + F027) | 1 GET no site + 1 PSI | **$0** |
| **Abordagem** WhatsApp ou e-mail (~300 tokens de saída) | gpt-4o | **~$0,008** · R$0,04 |
| Abordagem no tier `fast` | gpt-4o-mini | ~$0,0005 · R$0,003 |
| **Proposta** (F012, ~800 tokens de saída) | gpt-4o | ~$0,013 · R$0,07 |
| **Objeções** (F011) | gpt-4o | ~$0,008 · R$0,04 |
| **Simulador** (F013, por mensagem) | gpt-4o | ~$0,006 · R$0,03 |
| **Agente** (F029, por pergunta, 1–3 chamadas) | gpt-4o | ~$0,02 · R$0,11 |

Duas leituras que orientam o resto do documento:

1. **O diagnóstico — o coração do produto — é grátis.** PageSpeed é gratuito e
   a leitura do site aproveita uma requisição que já acontecia
   ([ADR-016](04-decisions/ADR-016-leitura-do-site-do-lead.md)).
2. **O custo está na busca, não na IA.** Uma busca custa o equivalente a ~4
   Abordagens. Limitar geração de texto protege pouco; limitar **coleta**
   protege muito.

---

## 4. Custo por aluno/mês

> **Revisão de 2026-08-13.** Duas premissas da v1 caíram: **BYOK acabou** para
> novos alunos (F035), então não existe mais o cenário "~$0 pra nós"; e os
> limites passaram de **diários** para **mensais**, então o custo por aluno tem
> teto contratual, não estimativa de uso.

Perfil = **aluno no teto do plano**. É o pior caso, não o caso típico: na
prática quase ninguém encosta no limite, então a margem real fica acima da
calculada aqui.

Modelo por operação: Abordagem, Proposta e Objeções em **gpt-4o** (texto que vai
pro cliente, qualidade importa); Agente e Simulador em **gpt-4o-mini** (~6% do
custo, conversa interativa de alto volume — ver §6, alavanca 3).

| | Free | Pro | Agência |
|---|---|---|---|
| Leads novos/mês | 60 | 300 | 800 |
| Places (req · custo) | 3 · $0,105 | 15 · $0,525 | 40 · $1,400 |
| Abordagem (4o) | 20 · $0,160 | 150 · $1,200 | 300 · $2,400 |
| Proposta (4o) | 3 · $0,039 | 30 · $0,390 | 60 · $0,780 |
| Objeções (4o) | 5 · $0,040 | 50 · $0,400 | 80 · $0,640 |
| Agente (mini) | 5 · $0,006 | 100 · $0,120 | 300 · $0,360 |
| Simulador (mini) | 20 · $0,007 | 300 · $0,108 | 1.000 · $0,360 |
| **Total/mês** | **$0,357** | **$2,743** | **$5,940** |
| **Em BRL** (câmbio 5,50) | **R$1,96** | **R$15,09** | **R$32,67** |

Custo fixo compartilhado: Vercel + Neon + Resend + Sentry. Nos planos atuais
(hobby/free tiers) isso é ~$0–20/mês no total, **não por aluno** — reavaliar
acima de ~200 alunos ativos.

### O free tier do Google é o que decide o limite do Free

São **1.000 requisições Enterprise grátis por mês**, na conta inteira — não por
aluno. Então o limite do Free não é escolha de generosidade, é divisão:

| Limite do Free | Req/aluno | Alunos Free a custo **zero** de Places |
|---|---|---|
| 50 leads/mês | 2,5 → 3 | ~333 |
| **60 leads/mês** | **3** | **~333** |
| 100 leads/mês | 5 | ~200 |

**60 é o número certo, e não por acaso:** cai exato em 3 páginas (zero
desperdício), é a opção do meio da busca da [F033](02-features/F033-busca-estruturada.md)
— então *uma* busca de 60 é exatamente um mês de Free, que é fácil de explicar —
e mantém ~333 alunos dentro do que o Google não cobra. Subir pra 100 corta esse
número pela metade sem melhorar a promessa ("dá pra fechar um cliente").

Passando de ~333 alunos Free ativos, cada aluno adicional custa **$0,105/mês**
(R$0,58) só de Places.

---

## 5. Planos propostos

| | **Free** | **Pro** | **Agência** |
|---|---|---|---|
| **Preço cheio** | R$0 | **R$39/mês** | **R$97/mês** |
| **Preço aluno (−20%)** | R$0 | **R$31,20/mês** | **R$77,60/mês** |
| Leads novos/mês | 60 | 300 | 800 |
| Abordagem WhatsApp/mês | 20 | 150 | 300 |
| Proposta/mês | 3 | 30 | 60 |
| Objeções/mês | 5 | 50 | 80 |
| Agente Orion/mês | 5 | 100 | 300 |
| Simulador (mensagens)/mês | 20 | 300 | 1.000 |
| Central de Tarefas · Kanban · CSV | ✅ | ✅ | ✅ |
| **Custo nosso no teto** | R$1,96 | R$15,09 | R$32,67 |
| **Margem no preço cheio** | — | **61%** | **66%** |
| **Margem no preço de aluno** | — | **52%** | **58%** |

**Nada é bloqueado por plano.** O que separa é volume. Recurso fechado ensina o
aluno que o produto não serve pra ele; recurso com teto ensina que serve — e que
o teto chegou.

### Por que a Agência caiu de 1.500 para 800 leads

A 1.500 leads + 600 abordagem o custo vai a **R$58,55/mês**. Contra R$97 isso é
39% de margem, e contra os R$77,60 do aluno com desconto, **25%** — abaixo do
que qualquer software sustenta. Duas saídas:

| Opção | Custo | Margem cheia | Margem aluno |
|---|---|---|---|
| **800 leads a R$97** (proposta) | R$32,67 | 66% | 58% |
| 1.500 leads a R$197 | R$58,55 | 70% | 63% |

Escolhi a primeira por manter a escada de preço curta (0 → 39 → 97). A segunda é
melhor se existir demanda real de agência com volume alto.

### Os dois cenários de receita

**A — aluno do Builders Club (paga R$997 pelo acesso).**

| Tempo no Free | Custo acumulado | % do R$997 |
|---|---|---|
| 12 meses | R$23,58 | 2,4% |
| 24 meses | R$47,16 | 4,7% |
| 36 meses | R$70,74 | 7,1% |

**O Free do aluno está pago com folga.** Mesmo três anos de uso no teto
consomem 7% do que ele já pagou. Aqui o Free não é custo de aquisição — é custo
de retenção de alguém que já comprou, e é barato.

Se ele sobe pro Pro com 20%: R$31,20/mês de receita **incremental** sobre o
R$997, com R$16,11/mês de contribuição no pior caso.

**B — pessoa de fora, sem curso, só mensalidade.**

Aqui não existe R$997 amortizando nada. Só a assinatura:

| Preço | Contribuição/mês | Churn 5% (vida 20m) | Churn 8% (vida 12m) |
|---|---|---|---|
| R$39 | R$23,91 | LTV R$478 · CAC máx. R$159 | LTV R$299 · CAC máx. R$100 |
| R$59 | R$43,91 | LTV R$878 · CAC máx. R$293 | LTV R$549 · CAC máx. R$183 |
| R$79 | R$63,91 | LTV R$1.278 · CAC máx. R$426 | LTV R$799 · CAC máx. R$266 |

(CAC máx. = LTV ÷ 3, a régua usual de LTV:CAC 3:1.)

### R$39 compensa? Depende de quem está pagando.

**Como upsell de aluno: sim, com folga.** É receita incremental sobre um cliente
já adquirido, custo de aquisição zero, 52% de margem no pior caso e ~80% no uso
real. Não precisa se pagar sozinho — ele soma ao R$997.

**Como preço de entrada pra público frio: é apertado.** R$159 de CAC máximo não
compra tráfego pago em nicho de software B2B no Brasil. Pra público frio, R$59–79
é o que dá espaço de aquisição.

**E tem um custo que não está na tabela: o seu tempo.** A margem cheia do Pro é
R$23,91/mês. Sua hora a R$100 = **14 minutos de suporte por mês** consomem a
margem inteira de um assinante; a R$200/h, 7 minutos. R$39 só fecha se o produto
for self-service de verdade — onboarding sem você, erro que se explica sozinho,
zero e-mail de "como faço". Cada ticket recorrente torna esse plano negativo.

> **Recomendação.** Manter R$39 **para aluno** (com os 20%, R$31,20) e tratar
> como upsell. Se um dia abrir pra público frio, entrar com **R$59** como preço
> de tabela e manter R$39 como preço de aluno — a diferença vira exatamente o
> desconto de 20% que você quer dar, sem precisar de duas tabelas.

### O Free precisa continuar sendo só de aluno

Enquanto o Free for de aluno do Builders Club, ele está pago pelo R$997. Aberto
ao público, ele vira custo puro: **R$1,96/mês por pessoa, sem nenhuma receita**,
e depois de ~333 pessoas o Places começa a cobrar. Mil inscritos de graça custam
R$1.960/mês.

Se abrir pra fora, o Free vira **trial com prazo** (ex.: 14 dias ou 60 leads,
o que vier primeiro), não plano permanente.

### As regras que sustentam os planos (revisadas em 2026-08-13)
1. **O limite é de valor entregue, não de custo de API.** Continua valendo — só
   perdeu a cláusula "inclusive em BYOK", porque BYOK acabou (F035).
2. ~~BYOK dá desconto em limite~~ — **morta**. Sem BYOK novo não há custo zero
   pra compensar.
3. **O Free precisa fechar um cliente.** 60 Leads diagnosticados por mês fecham
   venda; quem fechou paga o Pro sem pensar. E quem não usou não vira custo.
4. **Todo limite é mensal.** Cota diária ([F018](02-features/F018-limites-diarios.md))
   deixa de ser o teto de produto e fica só como freio anti-loop. Um teto por
   mês é o que o aluno consegue planejar — "5 por dia" não descreve plano
   nenhum.

---

## 6. Como baratear (ordenado por impacto)

| # | Alavanca | Efeito | Onde |
|---|----------|--------|------|
| 1 | **Padrão de 1 página no Places** (20 Leads em vez de até 100) | **−80%** do custo Places | [F033](02-features/F033-busca-estruturada.md) — já especificado |
| 2 | **Cache compartilhado de resultados do Places** por (nicho, cidade, bairro), TTL ~30 dias | **−70 a −90%** do Places quando vários alunos varrem a mesma praça — e eles varrem | **Exige ADR** (dado é público e idêntico entre alunos, mas o Lead é escopado por `user_id` — o cache seria da *resposta do Google*, não do Lead) |
| 3 | **Tier `fast` por operação** (follow-up, resumo, classificação) | **−94%** nessas operações (mini vs. 4o) | `modeloPara(provider, "fast")` **já existe e quase não é usado** — decidir por operação |
| 4 | **Prompt caching** nos prompts fixos (abordagem, proposta, agente) | −40 a −80% do input a partir da 2ª chamada | Agente (F029) é o maior beneficiário: multi-turn com system prompt grande |
| 5 | **Empurrar BYOK nos planos pagos** | custo marginal → ~$0 | Já é o gancho do "+100% de limite" |
| 6 | **Não aprofundar Lead que ninguém vai abordar** | −N diagnósticos | Já é o desenho da F025 (top 10, não os 83) |
| 7 | **Batch API (−50%)** | só se surgir geração em lote assíncrona | Hoje tudo é síncrono ([ADR-002](04-decisions/ADR-002-sem-workers-fase-1.md)) — não aplicável |

**Alavanca #2 merece atenção**: 20 alunos buscando "barbearia em Curitiba" no
mesmo mês pagam 20 buscas hoje e pagariam 1 com cache. É a diferença entre o
Places ser irrelevante e ser o maior custo variável do produto.

---

## 7. O que precisa ser medido antes de publicar preço

O modelo acima é aritmética sobre suposições de uso. Antes de cobrar:

- [ ] **Tokens reais por operação** — instrumentar `usage` (input/output) de
      cada chamada LLM e guardar por operação. Hoje não medimos nada disso.
- [ ] **Requisições Places por aluno/mês** — o `DailyUsage` já conta a operação
      `coleta`, mas não quantas **páginas** cada coleta consumiu.
- [ ] **Preço vigente do `gpt-4o`** na página oficial da OpenAI (fontes
      públicas divergem).
- [ ] **Câmbio** na data da publicação.
- [ ] **Custo fixo real** de Vercel + Neon no volume esperado (a
      [F028](02-features/F028-desempenho.md)/[ADR-015](04-decisions/ADR-015-regiao-execucao-e-banco.md)
      pode mudar o plano do Neon se a região migrar).

Sem os dois primeiros itens, qualquer margem aqui é estimativa — e o primeiro
aluno pesado descobre isso por nós.

---

## Fontes
- Preços Anthropic: tabela oficial de modelos e pricing (consultada 2026-08-10).
- Preços Google Places: [contrato do projeto](03-contracts/google-places.md).
- Preços OpenAI (a confirmar): [CloudZero](https://www.cloudzero.com/blog/openai-pricing/) ·
  [BenchLM](https://benchlm.ai/openai/api-pricing) ·
  [aipricing.guru](https://www.aipricing.guru/openai-pricing/)
