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
| **A — Reservar + estornar (escolhida: a semântica)** | Fecha o vazamento do teto e faz a cota medir *consumo*, não *sucesso*. Custo: uma escrita a mais no caminho de falha |
| B — Manter checar-depois-cobrar | Zero trabalho e o problema continua. O paralelismo da F025 torna o vazamento rotina, não borda |
| C — `SELECT … FOR UPDATE` / advisory lock no par (aluno, operação) | Vira teto rígido, mas serializa operações do mesmo aluno e adiciona uma classe nova de falha (lock esperando por uma chamada de LLM de 20s). Desproporcional pro que se protege |
| **D — Condição no `WHERE`, uma sentença (escolhida: o mecanismo)** | `UPDATE … SET contador = contador + 1 WHERE … AND contador < limite`. Teto rígido sem leitura intermediária. Em `READ COMMITTED` o Postgres **reavalia o `WHERE` contra a versão já commitada** quando duas requisições disputam a linha, então a segunda não atualiza |
| E — Contador em Redis/KV com `INCR` | Atômico e barato, mas é infra nova pra um contador que já vive no Postgres do app. Esbarra em "sem nova lib sem ADR" sem ganho proporcional |
| F — Não estornar, aceitar que falha cobra | Simples e defensável ("a chamada custou"). Recusada porque o aluno não controla a falha: site fora do ar, provider instável e Lead sem e-mail sairiam do bolso dele |

## Implementação (2026-08-13)

A primeira versão (`ec4a822`) usou **transação interativa** com
leitura-e-escrita: `findUnique` → decide no JS → `create`/`update`. Ela move a
cobrança pra antes da chamada paga — a parte que importava —, mas a decisão
continuava saindo de um valor lido antes. Sob paralelismo isso não segura nada.

Medido contra o Postgres local, 8 reservas simultâneas com limite 5, partindo
sem linha do dia:

| Cenário | Transação interativa | Condição no `WHERE` |
|---------|----------------------|---------------------|
| 8 reservas concorrentes, linha inexistente | 5 falham com `P2002`, contador para em **2** | 5 sucessos, 3 `QuotaExcedidaError`, contador **5** |
| 4 reservas com o contador em 2 (teto 5) | as 4 passam, contador **6** | para no teto, contador **5** |
| 1 reserva e 5 estornos simultâneos | contador **−4** | contador **0** |

A terceira linha é a que não estava prevista: o `estornarCota` antigo tinha o
mesmo desenho (`findUnique` → `if (contador <= 0) return` → `update`), então os
cinco estornos liam `1` e todos decrementavam. Contador negativo é **cota de
graça** — `restante` passa a ser maior que o limite até a virada do dia.

O desenho final não tem transação nenhuma: as duas guardas moram no `WHERE`.

```ts
// reserva — o teto
updateManyAndReturn({ where: { …chave, contador: { lt: limite } },
                      data:  { contador: { increment: 1 } } })

// estorno — o piso
updateMany({ where: { …chave, contador: { gt: 0 } },
             data:  { contador: { decrement: 1 } } })
```

Zero linha afetada na reserva significa uma de duas coisas, e elas se
distinguem com uma leitura: **linha existe** → teto batido, lança
`QuotaExcedidaError`; **linha não existe** → primeira operação do dia, faz o
`create`. O `create` ainda pode colidir com `P2002` se duas requisições
estrearem o dia juntas — aí o mesmo `UPDATE` condicional roda de novo e resolve.
A leitura extra existe pra manter o `INSERT` que falha (e polui o log do
Postgres) restrito à corrida de verdade, em vez de acontecer a cada tentativa
acima do teto.

Não precisou de `$queryRaw`: `updateManyAndReturn` do Prisma 6 devolve o
contador novo na mesma sentença.

## Consequências

### Positivas
- **O teto é rígido**: nem clique duplo nem o lote paralelo da F025 passam dele,
  e o contador não fica negativo por estorno concorrente.
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
- **Uma escrita a mais** no caminho de falha. Irrelevante no volume do app —
  e compensada pelo caminho feliz, que saiu de uma transação de duas idas ao
  banco pra uma sentença só.
- **`updateManyAndReturn` é específico do Postgres** no Prisma. O projeto já é
  Postgres-only ([ADR-004](ADR-004-neon-postgres.md)), mas é uma amarra a mais.
- **Duas funções depreciadas** no `index.ts` de `lib/limites`, que precisam
  sumir quando as branches F021–F023 forem retomadas ou descartadas.
- A frase "quando conta" da [F018](../02-features/F018-limites-diarios.md)
  mudou de sentido e a spec precisou ser emendada.
