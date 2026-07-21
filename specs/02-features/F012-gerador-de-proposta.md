# F012 — Gerador de Proposta com Preço Sugerido

## Status
Proposta — 2026-07-11

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
- Lib nova? Não — reusa `@anthropic-ai/sdk` ([ADR-005](../04-decisions/ADR-005-anthropic-sdk-outreach.md)). **Sem ADR.**

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
~R$0,15–0,25 por Proposta (Opus 4.8; saída de escopo + entregáveis) — ver
[contrato](../03-contracts/claude-messages.md). O cálculo de preço é puro (**$0**).
Volume baixo (só Leads qualificados) → marginal, dentro do teto de R$50/mês.
