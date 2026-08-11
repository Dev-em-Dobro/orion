# F025 — Fila do dia: triagem, aprofundamento e priorização automáticos

## Status
Implementada — 2026-08-10 · parte do [revamp do fluxo](../10-revamp-do-fluxo.md) (Fase B)

## Objetivo
Fazer a busca **entregar trabalho pronto**, não matéria-prima. Depois de uma
coleta, o Orion deve responder sozinho *"quem eu abordo hoje"* — sem o aluno
clicar Diagnosticar e Priorizar Lead a Lead.

Três partes:
1. **Triagem** — score estimado de **todos** os Leads no instante da coleta,
   sem nenhuma requisição extra.
2. **Aprofundamento automático** — o Orion diagnostica sozinho os melhores da
   triagem, em lotes, com progresso visível.
3. **Fila do dia** — os melhores Leads com score confirmado, prontos pra
   abordagem, no topo da home.

Como consequência, **"Priorizar" deixa de ser um passo manual**: o score é
recalculado sempre que existe Diagnóstico novo.

> Referência da fórmula: [F003](F003-score-e-priorizacao.md). A F025 **não muda
> nenhum peso** do score — muda **quando** e **por quem** ele é calculado.

## Conceitos

### Triagem (novo conceito derivado)
Cálculo do score usando **apenas o que a coleta já trouxe** do Places —
categoria, `num_avaliacoes` e a URL do `website`. Zero rede, zero custo,
milissegundos.

- **Valor**: idêntico à F003 (tier do nicho + porte). Já é exato na triagem —
  os dois insumos vêm do Places.
- **Necessidade estimada**: as mesmas regras da F003, com o que dá pra saber
  sem visitar o site:

| Situação (só pela URL do Places) | Necessidade estimada | Por quê |
|----------------------------------|----------------------|---------|
| Sem `website` | **100** | Idêntico à F003 — é fato, não estimativa |
| `website` é Agregador/perfil social ([F009](F009-sinal-site-agregador.md)) | **100** | `classificarWebsite` é análise de string, roda na triagem |
| `website` começa com `http://` | 20 + 25 + 20 = **65** | Sem HTTPS é fato pela URL; performance desconhecida usa o default 25 da F003 |
| `website` começa com `https://` | 20 + 25 = **45** | Performance desconhecida usa o default 25 da F003 |

- **score estimado** = mesma fórmula final da F003
  (`round(0.55 × Valor + 0.45 × Necessidade)`), gravado em `Lead.score` com
  `Lead.score_estimado = true`.

O ponto: a triagem **acerta 100%** nos Leads sem site e nos de agregador — que
são justamente os de maior Necessidade. Ela só é aproximada em quem tem site
próprio, e é exatamente esse grupo que o aprofundamento resolve.

### Score confirmado
Score calculado a partir de um Diagnóstico real ([F002](F002-diagnostico-de-presenca-digital.md)
+ [F026](F026-sinal-atendimento-automatizado.md)). Grava `score_estimado = false`.
Na UI, score estimado aparece com o sufixo **"~"** e tooltip explicando.

### Fila do dia (novo conceito derivado)
Os `FILA_TAMANHO = 10` melhores Leads **acionáveis agora**:

```
status ∈ { priorizado, enriquecido }      -- já diagnosticado, ainda não abordado
E score_estimado = false                   -- score confirmado
E status ≠ descartado                      -- F024
E não existe Outreach enviada              -- quem já foi abordado vira Tarefa (F031)
ordenado por score desc, status_em asc
```

Não é uma tabela nem uma entidade: é uma **consulta**. Muda sozinha conforme o
aluno trabalha.

## Modelo de dados
```prisma
model Lead {
  // ...
  score_estimado Boolean @default(true)  // F025 — score veio da Triagem
}

enum QuotaOperacao {
  coleta
  diagnostico   // F025 — aprofundamento consome PSI da chave Orion
  proposta
  outreach
  simulador_msg
}
```
Migração: Leads existentes com `score > 0` recebem `score_estimado = false`
(o score deles veio de priorização manual sobre Diagnóstico real); com
`score = 0`, ficam `true`.

## Fluxo

### 1. Coleta com triagem — `coletarLeads` (evolui a [F001](F001-coleta-de-leads.md))
1. Places `textSearch` como hoje.
2. Para cada resultado, calcula a Triagem em memória (`src/lib/score/triagem.ts`).
3. `createMany` grava os Leads **já com `score` e `score_estimado = true`**.
4. Retorna `{ criados, ignorados, comPotencial }`, onde `comPotencial` =
   quantos ficaram com score estimado ≥ `SCORE_QUALIFICADO` (60, da F003).
5. A UI mostra: *"83 Leads coletados · 12 com potencial alto — aprofundando…"*
   e **dispara o aprofundamento automaticamente**.

Custo e tempo idênticos aos de hoje: a triagem é aritmética sobre dados que já
estavam na resposta do Places.

### 2. Aprofundamento em lotes — `aprofundarLote({ limite })`
Roda o Diagnóstico completo dos melhores ainda não diagnosticados. **Em lotes
curtos**, porque o [ADR-002](../04-decisions/ADR-002-sem-workers-fase-1.md)
proíbe workers e uma Server Action não pode ficar minutos aberta.

1. Zod: `limite` ∈ 1..5 (default `LOTE_APROFUNDAMENTO = 3`).
2. Escopo por `user_id`; `verificarCota(userId, 'diagnostico')`.
3. Seleciona os candidatos:
   ```
   score_estimado = true E status = novo E status ≠ descartado
   ordenado por score desc
   take: limite
   ```
4. Roda o Diagnóstico dos candidatos **em paralelo** (`Promise.allSettled`) —
   mesma lógica da F002, mais os sinais da [F026](F026-sinal-atendimento-automatizado.md).
5. Para cada um que deu certo, na mesma transação: grava `Diagnostico`,
   substitui as `Dor`es, recalcula o score (F003) e promove
   `status = priorizado`, `score_estimado = false`, `status_em = now()`.
6. Falha em um Lead **não derruba o lote**: registra `Diagnostico` com o que
   deu (site fora do ar já é diagnóstico válido) e segue.
7. Consome 1 unidade de cota `diagnostico` **por Lead diagnosticado**.
8. Retorna `{ processados, restantes, cotaEsgotada }`.

**Quem chama de novo:** o client component repete a chamada enquanto
`restantes > 0` **e** já não tiver aprofundado `APROFUNDAR_POR_COLETA = 10`
Leads na sessão de coleta — mostrando barra de progresso e um botão
**Parar**. Sem cron, sem worker: é o navegador do aluno segurando o loop, com
cada requisição curta.

**Aprofundar mais:** a lista `/leads` e a Fila do dia ganham o botão
**Aprofundar próximos 10**, que reusa exatamente a mesma action.

### 3. Priorização automática
- `src/lib/score/recalcular.ts` — função única que, dado um `lead_id`, lê o
  último Diagnóstico, aplica a F003 e grava `score` + `score_estimado = false`
  + promove o status quando couber.
- É chamada por: aprofundamento (F025), Diagnóstico manual (F002) e
  re-diagnóstico.
- O botão **Priorizar** **sai da lista** `/leads`. No detalhe do Lead fica
  **Recalcular score**, pra quando o aluno rodar um Diagnóstico novo.
- `status = enriquecido` passa a ser um estado **de passagem** (existe apenas
  se um Diagnóstico foi gravado e o recálculo falhou). Continua válido no
  domínio; deixa de ser o caminho normal.

### 4. Fila do dia na home
`/` passa a abrir com o bloco **"Sua fila de hoje"** acima do funil (F010):
- Card por Lead — o **mesmo componente** da [F032](F032-interface-do-orion.md),
  usado também na lista e no resultado da busca: nome, categoria, score (com
  `~` quando estimado), **Dor principal** (maior severidade), telefone/site e a
  ação primária **Gerar abordagem** (F005/F027).
- Ações secundárias por card: **Descartar** (F024) e abrir o detalhe.
- Estado vazio inteligente:
  - Sem Lead nenhum → "Faça sua primeira busca" (link pra `/leads`).
  - Só Leads não diagnosticados → **"Aprofundar próximos 10"**.
  - Tudo abordado → "Nada na fila. Suas cobranças estão em Tarefas" (F031).

## Critérios de aceitação
- [ ] **AC1** — Coletar 20 Leads grava os 20 com `score > 0` e
      `score_estimado = true`, sem nenhuma chamada a PageSpeed/site, no mesmo
      tempo de resposta da coleta atual.
- [ ] **AC2** — Triagem: Lead sem `website` → Necessidade 100; com
      `http://…` → 65; com `https://…` → 45; com link-in-bio (F009) → 100.
- [ ] **AC3** — Depois da coleta, o aprofundamento dispara sozinho e processa
      até 10 Leads em lotes de 3, com progresso visível e botão Parar
      funcional (parar não deixa registro inconsistente).
- [ ] **AC4** — Lead aprofundado fica com `status = priorizado`,
      `score_estimado = false`, Diagnóstico e Dores gravados, `status_em`
      atualizado — sem nenhum clique manual.
- [ ] **AC5** — Um Lead cujo site está fora do ar não derruba o lote: os outros
      do mesmo lote são diagnosticados normalmente.
- [ ] **AC6** — Cota `diagnostico` esgotada interrompe o aprofundamento com
      mensagem clara e **sem** perder o que já foi processado.
- [ ] **AC7** — A Fila do dia mostra no máximo 10 Leads, ordenados por score
      desc, e exclui: descartados (F024), sem score confirmado, e os que já têm
      Outreach enviada.
- [ ] **AC8** — Descartar um Lead da fila o remove imediatamente e o próximo
      candidato entra no lugar.
- [ ] **AC9** — Score estimado aparece na UI com marcação visual distinta do
      confirmado (sufixo `~` + tooltip).
- [ ] **AC10** — O botão "Priorizar" não existe mais na lista; rodar um
      Diagnóstico manual já deixa o Lead priorizado.
- [ ] **AC11** — Isolamento (F015): o aprofundamento só alcança Leads do
      usuário logado.
- [ ] **AC12** — `src/lib/score/triagem.ts` é função pura (sem Next, sem
      Prisma), testada com os casos da AC2.

## Decisões de implementação
- `src/lib/score/triagem.ts` — pura; reusa `tierDoNicho`, `valor` e
  `calcularScore` já existentes, e `classificarWebsite` (F009).
- `src/lib/score/recalcular.ts` — orquestra Prisma; usada por todas as portas.
- `src/actions/leads/aprofundar.ts` — a Server Action do lote.
- `src/lib/diagnostico/executar.ts` — extrai o corpo do `diagnosticarLead`
  atual pra poder rodar em lote e em paralelo (a action vira casca).
- Concorrência do lote: `Promise.allSettled` com `limite ≤ 5`. Sem biblioteca
  de fila — o teto é o próprio tamanho do lote.
- Sem lib nova → **sem ADR** (o orçamento de tempo por requisição é
  consequência do ADR-002, não uma decisão nova).

## Fora do escopo (F025)
- Worker/cron pra aprofundar em segundo plano (ADR-002) — o loop é do
  navegador, com o aluno vendo.
- Aprofundar **todos** os Leads de uma base grande num clique só (custo de PSI
  e cota; o botão é sempre "próximos 10").
- Mudar pesos, faixas ou o `SCORE_QUALIFICADO` da F003.
- Fila do dia configurável (tamanho, filtros salvos, "só nicho X").
- Re-diagnóstico automático de Leads antigos ("seu Diagnóstico tem 60 dias").

## Custo estimado
Triagem: **$0** (aritmética local). Aprofundamento: 1 PageSpeed + 1 GET no site
por Lead — o mesmo custo do Diagnóstico manual de hoje, só que disparado
automaticamente. Com `APROFUNDAR_POR_COLETA = 10`, uma coleta custa 10 PSI
(dentro da cota gratuita do Google para o volume de um aluno) e é contabilizado
pela nova cota `diagnostico` no modo Orion (F018).
