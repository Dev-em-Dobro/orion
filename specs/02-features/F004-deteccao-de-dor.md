# F004 — Detecção e persistência de Dor

## Status
Aceito — 2026-07-16

## Objetivo
A partir do **Diagnóstico** de um Lead ([F002](F002-diagnostico-de-presenca-digital.md)
+ sinal [F009](F009-sinal-site-agregador.md)), **detectar** e **persistir**
registros de **Dor** no banco, escopados por `user_id` ([F015](F015-multi-tenant.md)).

Hoje a entidade `Dor` existe no schema e no
[domain model](../01-domain-model.md), mas nenhum fluxo a cria: F005/F011/F012/F013
derivam texto em runtime a partir do Diagnóstico. Esta feature fecha o modelo:
as Dores passam a ser a **fonte de verdade** para Outreach, proposta, objeções e
simulador.

## Linguagem
- **Dor** — problema concreto detectado no Lead (ver domínio). Campos: `tipo`,
  `severidade`, `detalhes` (texto curto em PT-BR pronto para prompts).
- **Detecção** — função pura `Diagnostico` (+ `website`) → lista de Dores
  candidatas. Sem rede, sem LLM.
- **Substituição** — em re-diagnóstico, o conjunto de Dores do Lead é
  **substituído** pelo resultado do último Diagnóstico (delete + insert no
  tenant), evitando Dores órfãs.

## Quando roda
No **mesmo** passo do Diagnóstico (F002), **depois** de persistir o
`Diagnostico`. A promoção `novo → enriquecido` permanece na F002; a F004 só
grava Dores.

## Mapeamento Diagnóstico → Dor

| Condição | `tipo` | `severidade` | `detalhes` (padrão) |
|----------|--------|--------------|---------------------|
| `website` ausente **ou** `tem_site = false` | `SEM_SITE` | `ALTA` | não tem site / presença digital própria |
| `site_e_agregador = true` | `SITE_AGREGADOR` | `ALTA` | só tem link-in-bio / rede social, sem site próprio |
| `performance_mobile !== null` **e** `< 50` | `SITE_LENTO` | `ALTA` se `< 30`, senão `MEDIA` | site muito lento no celular (nota N/100 no Google PageSpeed) |
| `tem_https = false` | `SEM_HTTPS` | `MEDIA` | site sem HTTPS (sem cadeado de segurança) |

Regras:

1. `SEM_SITE` e `SITE_AGREGADOR` são **exclusivos** entre si e **não empilham**
   com `SITE_LENTO` / `SEM_HTTPS` (não há site próprio mensurável).
2. Com site próprio, `SITE_LENTO` e `SEM_HTTPS` podem coexistir.
3. Site no ar sem essas Dores → **zero** registros de Dor (proposta/outreach
   usam fallback de copy “sem problema técnico grave”, como hoje).
4. `SEM_RESPOSTA_REVIEWS` permanece no enum do domínio, **sem detector** nesta
   feature (extensão futura).

## Input / saída (UI)
Sem UI nova. O botão **Diagnosticar** (F002) passa a também persistir Dores.
Consumidores (Outreach, Proposta, Objeções, Treino) leem `Lead.dores` (tenant)
em vez de derivar do Diagnóstico.

## Fluxo
1. F002 conclui medição e cria `Diagnostico` com `user_id` da sessão.
2. `detectarDores(diag, website)` (puro) → candidatas.
3. `substituirDoresDoLead(userId, leadId, candidatas)`:
   - `deleteMany` onde `{ user_id, lead_id }`
   - `createMany` das novas Dores com o mesmo `user_id` / `lead_id`
4. Consumers leem `dores` do Lead (ordenado estável por `tipo` se útil) e usam
   `detalhes` como strings de prompt (`textosDasDores`).

## Critérios de aceitação
- [x] **AC1** — Após Diagnosticar, existem Dores no banco coerentes com a tabela
      de mapeamento (casos SEM_SITE, SITE_AGREGADOR, SITE_LENTO, SEM_HTTPS).
- [x] **AC2** — Re-diagnosticar **substitui** o conjunto anterior (mesmo Lead /
      tenant); não acumula Dores contraditórias.
- [x] **AC3** — Toda leitura/escrita de Dor filtra por `user_id` da sessão (F015);
      Lead de outro aluno → 404 / “não encontrado”.
- [x] **AC4** — Outreach (F005), Proposta (F012), Objeções (F011) e seed do
      Simulador (F013) usam Dores persistidas (`detalhes`), não derivação ad-hoc
      do Diagnóstico na action.
- [x] **AC5** — Detecção é função pura em `src/lib/dores/`, coberta por testes
      unitários (Vitest).
- [x] **AC6** — `SEM_RESPOSTA_REVIEWS` não é criado automaticamente.

## Decisões de implementação
- `src/lib/dores/detectar.ts` — detector puro.
- `src/lib/dores/persistir.ts` — `substituirDoresDoLead` (Prisma + `user_id`).
- `src/lib/dores/textos.ts` (ou evolução de `derivarDoDiagnostico.ts`) —
  `textosDasDores(dores) → string[]` a partir de `detalhes`.
- Wire em `src/actions/leads/diagnosticar.ts` após o create do Diagnóstico.
- Modelo `Dor` / enums já no schema — **sem migration** obrigatória; índice
  composto `(user_id, lead_id)` opcional se ainda não houver cobertura suficiente
  pelos índices atuais.

## Fora do escopo
- UI dedicada “lista de Dores” no Lead.
- Recalcular score (F003) a partir de Dor em vez de Diagnóstico (pode vir depois;
  F003 continua lendo Diagnóstico até spec própria).
- Detector de `SEM_RESPOSTA_REVIEWS`.
- Backfill em massa de Leads já diagnosticados (re-diagnosticar cria as Dores).

## Relacionadas
F002 (quando), F009 (SITE_AGREGADOR), F015 (tenant), F005 / F011 / F012 / F013
(consumers), F003 (score ainda no Diagnóstico).
