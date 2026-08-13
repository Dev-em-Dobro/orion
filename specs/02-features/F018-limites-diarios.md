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
| **Proposta** (`gerarPropostaAction`) | 5 | Antes do LLM |
| **Abordagem** (`gerarAbordagemAction`) | 5 | Antes do LLM, depois do gate de canal (F035) |
| **Simulador** (`responderTurnoAction`) | 20 | Antes do LLM |
| **Agente** (`POST /api/agente`, F029) | 30 | Por pergunta, antes do LLM e depois do gate de plano |

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
- [ ] **AC4** — Proposta, Abordagem e Simulador seguem limites próprios.
- [ ] **AC5** — UI mostra `usado/limite` por operação relevante.
- [ ] **AC6** — Toggle Orion/BYOK persiste e reflete nas próximas actions.
- [x] **AC7** ([F036](F036-endurecimento-de-seguranca.md)) — Operação que falha
      depois da reserva devolve a cota: `usado` volta ao valor anterior à
      tentativa. Vale pra erro de API, erro de validação tardia e retorno de
      erro amigável.
- [x] **AC8** ([F036](F036-endurecimento-de-seguranca.md)) — Aluno barrado pelo
      limite mensal do plano ([F035](F035-planos-e-limites.md)) não tem a cota
      diária debitada.

## Custo estimado (usuário no teto mensal, 30 dias)
Premissa: uso máximo diário no modo Orion.

| Operação | Volume/mês | Custo ref. |
|----------|------------|------------|
| Coletas | 150 | ~US$5,25 (Places) |
| Abordagens | 150 | ~R$7,50 |
| Propostas | 150 | ~R$22,50–37,50 |
| Simulador (msgs) | 600 | ~R$9,00–18,00 |

**Total aproximado:** ~R$39–63/mês + ~US$5,25/mês em Places por usuário no teto.

## Fora do escopo (F018)
- Billing/cobrança automática.
- Planos pagos (só mensagem de upgrade futuro).
- Cotas em modo BYOK.
