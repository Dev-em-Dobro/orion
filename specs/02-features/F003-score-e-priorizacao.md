# F003 — Score e Priorização por Valor de Nicho

## Status
Proposta — 2026-06-12

## Objetivo
Calcular o **score** (0–100) de um Lead combinando duas dimensões e promover
o Lead de `enriquecido` para `priorizado`. O score deixa de medir só "precisa
de dev" e passa a medir **"precisa de dev E vale a pena abordar"**, jogando
para o topo da lista os Leads de nicho caro e com movimento.

> **score = Necessidade (precisa de dev) ⊕ Valor (nicho caro + porte)**

Sem a F003 a lista não tem ordem útil: o operador prioriza no olho. Com ela,
o topo de `/leads` é a fila de trabalho do dia.

## Conceitos (ver também [domain model](../01-domain-model.md) e [playbook de nichos](../05-playbook/nichos-alto-valor.md))

### Necessidade (0–100) — "precisa de dev"
Derivada do **último Diagnóstico** do Lead (F002). Até a F004 existir, a
F003 lê os campos do Diagnóstico direto (são os mesmos fatos que virarão
Dores). Quando a F004 entrar, a fonte passa a ser as Dores — sem mudar os
números.

| Situação (último Diagnóstico) | Necessidade |
|-------------------------------|-------------|
| `tem_site = false`            | **100** (oportunidade máxima: construir do zero) |
| `site_e_agregador = true` (só Agregador/perfil social — [F009](F009-sinal-site-agregador.md)) | **100** (não há site próprio — igual a "sem site") |
| tem site, `performance_mobile < 50` | 20 + 50 |
| tem site, `performance_mobile` 50–79 | 20 + 25 |
| tem site, `performance_mobile ≥ 80` | 20 + 0 |
| tem site, `performance_mobile = null` (PSI falhou) | 20 + 25 |
| tem site, `tem_https = false`  | **+20** (soma-se ao acima) |

Necessidade é a soma dos termos aplicáveis, **limitada a 100** (`min(soma, 100)`).
Lead sem nenhum Diagnóstico → Necessidade indefinida → **não pontua** (ver Fluxo).
Lead cujo Diagnóstico tem `site_e_agregador = true` curto-circuita em **100**
(igual a "sem site"), pois o `website` é só Agregador/perfil social — ver
[F009](F009-sinal-site-agregador.md).

### Valor (0–100) — "vale a pena abordar"
Combina Tier de nicho e porte/movimento.

**Tier de nicho** (da `categoria`, via mapa do [playbook](../05-playbook/nichos-alto-valor.md)):

| Tier  | tierScore |
|-------|-----------|
| ALTO  | 100       |
| MÉDIO | 55        |
| BAIXO | 20        |

Categoria não mapeada → **BAIXO** (conservador).

**Porte** (de `num_avaliacoes`):

| `num_avaliacoes` | porteScore |
|------------------|------------|
| `null` ou 0–20   | 20         |
| 21–80            | 50         |
| 81–300           | 80         |
| 300+             | 100        |

`Valor = round(0.6 × tierScore + 0.4 × porteScore)`.

### Score final
`score = round(0.55 × Valor + 0.45 × Necessidade)`, em 0–100.

O peso pende levemente para o **Valor** — a estratégia é mirar quem tem
dinheiro —, mas a Necessidade segura o caso "perfil caro com site ótimo"
(score baixo: não há o que vender).

> Os três pesos (0.6/0.4 no Valor, 0.55/0.45 no score), as faixas de porte e
> os tierScore são os **botões de calibragem**. Mudá-los é mudança de
> estratégia → editar esta spec **antes** do código.

### Qualificado
Constante `SCORE_QUALIFICADO = 60` (default). Alinha com a visão: "Lead
qualificado" exige score ≥ threshold + Diagnóstico + Dor + Outreach. A F003
entrega só a parte do score; a UI pode destacar Leads `score ≥ 60`.

## Input (UI)
Botão **Priorizar** em cada linha de `/leads` (habilitado só quando o Lead
tem ao menos um Diagnóstico). Sem form.

| Campo     | Tipo   | Validação                |
|-----------|--------|--------------------------|
| `lead_id` | string | obrigatório, cuid válido |

## Saída (UI)
Resumo após a operação:

> *"Score 78 — Valor 90 (ALTO · 120 avaliações) · Necessidade 65 (site lento)."*

A lista `/leads` passa a ordenar por **`score desc`**, depois `created_at desc`.
Cada linha exibe `score`, Tier do nicho e um realce visual para `score ≥ 60`.

## Fluxo
1. Operador clica em **Priorizar** na linha do Lead.
2. Server Action `priorizarLead({ lead_id })`:
   1. Valida input com Zod. Lead inexistente → `{ erro: "Lead não encontrado" }`.
   2. Carrega o Lead com o último Diagnóstico (`take: 1`, `executado_em desc`).
      Sem Diagnóstico → `{ erro: "Lead sem Diagnóstico — diagnostique antes de priorizar" }`.
   3. Calcula `necessidade` via `src/lib/score/necessidade(diagnostico)`.
   4. Calcula `valor` via `src/lib/score/valor({ categoria, num_avaliacoes })`,
      que usa `src/lib/score/tierDoNicho(categoria)`.
   5. Calcula `score` via `src/lib/score/calcularScore({ valor, necessidade })`.
   6. `prisma.lead.update`: grava `score`; se `status = enriquecido` → `priorizado`
      (qualquer outro status mantém — re-priorizar não regride o funil).
   7. Retorna `{ score, valor, necessidade, tier, num_avaliacoes }`.
3. UI mostra o resumo e revalida `/leads`.

## Critérios de aceitação
- [ ] **AC1** — Lead Tier ALTO (ex.: `dentist`), `num_avaliacoes = 150`,
      último Diagnóstico `tem_site = false` → `Valor = 92`, `Necessidade = 100`,
      `score = 96`, `status = priorizado`.
- [ ] **AC2** — Lead Tier BAIXO não mapeado, `num_avaliacoes = 5`, site ótimo
      (`performance_mobile = 95`, `tem_https = true`) → `Valor = 20`,
      `Necessidade = 20`, `score = 20` (corretamente no fundo da fila).
- [ ] **AC3** — `tierDoNicho` devolve ALTO/MÉDIO/BAIXO conforme o mapa do
      playbook; `categoria` desconhecida → BAIXO.
- [ ] **AC4** — `num_avaliacoes = null` é tratado como porteScore = 20, sem
      quebrar o cálculo.
- [ ] **AC5** — Priorizar Lead sem nenhum Diagnóstico → `{ erro }` específico,
      sem alterar o Lead.
- [ ] **AC6** — Re-priorizar recalcula e regrava o `score`; Lead já
      `contatado`/`ganho`/etc. mantém o `status` (não volta a `priorizado`).
- [ ] **AC7** — `/leads` ordena por `score desc`, depois `created_at desc`,
      e realça Leads com `score ≥ 60`.
- [ ] **AC8** — `lead_id` inválido (Zod) ou inexistente → `{ erro }` específico
      na UI, sem efeitos colaterais.
- [ ] **AC9** — Funções de `src/lib/score/` são puras (sem dep de Next nem
      Prisma) e testáveis isoladamente com os exemplos das AC1/AC2.

## Decisões de implementação
- `src/lib/score/` — funções puras: `tierDoNicho`, `valor`, `necessidade`,
  `calcularScore`. O mapa nicho → Tier é uma constante derivada do playbook.
- Server Action em `src/actions/leads/priorizar.ts`, fina — orquestra
  `lib/score` + Prisma.
- Sem lib nova → **sem ADR**.
- Depende dos campos `nota` e `num_avaliacoes` no Lead (coletados na F001 —
  ver delta no contrato e na F001) e do último Diagnóstico (F002).

## Fora do escopo (F003)
- Necessidade a partir de Dor persistida ([F004](F004-deteccao-de-dor.md)) —
  a F003 continua lendo o Diagnóstico direto até evolução própria.
- Geração de Outreach (F005).
- Priorização em lote ("priorizar todos os enriquecidos") — conflita com a
  guideline síncrona; avaliar por spec se virar dor real.
- Re-priorização automática após re-diagnóstico — disparo continua manual.
- Filtro/busca por Tier ou faixa de score na lista → F-listagem.
- Uso de `nota` (rating) como termo do score — coletado, mas reservado;
  por ora só `num_avaliacoes` entra no porte. Promover por spec se útil.

## Custo estimado
Zero APIs externas — cálculo puro sobre dados já no banco. **$0/mês**.
