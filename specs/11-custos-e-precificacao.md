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

### LLM — Anthropic (BYOK, e referência do [ADR-005](04-decisions/ADR-005-anthropic-sdk-outreach.md))
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
| **Outreach** WhatsApp ou e-mail (~300 tokens de saída) | gpt-4o | **~$0,008** · R$0,04 |
| Outreach no tier `fast` | gpt-4o-mini | ~$0,0005 · R$0,003 |
| **Proposta** (F012, ~800 tokens de saída) | gpt-4o | ~$0,013 · R$0,07 |
| **Objeções** (F011) | gpt-4o | ~$0,008 · R$0,04 |
| **Simulador** (F013, por mensagem) | gpt-4o | ~$0,006 · R$0,03 |
| **Agente** (F029, por pergunta, 1–3 chamadas) | gpt-4o | ~$0,02 · R$0,11 |

Duas leituras que orientam o resto do documento:

1. **O diagnóstico — o coração do produto — é grátis.** PageSpeed é gratuito e
   a leitura do site aproveita uma requisição que já acontecia
   ([ADR-016](04-decisions/ADR-016-leitura-do-site-do-lead.md)).
2. **O custo está na busca, não na IA.** Uma busca custa o equivalente a ~4
   Outreaches. Limitar geração de texto protege pouco; limitar **coleta**
   protege muito.

---

## 4. Custo por aluno/mês

Perfil de uso assumido (aluno ativo, modo Orion):

| Cenário | Buscas | Leads | Outreach | Agente | Custo/mês |
|---------|--------|-------|----------|--------|-----------|
| **Free** (50 leads) | 3 | 50 | 30 | — | **~$0,35** · R$1,90 |
| **Pro** (300 leads) | 15 | 300 | 150 | 100 perguntas | **~$3,25** · R$17,90 |
| **Agência** (1.500 leads) | 75 | 1.500 | 600 | 300 perguntas | **~$14,50** · R$79,80 |
| **BYOK** (qualquer volume) | — | — | — | — | **~$0** (só hospedagem) |

Custo fixo compartilhado: Vercel + Neon + Resend + Sentry. Nos planos atuais
(hobby/free tiers) isso é ~$0–20/mês no total, **não por aluno** — reavaliar
quando passar de ~200 alunos ativos.

**O free tier do Google cabe no plano Free.** 1.000 requisições Enterprise
grátis/mês ÷ 3 buscas por aluno Free = **~330 alunos Free simultâneos a custo
zero de Places**. O limite de 50 leads/mês não é arbitrário: é o número que
mantém o Free dentro do que o Google não cobra.

---

## 5. Planos propostos

Preços em BRL/mês, cobrança recorrente. A âncora de valor: **um único site
fechado (R$1.500–3.000) paga anos de assinatura** — o plano não compete com o
custo de API, compete com o custo de não ter cliente.

| | **Free** | **Pro** | **Agência** |
|---|---|---|---|
| **Preço** | R$0 | **R$39/mês** (R$390/ano) | **R$97/mês** (R$970/ano) |
| **Leads no pipeline automatizado** | **50/mês** | 300/mês | 1.500/mês |
| Busca + Triagem (F025) | ✅ | ✅ | ✅ |
| Diagnóstico automático dos melhores | 10 por busca | 20 por busca | 20 por busca |
| Outreach WhatsApp (F005) | ✅ | ✅ | ✅ |
| **Outreach por e-mail (F027)** | ❌ | ✅ | ✅ |
| **Central de Tarefas / cobrança de follow-up (F031)** | ❌ | ✅ | ✅ |
| Funil kanban (F034) | ❌ | ✅ | ✅ |
| **Agente Orion (F029)** | ❌ | 30 perguntas/dia | 100 perguntas/dia |
| Proposta (F012) e Objeções (F011) | 3/mês | ilimitado* | ilimitado* |
| Simulador de venda (F013) | ✅ | ✅ | ✅ |
| Materiais e Skills (F020/F030) | conforme compra | conforme compra | conforme compra |
| Exportar CSV | ❌ | ✅ | ✅ |
| **BYOK** | ✅ (não aumenta o limite) | ✅ (**+100% de limite**) | ✅ (**limite dobrado**) |

\* "ilimitado" = sem contador visível, protegido pelas cotas diárias
anti-abuso da F018.

### As três regras que sustentam os planos
1. **O limite é de Lead no pipeline automatizado, não de custo.** Vale
   **mesmo em BYOK** — é o valor entregue que está sendo vendido, não a API.
   (Decisão do Ricardo, 2026-08-10. Contradiz a
   [visão](00-product-vision.md) atual, que diz "BYOK — sem cotas F018";
   a F035 corrige as duas specs.)
2. **BYOK dá desconto em limite, não em preço.** Quem traz a própria chave
   custa ~$0 pra nós, então ganha mais volume pelo mesmo valor — sem virar um
   plano paralelo com preço separado.
3. **O Free precisa ser bom o bastante pra fechar um cliente.** 50 Leads
   qualificados por mês fecham venda. Quem fechou paga o Pro sem pensar; quem
   não usou não vira custo.

---

## 6. Como baratear (ordenado por impacto)

| # | Alavanca | Efeito | Onde |
|---|----------|--------|------|
| 1 | **Padrão de 1 página no Places** (20 Leads em vez de até 100) | **−80%** do custo Places | [F033](02-features/F033-busca-estruturada.md) — já especificado |
| 2 | **Cache compartilhado de resultados do Places** por (nicho, cidade, bairro), TTL ~30 dias | **−70 a −90%** do Places quando vários alunos varrem a mesma praça — e eles varrem | **Exige ADR** (dado é público e idêntico entre alunos, mas o Lead é escopado por `user_id` — o cache seria da *resposta do Google*, não do Lead) |
| 3 | **Tier `fast` por operação** (follow-up, resumo, classificação) | **−94%** nessas operações (mini vs. 4o) | `modeloPara(provider, "fast")` **já existe e quase não é usado** — decidir por operação |
| 4 | **Prompt caching** nos prompts fixos (outreach, proposta, agente) | −40 a −80% do input a partir da 2ª chamada | Agente (F029) é o maior beneficiário: multi-turn com system prompt grande |
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
