# F001 — Coleta de Leads via Google Places

## Status
Proposta — 2026-05-27

## Objetivo
Permitir que o operador colete **Leads** novos a partir de uma busca
textual no Google Places, persistindo cada estabelecimento retornado
como um Lead com `status = novo`, deduplicado por `place_id` **do aluno**
(`unique(user_id, place_id)` — [F015](F015-multi-tenant.md)).

É o ponto de entrada do funil: sem F001 não há Lead pra diagnosticar,
priorizar ou abordar.

## Input (UI)
Form simples com dois campos:

| Campo         | Tipo   | Validação                          | Exemplo            |
|---------------|--------|------------------------------------|--------------------|
| `termo`       | string | obrigatório, 2–80 chars            | `barbearia`        |
| `localizacao` | string | obrigatório, 2–80 chars            | `Curitiba PR`      |

A busca enviada à Places API é a concatenação: `"{termo} em {localizacao}"`.

Não há `raio` nesta versão — o Places ajusta o viés geográfico
automaticamente a partir do texto.

## Saída (UI)
Após a operação, exibir contagem:

> *"Busca concluída: N Leads novos criados, M ignorados (já existiam)."*

E redirecionar para `/leads` (lista do aluno, ordenada por `score desc`,
depois `created_at desc` — [F003](F003-score-e-priorizacao.md)).

### Lista `/leads` — filtro e paginação
- **Filtro opcional** por `categoria` via query `?categoria=…` (valores
  distintos dos Leads do tenant; “Todas” = sem filtro).
- **Filtro opcional** por tipo de site via `?site=sem_site|site|link_in_bio|rede_social`
  (alinha à coluna Site da lista; [F009](F009-sinal-site-agregador.md)).
- **Paginação** server-side: **20** Leads por página (`?page=n`, default 1).
  Trocar filtro redefine `page=1`.
- Contador mostra o total **filtrado**; a tabela só a página atual.
- Bloco de follow-up ([F006](F006-follow-up-e-funil.md)) permanece fora da
  paginação/filtro da tabela (todos os pendentes do tenant).
- Toda query escopada por `user_id` ([F015](F015-multi-tenant.md)).

## Fluxo
1. Operador acessa `/leads`, preenche o form, clica em **Coletar**.
2. Server Action `coletarLeads({ termo, localizacao })`:
   1. Valida input com Zod.
   2. Chama `src/lib/places/textSearch(query)` → lista de `PlacesResult`.
   3. Para cada resultado, tenta `prisma.lead.create` com `status = novo`,
      `score = 0`, `user_id` da sessão. Conflito em `(user_id, place_id)`
      (unique por aluno — [F015](F015-multi-tenant.md)) → ignora silenciosamente
      e incrementa `ignorados`.
   4. Retorna `{ criados, ignorados }`.
3. UI mostra mensagem e atualiza a lista.

## Mapeamento Places → Lead
| Lead          | Campo do Places (New)             | Fallback        |
|---------------|-----------------------------------|-----------------|
| `nome`        | `displayName.text`                | obrigatório     |
| `endereco`    | `formattedAddress`                | obrigatório     |
| `telefone`    | `nationalPhoneNumber`             | `null`          |
| `website`     | `websiteUri`                      | `null`          |
| `categoria`   | `primaryType` (ou `types[0]`)     | `"desconhecido"`|
| `nota`        | `rating`                          | `null`          |
| `num_avaliacoes` | `userRatingCount`              | `null`          |
| `place_id`    | `id`                              | obrigatório     |

`nota` e `num_avaliacoes` (adicionados na F003 como sinal de porte) seguem a
mesma regra dos demais: ausentes no objeto do Places → `null`. Não mudam o
SKU cobrado (ver contrato).

Lead criado: `status = novo`, `score = 0`.

Contrato completo da Places API em
[`/specs/03-contracts/google-places.md`](../03-contracts/google-places.md).

## Critérios de aceitação
- [ ] **AC1** — Enviar `termo="barbearia"` + `localizacao="Curitiba PR"`
      cria até 20 Leads novos no banco com `status=novo` e `score=0`.
- [ ] **AC2** — Rodar a mesma busca duas vezes não duplica nenhum Lead
      do aluno (`unique(user_id, place_id)` — [F015](F015-multi-tenant.md)).
      A segunda execução reporta todos como `ignorados`. Outro aluno pode
      coletar o mesmo `place_id`.
- [ ] **AC3** — Cada Lead criado tem `nome`, `endereco`, `categoria`,
      `place_id` preenchidos. `telefone` e `website` podem ser `null`.
- [ ] **AC4** — Resposta 4xx/5xx da Places API é capturada: a Server
      Action retorna `{ erro: string }` e a UI exibe a mensagem sem
      quebrar a aplicação.
- [ ] **AC5** — A página `/leads` lista os Leads do aluno ordenados por
      `score desc`, depois `created_at desc` ([F003](F003-score-e-priorizacao.md)),
      mostrando `nome`, `categoria`, `status`, score e sinais de site.
- [ ] **AC5b** — Filtro opcional por `categoria` (`?categoria=`) limita a
      lista e o total ao valor escolhido; categorias do select = distinct do
      tenant. Sem parâmetro = todas.
- [ ] **AC5b2** — Filtro opcional por tipo de site (`?site=`): `sem_site`,
      `site` (próprio), `link_in_bio`, `rede_social` — coerente com a coluna
      Site / F009. Combinável com categoria.
- [ ] **AC5c** — Paginação de **20** por página (`?page=`); UI com anterior/
      próxima e “página X de Y”. Página além do fim trata-se como última
      (ou equivalente).
- [ ] **AC6** — Chave da Places API é resolvida via BYOK do aluno
      ([F016](F016-configuracao-de-chaves.md)); ausência → erro descritivo na
      Server Action / empty state de Configuração.
- [ ] **AC7** — Validação Zod falha → mensagem específica do campo
      inválido na UI, sem chamar a Places API.

## Decisões de implementação
- Lógica do Places em `src/lib/places/` (sem dep de Next, testável
  isoladamente).
- Server Action em `src/actions/leads/coletar.ts`, fina — só orquestra
  `lib/places` + Prisma.
- Página única em `src/app/leads/page.tsx` (form + lista).
- Lista: `searchParams` `categoria` + `site` + `page`; `skip`/`take` 20;
  distinct de categorias do tenant; filtro de site via hosts F009.
- Sem React Query / SWR — `revalidatePath('/leads')` após a action.

## Fora do escopo (F001)
- Paginação do Places (`nextPageToken`) → eventual F-coleta-v2.
- Place Details → descartado na Fase 1: o Text Search já retorna
  telefone/website na mesma FieldMask (ver F002, Fora do escopo).
- Diagnóstico automático após coleta → F002.
- Filtros além de categoria/site (status, score, busca textual) → futuro.
- Cálculo de score → F003.
- Detecção de Dor → F004.
- Outreach → F005.

## Custo estimado (Places API New, maio/2026)
A FieldMask escolhida (`displayName`, `formattedAddress`, `primaryType`,
`types`, `nationalPhoneNumber`, `websiteUri`) dispara o **SKU Enterprise**
do Text Search — o mais alto. Cobrança é **por request** (não por place
retornado).

| SKU         | Free tier mensal | Após o free tier |
|-------------|------------------|------------------|
| IDs Only    | ilimitado        | grátis           |
| Pro         | 5.000            | $32 / 1.000      |
| **Enterprise** | **1.000**     | **$35 / 1.000**  |

Para um operador solo (~50 buscas/mês), o uso fica confortavelmente
dentro do free tier Enterprise → **$0/mês**. O ponto de inflexão é
1.001 buscas/mês (≈ 33 buscas/dia), bem acima do uso esperado.
