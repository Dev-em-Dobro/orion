# F024 — Estado do Lead reversível (descartar, restaurar, corrigir)

## Status
Implementada — 2026-08-10 · parte do [revamp do fluxo](../10-revamp-do-fluxo.md) (Fase A)

## Objetivo
Tornar o `status` do Lead **reversível e explícito**. Hoje toda transição é de
mão única: priorizar não tem volta, marcar como enviada não tem desfazer, e um
Lead que o aluno decidiu não trabalhar continua ocupando a lista pra sempre.

Três capacidades:
1. **Descartar** um Lead — sai da fila, das contagens do funil e das cobranças,
   mas continua no banco (e não volta na próxima coleta como novidade).
2. **Restaurar** um Lead descartado.
3. **Corrigir o status** manualmente, inclusive **regredindo** (marquei
   `contatado` sem querer; o Lead na verdade nunca foi abordado).

Sem a F024 o aluno paga caro por qualquer clique errado, e a Fila do dia
([F025](F025-fila-do-dia.md)) não teria como tirar um Lead da frente.

## Conceitos

### Novo status: `descartado`
Estado terminal **lateral** — como `perdido`, pode vir de qualquer estágio, mas
significa coisa diferente:

| Status | Significado |
|--------|-------------|
| `perdido` | Foi abordado e **não fechou** (recusou, sumiu). É resultado de venda. |
| `descartado` | **Nunca vale a pena abordar** (fora do perfil, fechou, é franquia grande, aluno não quer). Não é resultado de venda — é limpeza de base. |

`descartado` **não entra** nas taxas de conversão do funil
([F010](F010-dashboard-funil.md)): um Lead descartado nunca esteve na disputa.

### Motivo do descarte
Campo opcional `Lead.motivo_descarte` (texto curto, ≤ 140 chars) — serve pro
aluno lembrar por quê ("já tem site ótimo", "é rede nacional") e alimenta o
Agente Orion ([F029](F029-agente-orion.md)) quando ele explicar a base.

### Correção de status (regressão permitida)
A regra atual (`podeRegistrarDesfecho` em `src/lib/funil.ts`) impede regressão —
por bom motivo: **desfecho** não deve regredir sozinho. A F024 não muda essa
regra; adiciona uma porta separada e explícita, a **correção**:

- Ação distinta (`corrigirStatus`), com UI distinta (select "Corrigir status"
  dentro do detalhe do Lead, não na linha da lista).
- Aceita **qualquer** destino, inclusive anterior ao atual.
- Exige confirmação quando regride ("Isso volta o Lead pra `priorizado`. Os
  registros de Abordagem continuam.").
- **Nunca apaga** Diagnóstico, Dor ou Abordagem — só muda o estado do funil.

### Efeito no `status_em`
Toda mudança de status (por qualquer caminho) grava `Lead.status_em = now()`.
É o campo que a Central de Tarefas ([F031](F031-central-de-tarefas.md)) usa pra
saber há quanto tempo algo está parado. Sem ele, "parado há 3 dias" seria
adivinhação sobre `updated_at`.

## Modelo de dados
```prisma
enum LeadStatus {
  novo
  enriquecido
  priorizado
  contatado
  respondeu
  qualificado
  proposta
  ganho
  perdido
  descartado   // F024
}

model Lead {
  // ...
  status_em       DateTime @default(now())  // F024/F031 — quando o status atual foi assumido
  motivo_descarte String?                   // F024 — opcional, ≤ 140 chars
}
```
Migração: `status_em` faz backfill com `updated_at` (melhor aproximação
disponível); Leads existentes ficam com `motivo_descarte = null`.

## UI

### Na lista `/leads` e na Fila do dia
- Botão **Descartar** (ícone) em cada linha → modal curto com motivo opcional.
- Filtro da lista ganha a opção **Descartados** (default: escondidos).
- Contador de descartados no rodapé do filtro: "12 descartados · ver".

### Na visão de descartados
- Botão **Restaurar** em cada linha → volta pro status anterior ao descarte
  quando ele existir; senão vai pra `priorizado` se tem score confirmado, ou
  `novo` se não tem.
- Ação em lote **Excluir descartados** — apaga de vez (Lead + Diagnósticos +
  Dores + Abordagens em cascata), com confirmação digitando a quantidade.
  É a única exclusão destrutiva da feature, e só alcança descartados.

### No detalhe `/leads/[id]`
- Bloco **Corrigir status**: select com todos os estados + botão. Regressão
  pede confirmação explícita.

## Fluxo

### `descartarLead({ lead_id, motivo? })`
1. Zod (`lead_id` cuid, `motivo` ≤ 140). Escopo por `user_id`
   (`requireLeadOwned`).
2. Guarda `status_anterior` no campo `motivo_descarte`? **Não** — grava
   `status_em = now()` e `status = descartado`; o status anterior fica no
   histórico implícito (ver "Fora do escopo").
3. `revalidatePath('/leads')`.

### `restaurarLead({ lead_id })`
1. Zod + escopo.
2. `status = score_estimado === false ? 'priorizado' : 'novo'`,
   `motivo_descarte = null`, `status_em = now()`.
3. `revalidatePath('/leads')`.

### `corrigirStatus({ lead_id, status })`
1. Zod (`status` ∈ `LeadStatus`) + escopo.
2. `update` direto (sem a trava de `podeRegistrarDesfecho`), `status_em = now()`.
3. `revalidatePath('/leads')` e `/leads/[id]`.

### `excluirDescartados()`
1. Escopo por `user_id`. `deleteMany({ user_id, status: 'descartado' })`
   (cascata cuida dos filhos).
2. Retorna quantos foram excluídos. `revalidatePath('/leads')`.

## Critérios de aceitação
- [ ] **AC1** — Descartar um Lead o remove da lista padrão, da Fila do dia
      (F025) e da Central de Tarefas (F031), sem apagar nada do banco.
- [ ] **AC2** — Lead `descartado` **não** aparece nas contagens nem nas taxas de
      conversão do dashboard (F010).
- [ ] **AC3** — Restaurar devolve o Lead à lista: `priorizado` se ele já tinha
      score confirmado, `novo` caso contrário.
- [ ] **AC4** — Corrigir status aceita regressão (ex.: `contatado` →
      `priorizado`) e mantém Diagnósticos, Dores e Abordagens intactos.
- [ ] **AC5** — Toda mudança de status (descartar, restaurar, corrigir,
      desfecho da F006, promoção automática da F025) grava `status_em`.
- [ ] **AC6** — Uma nova coleta que reencontre um `place_id` descartado **não**
      recria nem "ressuscita" o Lead (o `skipDuplicates` já cobre; o AC garante
      que continua valendo pro estado descartado).
- [ ] **AC7** — "Excluir descartados" só apaga Leads `descartado` do usuário
      logado, exige confirmação e nunca alcança outro tenant (F015).
- [ ] **AC8** — Inputs inválidos ou Lead de outro usuário → `{ erro }`, sem
      efeito colateral.

## Decisões de implementação
- `src/actions/leads/descartar.ts`, `restaurar.ts`, `corrigirStatus.ts`,
  `excluirDescartados.ts` — finas, no padrão das existentes.
- `src/lib/funil.ts`: `descartado` entra em `ESTAGIOS_FUNIL` mas **fora** de
  `FUNIL_VENDA` e de `ESTAGIOS_EM_ABERTO`; `RANK` recebe o mesmo valor terminal
  de `ganho`/`perdido`.
- Um helper único `mudarStatus(tx, lead_id, status)` que sempre escreve
  `status_em` — todas as actions passam por ele (evita esquecer o campo).
- Sem lib nova → **sem ADR**.

## Fora do escopo (F024)
- **Histórico de mudanças de status** (event log). `status_em` guarda só a
  última transição. Histórico completo é pré-requisito das métricas temporais
  que a [visão](../00-product-vision.md) já lista como fora de escopo.
- Descarte em lote por filtro ("descartar todos os de score < 30") — avaliar
  depois da Fila do dia (F025) em uso.
- Desfazer (undo) genérico de qualquer ação.

## Custo estimado
Zero API externa. **$0/mês.**
