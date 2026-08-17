# F018 — Limites diários de uso (Orion compartilhado)

## Status
Implementada — 2026-07-27

## Objetivo
Proteger as **chaves compartilhadas da Orion** (modo padrão) com cotas
diárias por aluno e exibir o consumo na UI. O **BYOK**
([F016](F016-configuracao-de-chaves.md)) permanece disponível via toggle — sem
cotas **diárias** no modo BYOK.

> **Atualização 2026-08-10 — [F035](F035-planos-e-limites.md).** A frase
> "preparar upgrade futuro (remover limite via plano pago)" deixou de valer
> assim: os planos **não removem** as cotas diárias, e o **limite mensal de
> plano é ortogonal a esta spec** — ele vale nos **dois** modos, inclusive
> BYOK. Divisão de responsabilidade:
> - **F018 (esta spec)** — cota **diária**, anti-abuso, protege a **chave da
>   Orion**. Não se aplica ao BYOK, porque lá a chave é do aluno.
> - **F035** — limite **mensal** de Leads diagnosticados, por **plano**.
>   Aplica-se sempre, porque mede **valor entregue**, não consumo de API.

## Modos de chave
| Modo | Chaves | Cotas diárias (F018) | Limite mensal de plano (F035) |
|------|--------|----------------------|-------------------------------|
| **Orion** (padrão) | Google + OpenAI do servidor (`ORION_*` env) | Sim | Sim |
| **BYOK** | Chaves do aluno em `UserApiKeys` | Não | **Sim** |

Toggle em `/configuracao` (`key_mode` em `UserApiKeys`).

## Limites (modo Orion)
| Operação | Limite/dia | Quando reserva |
|----------|------------|----------------|
| **Coleta** (`coletarLeads`) | 5 | Antes do Places, depois da validação da busca |
| **Diagnóstico** (`aprofundarLote`, F025) | 50 | Por Lead do lote, depois do teto mensal do plano |
| **Simulador** (`responderTurnoAction`) | 20 | Antes do LLM |
| **Agente** (`POST /api/agente`, F029) | 30 | Por pergunta, antes do LLM e depois do gate de plano |

> **Atualização 2026-08-16 — Proposta e Abordagem saem da cota diária.**
> As duas passam a ser limitadas **só** pelo teto mensal do plano
> ([F035](F035-planos-e-limites.md)). `OPERACOES_COTA` perde `proposta` e
> `abordagem`; as Actions param de chamar `reservarCota`/`estornarCota`.
>
> **Por quê.** A cota diária existe pra pôr teto no consumo da chave da Orion.
> Para essas duas operações esse teto **já existe e é menor**: o mensal do plano
> (Proposta 3/30/60, Abordagem 20/150/300). O pior caso de um Pro num único dia
> passa a ser gastar o mês inteiro das duas — **R$8,75** pelos unitários da
> [11 §3](../11-custos-e-precificacao.md#3-custo-por-operação) — e aí ele não
> repete até virar a competência. A diária não protegia nada; só espalhava o
> mesmo consumo por mais dias.
>
> **O que ela protegia de verdade era o aluno pagante, contra ele mesmo.** Com
> 5/dia contra 30/mês, um Pro precisava de 6 dias pra gastar o que comprou; a
> Abordagem era pior, 5/dia contra 150/mês = **30 dias**, o mês inteiro no talo
> pra receber o que a tabela de `/planos` promete. No Free a diária nunca era
> alcançada (3 Propostas/mês batem muito antes das 5/dia). Ou seja: a única
> pessoa que a trava diária barrava era quem tinha pago pra não ser barrado.
>
> **Coleta e Diagnóstico ficam, e a diferença não é de grau.** O teto mensal
> conta **Lead novo** — duplicata não consome (F035 AC15) — e re-diagnosticar
> não conta de novo. Repetir a mesma busca gasta Places e consome **zero** de
> cota mensal; reprocessar o mesmo Lead gasta PageSpeed do mesmo jeito. Nessas
> duas o mensal **não** é teto de consumo de API, então a diária é a única coisa
> segurando, e sai caro tirar.
>
> **Sem migração.** `QuotaOperacao` mantém os valores `proposta` e `abordagem`
> no banco: enum não referenciado não incomoda, `DROP`/`RENAME` de enum já
> apagou contador nesta base antes (ver a migração
> `20260813200000_outreach_vira_abordagem`), e a feature pode voltar. As linhas
> antigas de `daily_usage` viram dado morto e param de ser lidas — `listarUsoDiario`
> itera `OPERACOES_COTA`, não o enum.

Falhas de validação, ownership, chave ausente ou erro de API **não** consomem —
o que mudou é *como* isso é garantido: a reserva acontece antes e é **estornada**
na falha, em vez de o incremento acontecer só no sucesso. Ver a atualização
abaixo.

> **Atualização 2026-08-13 — [F036](F036-endurecimento-de-seguranca.md) /
> [ADR-017](../04-decisions/ADR-017-reserva-atomica-de-cota.md).** A coluna
> "quando conta" virou **"quando reserva"**, e a diferença é observável.
>
> **Antes:** `verificarCota` lia o contador, a chamada paga rodava, `consumirCota`
> incrementava no fim. Entre a leitura e a escrita cabiam outras requisições do
> mesmo aluno — duas operações simultâneas no último uso do dia passavam as duas.
>
> **Agora:** `reservarCota` incrementa **antes** da chamada externa e
> `estornarCota` devolve a unidade em qualquer caminho de falha, inclusive nos
> `return` de erro ("Lead não encontrado", "Lead sem e-mail", LLM que estourou).
> O saldo final que o aluno vê é o mesmo nos casos normais; o que sumiu foi a
> janela em que dois cliques passavam pelo mesmo teto.
>
> Duas notas que valem pro suporte:
> - **Ordem:** gate de plano ([F035](F035-planos-e-limites.md)) roda **antes** da
>   reserva. Bater no teto mensal não gasta cota diária.
> - **Reserva órfã:** se o processo morrer entre a reserva e o estorno (deploy,
>   timeout de função), o aluno perde 1 unidade até a virada do dia. Aceito no
>   ADR-017.
>
> A tabela também ganhou as linhas **Diagnóstico** (F025) e **Agente** (F029),
> que existiam no código (`LIMITES_DIARIOS`) e nunca tinham sido registradas
> aqui.

## Modelo (schema)
`DailyUsage` — por usuário, data (timezone `America/Sao_Paulo`) e operação:
`user_id`, `data` (date), `operacao` (enum), `contador` (int).
Unique `(user_id, data, operacao)`.

## UI
- Banner/contador em `/leads` (coletas, propostas, abordagens) e `/treino`
  (mensagens do simulador).
- Mensagem amigável ao atingir limite, com menção a upgrade futuro.
- Modo Orion: não exige chaves BYOK; modo BYOK: fluxo F016/F017 inalterado.

## Critérios de aceitação
- [ ] **AC1** — Modo Orion usa `ORION_GOOGLE_API_KEY` na coleta e
      `ORION_OPENAI_API_KEY` nas features de IA.
- [ ] **AC2** — Modo BYOK usa chaves do aluno (F016/F017); sem cotas.
- [ ] **AC3** — Coleta bem-sucedida incrementa contador; 6ª no mesmo dia → erro.
- [ ] **AC4** — Simulador e Agente seguem limites diários próprios.
- [x] **AC4b** (2026-08-16) — Proposta e Abordagem **não** têm cota diária:
      gerar a 6ª Proposta do dia funciona, e o único erro de limite possível
      nessas duas operações é o do teto mensal do plano
      ([F035](F035-planos-e-limites.md)).
- [ ] **AC5** — UI mostra `usado/limite` por operação relevante.
- [ ] **AC6** — Toggle Orion/BYOK persiste e reflete nas próximas actions.
- [x] **AC7** ([F036](F036-endurecimento-de-seguranca.md)) — Operação que falha
      depois da reserva devolve a cota: `usado` volta ao valor anterior à
      tentativa. Vale pra erro de API, erro de validação tardia e retorno de
      erro amigável.
- [x] **AC8** ([F036](F036-endurecimento-de-seguranca.md)) — Aluno barrado pelo
      limite mensal do plano ([F035](F035-planos-e-limites.md)) não tem a cota
      diária debitada.

## Custo estimado (usuário no teto, 30 dias)

> **Recalculado em 2026-08-16.** A tabela antiga derivava tudo da cota diária
> (5/dia × 30 = 150 Propostas/mês). Com Proposta e Abordagem fora da diária,
> o volume delas passa a vir do **plano**, e o teto de Proposta **caiu**: 150/mês
> hipotéticas viraram 30 no Pro. Tirar a trava diária **reduziu** o pior caso.

Custos unitários vêm da [11 §3](../11-custos-e-precificacao.md#3-custo-por-operação)
— **não** da tabela que existia aqui antes. A antiga estimava Proposta em
R$0,15–0,25 e foi escrita em 2026-07-27, antes de existir análise de token; a 11
faz a conta (2.000 in + 800 out em `gpt-4o` = $0,013) e dá **R$0,07**, 3× menos.
Onde as duas divergirem, vale a 11. Câmbio $1 = R$5,50.

| Operação | Teto/mês | De onde vem | Custo ref. |
|----------|----------|-------------|------------|
| Coletas | **150** | 5/dia × 30 (F018) | **$5,25 · R$28,88** (Places) |
| Diagnósticos | 1.500 | 50/dia × 30 (F018) | $0 (PageSpeed é free tier) |
| Abordagens | 150 | mensal do Pro (F035) | **$0** — montada em código |
| Propostas | 30 | mensal do Pro (F035) | **$0** — montada em código |
| Agente (msgs) | 100 | mensal do Pro (F035) | $0,120 · R$0,66 |
| Simulador (msgs) | 300 | mensal do Pro (F035) | $0,108 · R$0,59 |

> **Atualização do fim de 2026-08-16.** Abordagem e Proposta zeraram: as duas
> saíram da IA no mesmo dia em que saíram desta cota
> ([F005](F005-abordagem-whatsapp.md), [F012](F012-gerador-de-proposta.md)).
> Entre a versão da manhã desta tabela e esta, as duas linhas caíram de R$8,75
> para R$0.

**A conta inteira de IA de um Pro no teto é R$1,25/mês** — Agente e Simulador, e
as duas são limitadas pelo plano. Toda a IA que o produto ainda paga cabe em duas
linhas que somam menos que meia coleta.

**O que não tem teto de plano é a Coleta, e a diferença é de 10×.** A
[11 §4](../11-custos-e-precificacao.md#4-custo-por-alunomês) orça **15
requisições** de Places pro Pro ($0,525) — que é o número de buscas necessário
pra trazer 300 Leads novos a 20 por página. Mas o mensal conta Lead **novo**, e
busca repetida não consome cota nenhuma: o teto real é a cota diária, **150
requisições** ($5,25). O aluno que rebusca o mesmo nicho custa 10× o orçado e
não estoura limite nenhum.

Ou seja: no modo Orion, a linha mais cara do produto (R$28,88 no pior caso) é
justamente a única que o plano não limita — e é por isso que a cota diária de
Coleta fica. Se o custo variável apertar, o número pra mexer é esse.

## Fora do escopo (F018)
- Billing/cobrança automática.
- Planos pagos (só mensagem de upgrade futuro).
- Cotas em modo BYOK.
