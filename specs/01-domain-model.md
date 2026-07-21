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
| `status`      | enum: `novo` \| `enriquecido` \| `priorizado` \| `contatado` \| `respondeu` \| `qualificado` \| `proposta` \| `ganho` \| `perdido` | Estado no funil. Visualizado pela [F010](02-features/F010-dashboard-funil.md) |
| `score`       | int 0–100                                                                       | Combina **Necessidade** (Dores/Diagnóstico) e **Valor** (nicho + porte). Ver [F003](02-features/F003-score-e-priorizacao.md) |
| `created_at`  | datetime                                                                        | |
| `updated_at`  | datetime                                                                        | |

**Estados (`status`):**
- `novo` — recém-coletado, ainda sem Diagnóstico
- `enriquecido` — Diagnóstico executado (a transição ocorre na F002;
  a detecção de Dores soma-se ao mesmo passo a partir da F004)
- `priorizado` — score calculado, pronto pra outreach
- `contatado` — Outreach enviado manualmente
- `respondeu` — Lead respondeu (positivo ou negativo), mas ainda sem qualificação
- `qualificado` — respondeu **e** foi qualificado na conversa: há fit, verba e
  intenção (qualificação de venda). Não confundir com "Lead pronto" — o critério
  pré-contato da [visão](00-product-vision.md); ver glossário.
- `proposta` — proposta/orçamento enviado, aguardando decisão do Lead
- `ganho` — virou cliente (fechou trabalho)
- `perdido` — não fechou (recusou, sumiu, etc.) — pode vir de qualquer estágio pós-`contatado`

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
| `executado_em`         | datetime           | Quando o Diagnóstico rodou |

### Dor
Problema concreto detectado num Lead a partir do Diagnóstico. Um Lead pode
ter várias Dores. É o que justifica o outreach.

| Campo        | Tipo                                                                                                  | Notas |
|--------------|-------------------------------------------------------------------------------------------------------|-------|
| `id`         | string                                                                                                | PK |
| `lead_id`    | string                                                                                                | FK → Lead |
| `user_id`    | string                                                                                                | FK → User (auth). Isolamento multi-tenant ([F015](02-features/F015-multi-tenant.md)) |
| `tipo`       | enum: `SEM_SITE` \| `SITE_AGREGADOR` \| `SITE_LENTO` \| `SEM_HTTPS` \| `SEM_RESPOSTA_REVIEWS` \| ... (extensível por spec) | Categoria da Dor (`SITE_AGREGADOR` definida na [F009](02-features/F009-sinal-site-agregador.md); registro criado na F004) |
| `severidade` | enum: `BAIXA` \| `MEDIA` \| `ALTA`                                                                    | Peso no score |
| `detalhes`   | string                                                                                                | Texto curto explicando a Dor |

### Outreach
Mensagem de abordagem gerada via Claude API pra um Lead. Pode haver várias
Outreaches por Lead (canais diferentes, reescritas, etc.).

| Campo        | Tipo                            | Notas |
|--------------|---------------------------------|-------|
| `id`         | string                          | PK |
| `lead_id`    | string                          | FK → Lead |
| `user_id`    | string                          | FK → User (auth). Isolamento multi-tenant ([F015](02-features/F015-multi-tenant.md)) |
| `canal`      | enum: `whatsapp` \| `email`     | Canal-alvo |
| `conteudo`   | text                            | Texto final da mensagem |
| `gerado_em`  | datetime                        | |
| `enviado`    | bool                            | Marcado manualmente após envio |
| `enviado_em` | datetime \| null                | Quando `enviado` virou `true` — base da janela de follow-up (F006) |

---

## Relacionamentos

```
User (auth) 1 ─── N Lead
User (auth) 1 ─── N Diagnóstico
User (auth) 1 ─── N Dor
User (auth) 1 ─── N Outreach
User (auth) 1 ─── 1 UserApiKeys (BYOK, infra — [F016](02-features/F016-configuracao-de-chaves.md))
Lead 1 ─── N Diagnóstico
Lead 1 ─── N Dor
Lead 1 ─── N Outreach
```

Toda entidade de domínio acima é escopada por `user_id` ([F015](02-features/F015-multi-tenant.md)).
`User` é infra de auth ([F014](02-features/F014-autenticacao.md)), não linguagem de negócio.
`UserApiKeys` guarda as chaves do aluno **cifradas** ([ADR-009](04-decisions/ADR-009-cifra-chaves-byok.md));
não é linguagem de negócio.

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

## Glossário (linguagem ubíqua — alerta contra sinônimos)

| Use                | NÃO use                                                |
|--------------------|--------------------------------------------------------|
| **Lead**           | prospect, contato, empresa, cliente potencial, target  |
| **Diagnóstico**    | análise, auditoria, scan, check                        |
| **Dor**            | problema, issue, oportunidade, gap, pain point         |
| **Outreach**       | mensagem, abordagem, copy, contato (no sentido genérico) |
| **score**          | rating, ranking, nota, prioridade (como sinônimo)      |
| **place_id**       | google_id, gid, external_id                            |
| **status `contatado`** | enviado, abordado, prospectado                     |
| **status `qualificado`** | "Lead pronto" (critério pré-contato da visão é coisa distinta) |
| **Lead pronto**    | Lead qualificado (no sentido pré-contato — evitar; "qualificado" agora é status de funil) |

**Regras:**
- Em **schema Prisma**, **código TS** e **UI**, use os nomes desta tabela.
- Em **commits e PRs**, idem. Ex.: `F003: calcular score do Lead a partir das Dores`.
- Se aparecer necessidade de um conceito novo, crie/atualize esta spec **antes**
  de implementá-lo.
