# ADR-017 — Reservar a cota antes da chamada paga

## Status
Aceita — 2026-08-13. **Registro retroativo**: o código entrou em 2026-08-03
(`ec4a822`), a decisão foi escrita depois. Ver nota de processo na
[F036](../02-features/F036-endurecimento-de-seguranca.md).

## Contexto

A [F018](../02-features/F018-limites-diarios.md) protege as chaves compartilhadas
da Orion com cota diária por aluno. Até aqui a mecânica era **conferir e depois
cobrar**:

```ts
await verificarCota(userId, "coleta");   // lê o contador; lança se estourou
const r = await textSearch(...);         // a chamada paga
await consumirCota(userId, "coleta");    // só agora incrementa
```

A leitura e a escrita eram operações separadas com uma chamada de rede de
segundos entre elas — o desenho clássico de TOCTOU (*time-of-check to
time-of-use*). Duas consequências, ambas observáveis com um aluno só:

1. **O teto vaza.** Duas coletas disparadas juntas no quinto de cinco leem
   `usado = 4`, as duas passam na checagem, as duas chamam o Places. O contador
   termina em 6. Não é ataque coordenado: é o aluno clicando duas vezes, ou o
   `aprofundarLote` rodando o lote em `Promise.allSettled` — paralelismo que a
   própria [F025](../02-features/F025-fila-do-dia.md) prescreve.
2. **Falha silenciosa some da conta.** Se a chamada paga estourava, o
   `consumirCota` nunca rodava. Isso parece bom pro aluno, e é — mas o dinheiro
   já tinha saído do bolso da Orion em metade dos casos (o Places cobra a
   requisição que respondeu 200 com zero resultado; o provider de LLM cobra os
   tokens de entrada de uma chamada que falhou no meio do stream). A cota media
   sucesso, não consumo.

O ponto (1) é o que motivou a mudança. O (2) é o que decidiu o formato dela.

## Decisão

**Reservar antes, estornar na falha.** O par de funções vira:

| Função | Quando | O que faz |
|--------|--------|-----------|
| `reservarCota(userId, op)` | **antes** da chamada paga | incrementa o contador do dia; lança `QuotaExcedidaError` se já está no limite |
| `estornarCota(userId, op)` | em **todo** caminho de falha depois da reserva | decrementa, nunca abaixo de zero |

Regras que fazem parte da decisão:

1. **A ordem é gate de plano → reserva → chamada paga.** O teto mensal de plano
   ([F035](../02-features/F035-planos-e-limites.md)) e o `exigirRecurso` rodam
   **antes** da reserva. Quem é barrado pelo plano não pode perder também a cota
   do dia.
2. **Todo `return` de erro depois da reserva estorna.** Inclusive os que não são
   exceção — "Lead não encontrado", "Diagnostique antes", "Lead sem e-mail". O
   caminho feliz é a exceção, não a regra: qualquer saída que não chegou a
   consumir a API paga devolve.
3. **Estorno nunca derruba a operação.** Chamada em `catch` de erro já tratado,
   com `.catch(() => undefined)` quando o retorno não depende dele. Cota é
   contabilidade; ela não pode transformar um erro legível num 500.
4. **BYOK segue de fora.** As duas funções retornam cedo no modo BYOK, como
   `verificarCota` já fazia — lá a chave é do aluno.
5. **Resposta em streaming estorna no fim do stream.** No endpoint do Agente
   ([F029](../02-features/F029-agente-orion.md)) o `Response` volta antes de a
   geração terminar; o `try/catch` do handler não alcança uma falha no meio. O
   estorno desse caso vive no handler de rejeição da promessa de texto do
   resultado.
6. **Os nomes antigos ficam, depreciados.** `verificarCota` vira alias de
   `reservarCota`; `consumirCota` vira leitura sem efeito. Não sobrou call site
   usando nenhum dos dois — eles existem pra que uma branch antiga que faça
   merge não passe a contar errado em silêncio.

## Alternativas consideradas

| Opção | Avaliação |
|-------|-----------|
| **A — Reservar + estornar (escolhida)** | Fecha o vazamento do teto e faz a cota medir *consumo*, não *sucesso*. Custo: uma escrita a mais no caminho de falha |
| B — Manter checar-depois-cobrar | Zero trabalho e o problema continua. O paralelismo da F025 torna o vazamento rotina, não borda |
| C — `SELECT ... FOR UPDATE` / advisory lock no par (aluno, operação) | Vira teto rígido de verdade, mas serializa operações do mesmo aluno e adiciona uma classe nova de falha (lock esperando por uma chamada de LLM de 20s). Desproporcional pro que se protege |
| D — Uma sentença atômica: `INSERT … ON CONFLICT DO UPDATE … WHERE contador < limite` | **Tecnicamente a melhor.** Teto rígido, sem leitura intermediária, sem colisão de `INSERT`. Exige `$queryRaw` (o `upsert` do Prisma não aceita `WHERE` no conflito). É pra onde a implementação deve ir — ver Limitações |
| E — Contador em Redis/KV com `INCR` | Atômico e barato, mas é infra nova pra um contador que já vive no Postgres do app. Esbarra em "sem nova lib sem ADR" sem ganho proporcional |
| F — Não estornar, aceitar que falha cobra | Simples e defensável ("a chamada custou"). Recusada porque o aluno não controla a falha: site fora do ar, provider instável e Lead sem e-mail sairiam do bolso dele |

## Limitações conhecidas da implementação atual

A implementação de `ec4a822` usa uma **transação interativa** com
leitura-e-escrita (`findUnique` → `create`/`update`). Ela resolve o problema que
motivou o ADR, mas não é a opção D — e a diferença é visível:

1. **O teto ainda pode ser ultrapassado sob concorrência.** A checagem
   `contador >= limite` roda sobre o valor lido no início da transação. Em
   `READ COMMITTED` (padrão do Postgres e do Prisma), N transações simultâneas
   leem o mesmo valor e todas passam na checagem; os `UPDATE` se serializam pelo
   lock de linha, então **nenhum incremento se perde** — o contador fica correto,
   mas pode terminar em `limite + N − 1`. O que a mudança eliminou foi o
   double-spend do mesmo slot, não o overshoot.
2. **Primeira operação do dia em paralelo colide.** Se ainda não existe linha em
   `DailyUsage` pra `(aluno, hoje, operação)`, duas transações simultâneas
   tentam `create` e a segunda bate no unique `(user_id, data, operacao)` →
   erro `P2002`. Ele não é `QuotaExcedidaError`, então em
   `aprofundarLote` — que roda até 5 Leads em paralelo — o Lead afetado
   simplesmente não é processado, sem mensagem. **A colisão é anterior a este
   ADR** (o `consumirCota` antigo tinha o mesmo corpo e também era chamado em
   paralelo), mas continua de pé e agora acontece mais cedo no fluxo.

Ambas somem com a opção D numa sentença só. Enquanto isso não acontece, o que
vale é: a cota é uma **barreira de custo com folga de alguns dígitos sob
paralelismo**, não um teto exato. Quem depender de exatidão — cobrança, por
exemplo — precisa da opção D antes.

## Consequências

### Positivas
- O teto para de vazar no caso comum (clique duplo, lote paralelo da F025).
- A cota passa a medir consumo de API, não sucesso de operação: o aluno não
  paga por site fora do ar nem por provider instável.
- O par reserva/estorno é explícito no call site — dá pra auditar lendo o
  `catch`, sem procurar onde ficou o incremento.

### Negativas / a aceitar
- **Reserva órfã se o processo morrer.** Deploy no meio de uma coleta, timeout
  de função serverless, `SIGKILL`: a reserva já está gravada e o `catch` nunca
  roda. O aluno perde 1 unidade e ela volta na virada do dia. Aceito — a
  alternativa (registro de reservas com expiração) é uma tabela e um varredor
  pra um caso raro que se cura sozinho em horas.
- **Uma escrita a mais** no caminho de falha. Irrelevante no volume do app.
- **Duas funções depreciadas** no `index.ts` de `lib/limites`, que precisam
  sumir quando as branches F021–F023 forem retomadas ou descartadas.
- A frase "quando conta" da [F018](../02-features/F018-limites-diarios.md)
  mudou de sentido e a spec precisou ser emendada.
