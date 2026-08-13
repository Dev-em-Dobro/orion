# F037 — Ranking de Builders do mês

## Status
Aprovada — 2026-08-13. As duas questões que bloqueavam foram resolvidas no
mesmo dia:

1. **"Builder" entrou na linguagem ubíqua** — o
   [domain model](../01-domain-model.md) declara Aluno e Builder como a mesma
   entidade (`User`) com escopos diferentes: Aluno é o que a pessoa **tem**,
   Builder é como ela **aparece** para as outras. `Builder` não vira nome de
   tabela nem de campo.
2. **A Política de Privacidade ganhou a cláusula de dado publicado** — nome de
   exibição + número de vendas do mês, com base legal no **consentimento**
   (LGPD art. 7º, I) e revogação imediata e retroativa.

## Objetivo
Criar um motivo social pra o aluno **registrar a venda no Orion**. Hoje marcar
um Lead como `ganho` não devolve nada — o dado morre num contador de dashboard
que só ele vê. O ranking transforma esse registro em posição pública mensal, e
os 3 primeiros de cada mês ganham prêmio.

Reseta todo mês de propósito: quem ficou em 1º em agosto começa setembro do
zero, então a disputa nunca fica decidida e um aluno novo pode ganhar no
primeiro mês.

> **O objetivo real é o registro, não o prêmio.** Sem venda registrada o Orion
> não sabe o que funcionou — o funil da [F010](F010-dashboard-funil.md) e as
> taxas de conversão dependem de o aluno fechar o ciclo. O prêmio paga esse
> custo de registro.

## Decisão: sem entidade nova — venda é `Lead.status = ganho`

O aluno "declara a venda" **marcando o Lead como ganho**, que é o que a
[F006](F006-follow-up-e-funil.md) já faz. Não entra tabela de "venda declarada".

Uma entidade separada criaria **duas verdades** sobre a mesma coisa: um aluno
com 4 Leads `ganho` e 2 vendas declaradas estaria certo em qual dos números? E
o dashboard, o funil e as taxas de conversão leriam o quê? O mesmo raciocínio
da [F035](F035-planos-e-limites.md) ao derivar plano de entitlement em vez de
criar coluna em `User`.

**Consequência aceita:** venda que não veio de um Lead do Orion (indicação,
boca-a-boca) **não entra no ranking**. Isso é coerente com o objetivo — o
ranking existe pra premiar quem usa o motor, não pra medir faturamento.

## Decisão: sem cron — a competência é derivada

`Lead.status_em` já guarda **quando o status atual foi assumido**
([F024](F024-estado-do-lead-reversivel.md)). Um Lead conta pro mês X se está
`ganho` e o `status_em` cai em X, no fuso `America/Sao_Paulo` — a mesma
`competenciaDe()` do medidor da F035.

Então "reseta todo mês" não é job: é `where`. E de graça isso dá **histórico** —
o ranking de qualquer mês passado é a mesma consulta com outra competência.

ADR-002 preservado: nenhum worker, nenhum agendamento.

## Decisão: o ranking é a única leitura cross-tenant do produto

Toda query do Orion é escopada por `user_id` — é a invariante da
[F015](F015-multi-tenant.md), com teste de isolamento. **O ranking quebra isso
por definição**: ele mostra dado de um aluno para os outros.

Isso não é bug, é exceção deliberada, e por isso vem com cerca:

1. Vive numa função única e nomeada (`rankingDoMes`), **fora** de
   `lib/db/scoped`. Não vira helper genérico "sem escopo".
2. Devolve **só** `{ posicao, nomeExibicao, vendas }`. Nunca sai daqui: nome de
   Lead, cidade, nicho, telefone, valor, e-mail, ou qualquer coisa que descreva
   *quem* o aluno vendeu. O que vaza é o placar, não a carteira.
3. Só entra no ranking quem **optou por entrar** (abaixo).

## Consentimento: opt-in, nunca opt-out

Expor nome e desempenho de uma pessoa para outros usuários é tratamento de dado
pessoal. O aluno entra no ranking **só se aceitar**, em `/configuracao`:

- Padrão: **fora**. Quem nunca abriu a configuração não aparece.
- Ao entrar, escolhe o **nome de exibição** (padrão: primeiro nome + inicial do
  sobrenome). Nunca o e-mail, nunca o nome completo por acidente.
- Sair é imediato e retroativo: sai do ranking do mês corrente e dos passados.
- Quem está fora **continua vendo** o ranking e a própria posição — ele só não
  aparece pros outros. Ver o quadro é o que dá vontade de entrar.

Isso muda a `Política de Privacidade`: passa a existir uma categoria de dado
publicado para outros usuários, com base legal no consentimento. **A publicação
do ranking depende dessa atualização.**

## Conceitos

### Builder
Como o aluno aparece publicamente. **É o mesmo `User`** — "Builder" é o nome de
comunidade, não uma entidade nova. Declarado no
[domain model](../01-domain-model.md): Aluno para o que a pessoa tem, Builder
para como ela aparece às outras. Nenhum outro apelido entra junto.

### Venda que conta
Lead do aluno com:
- `status = ganho`
- `status_em` dentro da competência
- **e o Lead precisa ter tido trabalho real** (ver "Antifraude")

### Competência
`AAAA-MM` em `America/Sao_Paulo`, reusando `competenciaDe()` da F035. Às 22h de
31/08 em São Paulo ainda é agosto — sem o fuso, o aluno perderia o fim do mês.

## Antifraude: o problema que prêmio cria

Ranking com prêmio e contador auto-declarado é um convite. Hoje qualquer um
cria um Lead na mão e marca `ganho` — dez vezes, em dois minutos.

Duas camadas, e **nenhuma delas é suficiente sozinha**:

**1. Filtro automático — a venda precisa de rastro.** Só conta o Lead que:
- veio de uma **coleta** (tem `place_id` do Places, não foi digitado), **e**
- tem **Diagnóstico** executado, **e**
- tem **Abordagem com `enviado = true`**

Ou seja: pra fraudar é preciso rodar o fluxo inteiro — gastar cota de coleta e
de diagnóstico, gerar e marcar abordagem. Não impede fraude; encarece.

**2. Conferência humana antes de pagar o prêmio.** O ranking na tela é
informativo. O prêmio sai depois de olhar o funil dos 3 primeiros. A regra
aparece escrita na própria tela — prêmio com critério escondido gera mais
suspeita do que ranking nenhum.

> **O que eu não recomendo:** ranking por **valor** da venda. Não existe campo
> de valor no `Lead`, criar um é dado 100% auto-declarado sem rastro nenhum, e
> aí a fraude fica de graça (basta digitar um número maior). Contagem com as
> três condições acima é o que mais se aproxima de verificável com o que o
> Orion já tem.

## Empate
Ordem: (1) mais vendas; (2) quem chegou **primeiro** à contagem — o
`status_em` da última venda que conta, mais antigo ganha. Determinístico e
explicável: "vocês empataram em 3, ele fechou a terceira antes".

## Modelo de dados

Nenhuma tabela de ranking (é consulta). Só o consentimento:

```prisma
model PerfilPublico {
  user_id       String   @id
  // Aceite explícito de aparecer no ranking. Sem linha = fora.
  ranking_optin Boolean  @default(false)
  // Como o Builder aparece. Nunca derivado do e-mail.
  nome_exibicao String
  optin_em      DateTime?
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt

  user User @relation(fields: [user_id], references: [id], onDelete: Cascade)
}
```

Índice necessário no `Lead` pra consulta cross-tenant ser barata:
`@@index([status, status_em])`.

## Fluxo
1. Aluno marca um Lead como `ganho` (fluxo que já existe).
2. Ao abrir `/ranking`, o Orion agrupa por `user_id` os Leads `ganho` da
   competência que passam no filtro antifraude.
3. Junta com `PerfilPublico` — quem não optou vira "Builder anônimo" na
   contagem de participantes, mas **não** ocupa posição nem aparece nomeado.
4. Ordena, corta o top 10, e calcula a posição do próprio aluno mesmo que ele
   esteja fora do top 10 ou fora do opt-in.

## UI

### `/ranking`
- Pódio dos 3 primeiros do mês corrente, com nome de exibição e nº de vendas.
- Lista do 4º ao 10º.
- **A sua linha, sempre** — "Você: 7º, 2 vendas" — mesmo fora do top 10. Ranking
  onde a pessoa não se acha não engaja.
- Se o aluno está fora do opt-in: a própria posição aparece com aviso "só você
  está vendo isso" + botão pra entrar.
- Seletor de mês (a competência é parâmetro, então o histórico é grátis).
- Regras à vista: o que conta como venda, quando reseta, e que o prêmio passa
  por conferência.

### Sidebar
Item **Ranking** no grupo Prospecção, depois de Tarefas. Sem cadeado: gatilho de
engajamento gateado por plano não engaja ninguém.

### Onde **não** aparece
Não entra no Dashboard. A home acabou de ser reduzida a três perguntas
([F032](F032-interface-do-orion.md)) — "quem está ganhando de mim" não é
nenhuma delas, e competição no meio da fila do dia atrapalha o trabalho.

## Critérios de aceitação
- [ ] **AC1** — Lead `ganho` com `status_em` no mês corrente e com coleta +
      Diagnóstico + Abordagem enviada conta 1 venda.
- [ ] **AC2** — Lead `ganho` **sem** Abordagem enviada (ou sem Diagnóstico, ou
      criado à mão sem `place_id` de coleta) **não** conta.
- [ ] **AC3** — Virada de mês zera o ranking sem job: em 01/09 o quadro de
      setembro está vazio e o de agosto continua consultável.
- [ ] **AC4** — Fuso: venda registrada 31/08 às 22h (São Paulo) conta em
      **agosto**, não em setembro.
- [ ] **AC5** — Aluno **sem** opt-in não aparece pra ninguém: não é listado, não
      ocupa posição, e não vaza nome nem contagem.
- [ ] **AC6** — Aluno sem opt-in **vê** o ranking e a própria posição, com o
      aviso de que só ele a enxerga.
- [ ] **AC7** — Sair do opt-in remove do ranking do mês corrente **e** dos
      meses passados, na hora.
- [ ] **AC8** — `rankingDoMes` devolve **apenas** posição, nome de exibição e
      número de vendas. Teste falha se o retorno passar a incluir qualquer
      campo de Lead, e-mail ou `user_id`.
- [ ] **AC9** — Empate resolve pelo `status_em` mais antigo da última venda que
      conta, de forma estável entre execuções.
- [ ] **AC10** — A posição do próprio aluno aparece mesmo fora do top 10.
- [ ] **AC11** — Reverter um Lead de `ganho` para outro status (F024) tira a
      venda do ranking na hora.
- [ ] **AC12** — A consulta do ranking respeita o teto de queries da F028 com
      200 alunos e 50 mil Leads.

## Decisões de implementação
- `src/lib/ranking/` — `competencia.ts` reusa a da F035; `consultar.ts` tem a
  **única** função cross-tenant; `calcular.ts` puro (ordenação, empate,
  posição), testável com relógio fixo.
- Agregação no banco (`groupBy` por `user_id` sobre o `where` do filtro), não em
  memória: 50 mil Leads não passam pelo Node.
- Sem lib nova → **sem ADR**. A exceção de isolamento é decisão de produto e
  está registrada aqui; se virar padrão, aí sim vira ADR.

## Fora do escopo (F037)
- Prêmio dentro do app (cadastro, entrega, notificação de ganhador). O Orion
  **mostra o quadro**; premiar é processo humano fora do produto.
- Ranking por valor de venda (ver "Antifraude").
- Vendas fora do Orion.
- Ranking por região, nicho ou turma.
- Notificação de mudança de posição (exige cron + e-mail → ADR novo).
- Perfil público do Builder (foto, bio, histórico). Só nome de exibição.

## Custo estimado
Zero de API. Uma consulta agregada por abertura da tela, coberta por índice.
O custo real é de produto: a decisão de abrir uma exceção no isolamento e de
sustentar um prêmio mensal.
