# 01 — Domain Model

Linguagem ubíqua do prospec-dev. **Estes nomes são obrigatórios** em código,
UI, banco, commits e conversas. Sinônimos quebram a comunicação e devem
ser evitados — ver glossário no fim.

---

## Entidades

### Lead
Estabelecimento coletado da Google Places API. É a unidade central de trabalho.

| Campo         | Tipo                                                                            | Notas |
|---------------|---------------------------------------------------------------------------------|-------|
| `id`          | string (cuid)                                                                   | PK |
| `nome`        | string                                                                          | Nome do estabelecimento |
| `endereco`    | string                                                                          | Endereço formatado |
| `telefone`    | string \| null                                                                  | Quando exposto pelo Places |
| `website`     | string \| null                                                                  | URL do site (se houver) |
| `categoria`   | string                                                                          | Categoria primária do Places (`primaryType`) |
| `nota`        | float \| null                                                                   | Avaliação média no Google (0–5), quando exposta |
| `num_avaliacoes` | int \| null                                                                  | Nº de avaliações no Google — proxy de porte/movimento |
| `place_id`    | string                                                                          | ID estável do Google Places; único **por usuário** (`unique(user_id, place_id)` — [F015](02-features/F015-multi-tenant.md)) |
| `user_id`     | string                                                                          | FK → User (auth). Isolamento multi-tenant ([F015](02-features/F015-multi-tenant.md) / [ADR-008](04-decisions/ADR-008-multi-tenant.md)) |
| `email`       | string \| null                                                                  | E-mail comercial publicado no site do próprio Lead ([F027](02-features/F027-abordagem-por-email.md) / [ADR-016](04-decisions/ADR-016-leitura-do-site-do-lead.md)) |
| `email_origem`| enum: `site` \| `manual` \| null                                                 | Como o `email` chegou ([F027](02-features/F027-abordagem-por-email.md)) |
| `status`      | enum: `novo` \| `enriquecido` \| `priorizado` \| `contatado` \| `respondeu` \| `qualificado` \| `proposta` \| `ganho` \| `perdido` \| `descartado` | Estado no funil. Visualizado pela [F010](02-features/F010-dashboard-funil.md); `descartado` vem da [F024](02-features/F024-estado-do-lead-reversivel.md) |
| `status_em`   | datetime                                                                        | Quando o `status` atual foi assumido. Base das cobranças da [F031](02-features/F031-central-de-tarefas.md) ([F024](02-features/F024-estado-do-lead-reversivel.md)) |
| `motivo_descarte` | string \| null                                                              | Por que o aluno descartou (≤ 140 chars) — [F024](02-features/F024-estado-do-lead-reversivel.md) |
| `score`       | int 0–100                                                                       | Combina **Necessidade** (Dores/Diagnóstico) e **Valor** (nicho + porte). Ver [F003](02-features/F003-score-e-priorizacao.md) |
| `score_estimado` | bool                                                                         | `true` enquanto o score vem da **Triagem** (sem Diagnóstico); `false` quando é confirmado ([F025](02-features/F025-fila-do-dia.md)) |
| `created_at`  | datetime                                                                        | |
| `updated_at`  | datetime                                                                        | |

**Estados (`status`):**
- `novo` — recém-coletado, ainda sem Diagnóstico
- `enriquecido` — Diagnóstico executado (a transição ocorre na F002;
  a detecção de Dores soma-se ao mesmo passo a partir da F004)
- `priorizado` — score calculado, pronto pra abordagem
- `contatado` — Abordagem enviada manualmente
- `respondeu` — Lead respondeu (positivo ou negativo), mas ainda sem qualificação
- `qualificado` — respondeu **e** foi qualificado na conversa: há fit, verba e
  intenção (qualificação de venda). Não confundir com "Lead pronto" — o critério
  pré-contato da [visão](00-product-vision.md); ver glossário.
- `proposta` — proposta/orçamento enviado, aguardando decisão do Lead
- `ganho` — virou cliente (fechou trabalho)
- `perdido` — não fechou (recusou, sumiu, etc.) — pode vir de qualquer estágio pós-`contatado`
- `descartado` — o aluno decidiu que **nunca vale a pena abordar** (fora do
  perfil, rede nacional, já bem servido). Pode vir de qualquer estágio, é
  reversível ("Restaurar") e **não entra** nas taxas de conversão do funil.
  Não confundir com `perdido`: `perdido` é resultado de venda; `descartado` é
  limpeza de base ([F024](02-features/F024-estado-do-lead-reversivel.md))

> A partir da [F025](02-features/F025-fila-do-dia.md), `enriquecido` vira estado
> **de passagem**: o Diagnóstico e o cálculo do score acontecem juntos, então o
> caminho normal é `novo → priorizado`. `enriquecido` permanece válido (um
> Diagnóstico gravado cujo score ainda não foi calculado), só deixa de ser a
> rota comum.

### Diagnóstico
Análise técnica da presença digital de um Lead. 1 Lead pode ter múltiplos
Diagnósticos ao longo do tempo (re-diagnóstico).

| Campo                  | Tipo               | Notas |
|------------------------|--------------------|-------|
| `id`                   | string             | PK |
| `lead_id`              | string             | FK → Lead |
| `user_id`              | string             | FK → User (auth). Isolamento multi-tenant ([F015](02-features/F015-multi-tenant.md)) |
| `tem_site`             | bool               | Verdadeiro se `Lead.website` resolve |
| `site_e_agregador`     | bool               | `true` se o `website` é um **Agregador** link-in-bio ou perfil de rede social usado como site — não é site próprio. Ver [F009](02-features/F009-sinal-site-agregador.md) |
| `performance_mobile`   | int 0–100 \| null  | Score do PageSpeed Insights mobile |
| `tem_https`            | bool \| null       | `null` quando não há site |
| `tempo_carregamento_ms`| int \| null        | Tempo de carregamento medido |
| `atendimento_automatizado` | enum: `detectado` \| `indicios` \| `nao_detectado` \| `nao_avaliado` | Sinal de chatbot/atendente automático, inferido do site público ([F026](02-features/F026-sinal-atendimento-automatizado.md)) |
| `atendimento_evidencia`| string \| null     | O que sustentou a classificação (ex.: `"widget ManyChat"`), ≤ 120 chars |
| `executado_em`         | datetime           | Quando o Diagnóstico rodou |

### Dor
Problema concreto detectado num Lead a partir do Diagnóstico. Um Lead pode
ter várias Dores. É o que justifica a abordagem.

| Campo        | Tipo                                                                                                  | Notas |
|--------------|-------------------------------------------------------------------------------------------------------|-------|
| `id`         | string                                                                                                | PK |
| `lead_id`    | string                                                                                                | FK → Lead |
| `user_id`    | string                                                                                                | FK → User (auth). Isolamento multi-tenant ([F015](02-features/F015-multi-tenant.md)) |
| `tipo`       | enum: `SEM_SITE` \| `SITE_AGREGADOR` \| `SITE_LENTO` \| `SEM_HTTPS` \| `SEM_RESPOSTA_REVIEWS` \| `SEM_ATENDIMENTO_AUTOMATIZADO` \| ... (extensível por spec) | Categoria da Dor (`SITE_AGREGADOR` na [F009](02-features/F009-sinal-site-agregador.md); `SEM_ATENDIMENTO_AUTOMATIZADO` na [F026](02-features/F026-sinal-atendimento-automatizado.md); registro criado na F004) |
| `severidade` | enum: `BAIXA` \| `MEDIA` \| `ALTA`                                                                    | Peso no score |
| `detalhes`   | string                                                                                                | Texto curto explicando a Dor |

### Abordagem

> **Renomeada em 2026-08-13.** Chamava-se **Outreach** — nome que ninguém
> pronunciava em português, então na prática o time dizia "mensagem" e a
> linguagem ubíqua se perdia justamente onde ela mais importa. O model Prisma
> virou `Abordagem`; a **tabela** continua `Outreach` via `@@map`, porque nome
> físico não é lido por ninguém e renomear tabela é migração destrutiva.

Abordagem gerada via Claude API pra um Lead. Pode haver várias Abordagens por
Lead (canais diferentes, reescritas, etc.). Nem toda Abordagem é uma *mensagem*:
no canal `ligacao` o `conteudo` é um **roteiro pra falar**, não um texto pra
enviar ([F038](02-features/F038-abordagem-por-voz.md)).

| Campo        | Tipo                            | Notas |
|--------------|---------------------------------|-------|
| `id`         | string                          | PK |
| `lead_id`    | string                          | FK → Lead |
| `user_id`    | string                          | FK → User (auth). Isolamento multi-tenant ([F015](02-features/F015-multi-tenant.md)) |
| `canal`      | enum: `whatsapp` \| `ligacao` \| `email` | Canal-alvo. `ligacao` é o **roteiro falado** da [F038](02-features/F038-abordagem-por-voz.md) — o aluno lê na ligação ou grava como áudio; o Orion nunca disca nem envia. `email` saiu do produto na [F035](02-features/F035-planos-e-limites.md) e o valor sobrevive só pelos registros antigos |
| `assunto`    | string \| null                  | Assunto — só quando `canal = email` ([F027](02-features/F027-abordagem-por-email.md)) |
| `conteudo`   | text                            | Texto final da mensagem (no e-mail, o corpo) |
| `gerado_em`  | datetime                        | |
| `enviado`    | bool                            | Marcado manualmente após envio |
| `enviado_em` | datetime \| null                | Quando `enviado` virou `true` — base da janela de follow-up (F006) |

---

## Relacionamentos

```
User (auth) 1 ─── N Lead
User (auth) 1 ─── N Diagnóstico
User (auth) 1 ─── N Dor
User (auth) 1 ─── N Abordagem
User (auth) 1 ─── 1 UserApiKeys (BYOK / modo Orion — [F016](02-features/F016-configuracao-de-chaves.md), [F018](02-features/F018-limites-diarios.md))
User (auth) 1 ─── N DailyUsage (cotas diárias — [F018](02-features/F018-limites-diarios.md))
User (auth) — `purchase_email`, `purchase_verified_at`, `purchase_product_id` ([F019.1](02-features/F019.1-ativacao-acesso.md))
HublaEntitlement — e-mails autorizados via webhook ([F019](02-features/F019-webhook-hubla.md))
User (auth) 1 ─── N TarefaAdiamento (adiar/dispensar cobrança — [F031](02-features/F031-central-de-tarefas.md))
Lead 1 ─── N Diagnóstico
Lead 1 ─── N Dor
Lead 1 ─── N Abordagem
Lead 1 ─── N TarefaAdiamento
```

Toda entidade de domínio acima é escopada por `user_id` ([F015](02-features/F015-multi-tenant.md)).
`User` é infra de auth ([F014](02-features/F014-autenticacao.md)), não linguagem de negócio.
`UserApiKeys` guarda as chaves do aluno **cifradas** ([ADR-009](04-decisions/ADR-009-cifra-chaves-byok.md))
e o `key_mode` (`orion` | `byok`). `DailyUsage` contabiliza uso diário por
operação no modo Orion; não é linguagem de negócio. `TarefaAdiamento` guarda só
o que o aluno **adiou ou dispensou** — a Tarefa em si é derivada, não
persistida ([F031](02-features/F031-central-de-tarefas.md)).

---

## Conceitos derivados (não são entidades — são cálculos)

Introduzidos pela [F003](02-features/F003-score-e-priorizacao.md) para a
priorização por valor de nicho. São **calculados**, não persistidos (exceto o
`score`, que é gravado no Lead).

- **Necessidade** — quanto o Lead *precisa de dev*. Derivada do Diagnóstico
  (e, a partir da F004, das Dores). Sem site — ou só **Agregador**/perfil social
  ([F009](02-features/F009-sinal-site-agregador.md)) — = necessidade máxima.
- **Valor** — quanto o Lead *vale a pena abordar*. Combina **Tier de nicho**
  e **Porte**.
- **Tier de nicho** — classificação `ALTO` \| `MÉDIO` \| `BAIXO` da `categoria`,
  segundo o [playbook de nichos](05-playbook/nichos-alto-valor.md) (fonte única
  do mapa). Categoria não mapeada → `BAIXO`.
- **Porte** — faixa derivada de `num_avaliacoes`; proxy de movimento e verba.
- **score** = combinação de Necessidade e Valor (fórmula na F003).

Introduzidos pelo [revamp do fluxo](10-revamp-do-fluxo.md) (Fase 3):

- **Triagem** — score calculado **só com o que a coleta trouxe** do Places
  (categoria, avaliações e a URL do site), sem visitar o site e sem custo.
  Produz o *score estimado* (`score_estimado = true`).
  Ver [F025](02-features/F025-fila-do-dia.md).
- **Fila do dia** — os melhores Leads **acionáveis agora**: score confirmado,
  não descartados e ainda não abordados. É uma consulta, não uma tabela
  ([F025](02-features/F025-fila-do-dia.md)).
- **Tarefa** — pendência que o Orion **cobra**: um Lead, um tipo, um prazo
  estourado e uma ação primária (ex.: "abordado há 14h, sem resposta
  registrada"). Derivada do estado atual; some quando o aluno resolve
  ([F031](02-features/F031-central-de-tarefas.md)).

## Aluno e Builder — dois nomes, um `User`

> Adotado em 2026-08-13, junto com a [F037](02-features/F037-ranking-de-builders.md).

São **a mesma pessoa e a mesma entidade** (`User`). O que muda é quem está
olhando:

| Termo | Quando usar | Onde aparece |
|---|---|---|
| **Aluno** | falando da conta, dos dados, dos limites, do isolamento | schema, código, specs, UI de conta e plano |
| **Builder** | falando da pessoa **na comunidade**, publicamente | só onde um aluno vê outro — hoje, o Ranking |

A regra que resolve a ambiguidade: **se o texto é sobre o que a pessoa tem, é
Aluno; se é sobre como ela aparece para as outras, é Builder.** "O aluno tem 60
Leads no mês"; "o Builder está em 2º".

Isto é exceção declarada à regra de sinônimo, não licença: **nenhum outro
apelido** entra. Não existe "usuário", "membro", "player" nem "dev" como
sinônimo de Aluno. E em `schema.prisma` e em nome de variável continua valendo
`User`/`aluno` — `Builder` não vira nome de tabela nem de campo, só de
apresentação.

## Glossário (linguagem ubíqua — alerta contra sinônimos)

| Use                | NÃO use                                                |
|--------------------|--------------------------------------------------------|
| **Lead**           | prospect, contato, empresa, cliente potencial, target  |
| **Diagnóstico**    | análise, auditoria, scan, check                        |
| **Dor**            | problema, issue, oportunidade, gap, pain point         |
| **Abordagem**      | **outreach**, mensagem, copy, contato (no sentido genérico) |
| **score**          | rating, ranking, nota, prioridade (como sinônimo)      |
| **place_id**       | google_id, gid, external_id                            |
| **status `contatado`** | enviado, abordado, prospectado                     |
| **status `qualificado`** | "Lead pronto" (critério pré-contato da visão é coisa distinta) |
| **Lead pronto**    | Lead qualificado (no sentido pré-contato — evitar; "qualificado" agora é status de funil) |
| **status `descartado`** | arquivado, lixo, removido; e **não** use como sinônimo de `perdido` |
| **Triagem**        | pré-diagnóstico, score rápido, estimativa            |
| **Fila do dia**    | lista de hoje, top leads, ranking                    |
| **Tarefa**         | to-do, lembrete, alerta, notificação                 |
| **Dor `SEM_ATENDIMENTO_AUTOMATIZADO`** | "não tem bot" (o sinal é *não detectado*, não *inexistente*) |
| **Aluno** | usuário, membro, cliente (do Orion), dev — ver a seção acima |
| **Builder** | player, competidor, participante; e **não** use fora do contexto público (Ranking) |
| **Ranking de Builders** | leaderboard, placar, top; e não confundir com `score`, que é do Lead |

**Regras:**
- Em **schema Prisma**, **código TS** e **UI**, use os nomes desta tabela.
- Em **commits e PRs**, idem. Ex.: `F003: calcular score do Lead a partir das Dores`.
- Se aparecer necessidade de um conceito novo, crie/atualize esta spec **antes**
  de implementá-lo.
