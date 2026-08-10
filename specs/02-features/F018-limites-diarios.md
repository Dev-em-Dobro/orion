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
| Operação | Limite/dia | Quando conta |
|----------|------------|--------------|
| **Coleta** (`coletarLeads`) | 5 | Sucesso da action (Leads criados ou ignorados por duplicata) |
| **Proposta** (`gerarPropostaAction`) | 5 | Sucesso com proposta gerada |
| **Outreach** (`gerarOutreachAction`) | 5 | Sucesso com outreach persistido |
| **Simulador** (`responderTurnoAction`) | 20 | Sucesso com resposta da persona |

Falhas de validação, ownership, chave ausente ou erro de API **não** consomem.

## Modelo (schema)
`DailyUsage` — por usuário, data (timezone `America/Sao_Paulo`) e operação:
`user_id`, `data` (date), `operacao` (enum), `contador` (int).
Unique `(user_id, data, operacao)`.

## UI
- Banner/contador em `/leads` (coletas, propostas, outreaches) e `/treino`
  (mensagens do simulador).
- Mensagem amigável ao atingir limite, com menção a upgrade futuro.
- Modo Orion: não exige chaves BYOK; modo BYOK: fluxo F016/F017 inalterado.

## Critérios de aceitação
- [ ] **AC1** — Modo Orion usa `ORION_GOOGLE_API_KEY` na coleta e
      `ORION_OPENAI_API_KEY` nas features de IA.
- [ ] **AC2** — Modo BYOK usa chaves do aluno (F016/F017); sem cotas.
- [ ] **AC3** — Coleta bem-sucedida incrementa contador; 6ª no mesmo dia → erro.
- [ ] **AC4** — Proposta, Outreach e Simulador seguem limites próprios.
- [ ] **AC5** — UI mostra `usado/limite` por operação relevante.
- [ ] **AC6** — Toggle Orion/BYOK persiste e reflete nas próximas actions.

## Custo estimado (usuário no teto mensal, 30 dias)
Premissa: uso máximo diário no modo Orion.

| Operação | Volume/mês | Custo ref. |
|----------|------------|------------|
| Coletas | 150 | ~US$5,25 (Places) |
| Outreaches | 150 | ~R$7,50 |
| Propostas | 150 | ~R$22,50–37,50 |
| Simulador (msgs) | 600 | ~R$9,00–18,00 |

**Total aproximado:** ~R$39–63/mês + ~US$5,25/mês em Places por usuário no teto.

## Fora do escopo (F018)
- Billing/cobrança automática.
- Planos pagos (só mensagem de upgrade futuro).
- Cotas em modo BYOK.
