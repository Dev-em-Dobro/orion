# F035 — Planos e limites de uso

## Status
Proposta — 2026-08-10 · parte do [revamp do fluxo](../10-revamp-do-fluxo.md)
· custos e preços em [11](../11-custos-e-precificacao.md)

## Objetivo
Transformar o Orion de "tudo liberado pra todo aluno" em produto com **planos**:
um **Free** bom o suficiente pra fechar um cliente, e planos pagos que abrem
volume e as features de operação (e-mail, cobrança de follow-up, agente, kanban).

Duas decisões do Ricardo (2026-08-10) que a spec implementa:

1. **O limite vale mesmo em BYOK.** O aluno que traz a própria chave do Google
   continua limitado a **50 Leads/mês no pipeline automatizado** no plano Free.
   O que se vende é o **valor entregue** (Lead qualificado, diagnosticado e com
   abordagem pronta), não o repasse de API.
2. **Follow-up automatizado não entra no Free.** A Central de Tarefas
   ([F031](F031-central-de-tarefas.md)) é do plano pago.

## O que isso contradiz (e a spec corrige)
- A [visão](../00-product-vision.md) diz: *"Modo BYOK — custo de API do aluno,
  **sem cotas F018**"*.
- A [F018](F018-limites-diarios.md) diz: *"BYOK → sem limite diário"*.

Ambas passam a valer só para as **cotas diárias anti-abuso**. O **limite mensal
de plano** da F035 é ortogonal e **se aplica aos dois modos**. As duas specs são
atualizadas junto com esta.

## Conceitos

### Plano
`free` | `pro` | `agencia`. Um por usuário, `free` por padrão.

| | Free | Pro | Agência |
|---|---|---|---|
| Preço (BRL/mês) | R$0 | R$39 | R$97 |
| **Leads diagnosticados/mês** | **50** | 300 | 1.500 |
| Aprofundamento por busca ([F025](F025-fila-do-dia.md)) | 10 | 20 | 20 |
| Outreach WhatsApp (F005) | ✅ | ✅ | ✅ |
| Outreach e-mail ([F027](F027-outreach-por-email.md)) | ❌ | ✅ | ✅ |
| Central de Tarefas ([F031](F031-central-de-tarefas.md)) | ❌ | ✅ | ✅ |
| Funil kanban ([F034](F034-funil-kanban.md)) | ❌ | ✅ | ✅ |
| Agente Orion ([F029](F029-agente-orion.md)) | ❌ | 30/dia | 100/dia |
| Proposta (F012) + Objeções (F011) | 3/mês | sem contador | sem contador |
| Exportar CSV | ❌ | ✅ | ✅ |
| Bônus BYOK | — | +100% de Leads | +100% de Leads |

Os números são **constantes em `src/lib/planos/catalogo.ts`**. Mudá-los é
mudança de produto → editar esta spec antes.

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

## Modelo de dados
```prisma
enum Plano {
  free
  pro
  agencia
}

model UsoMensal {
  id                    String   @id @default(cuid())
  user_id               String
  competencia           String   // "2026-08" (America/Sao_Paulo)
  leads_diagnosticados  Int      @default(0)
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  user User @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([user_id, competencia])
  @@index([user_id])
  @@map("uso_mensal")
}
```
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

### Barra de uso (topo de `/leads` e `/`)
`38 / 50 Leads diagnosticados este mês · Plano Free` + barra. Aos **80%**, muda
de cor e ganha "Ver planos". No limite, vira o estado bloqueado com CTA.

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
- [ ] **AC9** — Free não acessa `/tarefas`, `/funil`, `/agente`, Outreach de
      e-mail nem exportar CSV — **bloqueado no servidor**, não só na UI.
- [ ] **AC10** — Feature bloqueada aparece com cadeado (não some) e leva a
      `/planos`.
- [ ] **AC11** — Entitlement de `pro` chegando pelo webhook (F019) libera as
      features **sem** o aluno precisar deslogar.
- [ ] **AC12** — Contagem correta sob concorrência: dois lotes simultâneos não
      furam o limite (incremento atômico no `upsert`).
- [ ] **AC13** — Isolamento (F015): `UsoMensal` é escopado por `user_id`.

## Decisões de implementação
- `src/lib/planos/catalogo.ts` (limites e features por plano — dado puro),
  `resolver.ts` (entitlements → plano), `medidor.ts` (competência, incremento,
  verificação), `erros.ts` (`LimiteDoPlanoError`, tratado por
  `mensagemEscopo`).
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
