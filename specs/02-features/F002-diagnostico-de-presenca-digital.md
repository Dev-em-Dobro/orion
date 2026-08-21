# F002 — Diagnóstico de Presença Digital

## Status
Proposta — 2026-06-10

## Objetivo
Executar o **Diagnóstico** de um Lead individual: verificar se o site
existe e responde, medir HTTPS, tempo de carregamento e performance
mobile (PageSpeed Insights), e persistir o resultado como um registro de
`Diagnostico`. Lead com `status = novo` é promovido a `enriquecido`.

O Diagnóstico usa o `website` já presente no Lead (coletado na F001 —
o Text Search retorna `websiteUri` na mesma FieldMask; consultar o
Place Details aqui seria redundante, ver Fora do escopo).

Sem F002 não há base factual para detectar Dores (F004) nem calcular
score (F003). É o segundo passo do funil.

> **Delta F009** — esta spec foi estendida pela
> [F009](F009-sinal-site-agregador.md): antes de medir o site, o Diagnóstico
> classifica o `website`. Se for **Agregador** link-in-bio ou perfil social
> (não é site próprio), grava `site_e_agregador = true` e **não** chama
> `verificarSite` nem o PSI. Ver Fluxo passo 2.3, Regras de medição e AC10.

> **Delta F036 (2026-08-13)** — o GET do `verificarSite` passou a recusar
> destinos que não sejam **host público**: o Diagnóstico não pode virar o meio
> de o servidor buscar rede interna. Ver "Hosts permitidos" abaixo, AC11 e a
> [F036](F036-endurecimento-de-seguranca.md).

## Input (UI)
Botão **Diagnosticar** em cada linha da lista em `/leads`. Sem form.

Input da Server Action:

| Campo     | Tipo   | Validação                 |
|-----------|--------|---------------------------|
| `lead_id` | string | obrigatório, cuid válido  |

## Saída (UI)
Após a operação, exibir resumo:

> *"Diagnóstico concluído: site ok · HTTPS ok · performance mobile 43."*

Variações: `"sem site"`, `"site fora do ar"`, `"performance indisponível"`,
`"presença só em agregador/rede social — sem site próprio"` (F009).

A lista em `/leads` passa a exibir, por Lead, dados do **último**
Diagnóstico (quando houver): site (✓/✗), HTTPS (✓/✗/—),
`performance_mobile` (n/—) e `executado_em`.

## Fluxo
1. Operador clica em **Diagnosticar** na linha do Lead.
2. Server Action `diagnosticarLead({ lead_id })`:
   1. Valida input com Zod. Lead inexistente → `{ erro: "Lead não encontrado" }`.
   2. Se `Lead.website` é `null` → persiste `Diagnostico` com
      `tem_site = false` e demais campos `null`. Não chama PSI. Fim.
   3. Senão, **classifica a URL** via `src/lib/diagnostico/classificarWebsite(url)`
      ([F009](F009-sinal-site-agregador.md) — puro, offline):
      1. **Agregador link-in-bio ou perfil social** → persiste `Diagnostico` com
         `tem_site = true`, `site_e_agregador = true`, `tem_https` = (a URL usa
         `https:`), `performance_mobile = null`, `tempo_carregamento_ms = null`.
         **Não** chama `verificarSite` nem o PSI (segue pro passo 5). Fim da medição.
      2. **Caso contrário** (`site_e_agregador = false`) → chama
         `src/lib/diagnostico/verificarSite(url)`:
         GET com `fetch` nativo, timeout **10s**, seguindo até **5 redirects**.
      - Resolve com status `< 400` → `tem_site = true`,
        `tempo_carregamento_ms` = duração total do GET (até o corpo da URL
        final), `tem_https` = URL **final** usa `https:`.
      - Timeout, erro de DNS/TLS ou status `>= 400` → `tem_site = false`,
        demais campos `null`. Não chama PSI.
   4. Se `tem_site = true`, chama
      `src/lib/pagespeed/performanceMobile(urlFinal)` → score 0–100.
      Timeout **30s**. Qualquer falha do PSI → `performance_mobile = null`
      (não aborta o Diagnóstico).
   5. Persiste o `Diagnostico` (novo registro — histórico, nunca update).
   6. Se `Lead.status = novo` → atualiza para `enriquecido`. Qualquer outro
      status permanece inalterado (re-diagnóstico não regride o funil).
   7. Retorna `{ tem_site, tem_https, performance_mobile, tempo_carregamento_ms }`.
3. UI mostra o resumo e atualiza a lista (`revalidatePath('/leads')`).

## Regras de medição

| Campo                   | Regra |
|-------------------------|-------|
| `tem_site`              | `true` sse `Lead.website` não-nulo **e** (é Agregador/social — F009 — **ou** o GET resolve com status `< 400` em até 10s) |
| `site_e_agregador`      | `true` sse `classificarWebsite(website)` aponta Agregador link-in-bio ou perfil social (F009). Aí `tem_site = true`, mas não há site próprio e o PSI **não** roda |
| `tem_https`             | `null` se `tem_site = false`; senão `true` sse a URL **final** (pós-redirects) usa `https:`. Site `http://` que redireciona pra `https://` conta como `true` |
| `tempo_carregamento_ms` | Duração total do GET (request → corpo recebido) da URL original até a final; `null` se `tem_site = false` |
| `performance_mobile`    | `lighthouseResult.categories.performance.score × 100`, arredondado; `null` se sem site ou PSI falhar |

## Hosts permitidos (F036 — anti-SSRF)

O `website` vem do Google Places, mas **quem escolhe a URL final é o redirect**:
o `verificarSite` segue até 5 saltos. Um site que responde
`302 → http://169.254.169.254/` faz o servidor buscar o endpoint de metadata da
nuvem. Por isso a validação roda **antes de cada `fetch` do laço**, não só na
URL de entrada.

`urlPermitidaParaFetch(url)` recusa:

| Recusa | Exemplo |
|--------|---------|
| Protocolo fora de `http:`/`https:` | `file:///etc/passwd` |
| Usuário/senha embutidos | `http://a:b@host` |
| Porta diferente de 80/443 | `http://host:6379` |
| Host de loopback/descoberta | `localhost`, `*.localhost`, `*.local`, `*.internal`, `metadata.google.internal` |
| IP literal privado | `127.*`, `10.*`, `172.16–31.*`, `192.168.*`, `169.254.*`, `0.0.0.0`, `::1`, `fc*`, `fd*`, `fe80*` |
| Hostname cujo DNS resolve pra IP privado | `interno.exemplo.com → 10.0.0.5` |
| DNS que falha ou devolve lista vazia | domínio morto |

A resolução usa `all: true` e exige que **todos** os registros sejam públicos —
um único A privado reprova o host.

**Efeito no Diagnóstico:** URL recusada é tratada como site que não resolve —
`tem_site = false`, demais campos `null`, PSI não é chamado. Sem mensagem
específica na UI, de propósito: não há ação do aluno pra "o site do Lead aponta
pra rede interna".

## Duração da operação
Pior caso: ~10s (site) + ~30s (PSI) ≈ **40s**, levemente acima da
guideline de 30s da visão de produto. Aceito porque: é raro (mediana do
PSI ≈ 15s), a operação é por Lead individual e disparada manualmente.
Se incomodar na prática, reduzir o timeout do PSI via spec.

## Critérios de aceitação
- [ ] **AC1** — Lead com site funcional em HTTPS → `Diagnostico` criado com
      `tem_site = true`, `tem_https = true`, `tempo_carregamento_ms > 0` e
      `performance_mobile` entre 0 e 100.
- [ ] **AC2** — Lead com `website = null` → `Diagnostico` com
      `tem_site = false` e demais campos `null`; PSI **não** é chamado.
- [ ] **AC3** — Site fora do ar (timeout, DNS inválido ou status `>= 400`) →
      `Diagnostico` com `tem_site = false`, sem quebrar a aplicação.
- [ ] **AC4** — Falha ou timeout do PSI → `Diagnostico` criado normalmente
      com `performance_mobile = null` e demais campos preenchidos.
- [ ] **AC5** — Lead `status = novo` passa a `enriquecido` após o
      Diagnóstico. Lead em qualquer outro status (ex.: `contatado`) mantém
      o status.
- [ ] **AC6** — Re-executar o Diagnóstico cria um **novo** registro
      (histórico preservado, 1 Lead — N Diagnósticos).
- [ ] **AC7** — Ausência de `PAGESPEED_API_KEY` → Server Action retorna
      erro descritivo (`"PAGESPEED_API_KEY não configurada"`) sem chamar
      API alguma.
- [ ] **AC8** — `lead_id` inválido (Zod) ou inexistente → `{ erro }`
      específico na UI, sem chamadas externas.
- [ ] **AC9** — A lista `/leads` exibe site/HTTPS/performance/data do
      último Diagnóstico de cada Lead; Leads sem Diagnóstico exibem "—".
- [ ] **AC10** (F009) — Lead com `website` Agregador/social →
      `Diagnostico` com `site_e_agregador = true`, `tem_site = true`,
      `performance_mobile = null`; **PSI e `verificarSite` não são chamados**.
      Ver [F009](F009-sinal-site-agregador.md).
- [x] **AC11** (F036) — URL que aponta pra `localhost`, IP privado, link-local,
      porta fora de 80/443 ou host cujo DNS resolva pra IP privado **não é
      buscada**, em nenhum salto da cadeia de redirects. Resultado:
      `tem_site = false`, sem chamada ao PSI e sem erro na tela.

## Decisões de implementação
- `src/lib/pagespeed/performanceMobile.ts` — cliente PSI, sem dep de Next
  (contrato em
  [`/specs/03-contracts/pagespeed-insights.md`](../03-contracts/pagespeed-insights.md)).
- `src/lib/diagnostico/verificarSite.ts` — `fetch` nativo +
  `AbortController`; mede tempo e resolve URL final. Sem lib nova
  (sem ADR necessário). Exporta também `urlPermitidaParaFetch` (F036), a guarda
  de host chamada dentro do laço de redirects — `node:dns/promises` e
  `node:net`, ambos nativos.
- Server Action em `src/actions/leads/diagnosticar.ts`, fina — orquestra
  `lib/` + Prisma.
- Variável de ambiente: `PAGESPEED_API_KEY` (pode ser a mesma chave
  Google Cloud da F001, com a PageSpeed Insights API habilitada).
- Query do último Diagnóstico na lista: `diagnosticos` ordenado por
  `executado_em desc`, `take: 1` (include do Prisma).

## Fora do escopo (F002)
- Atualização de `telefone`/`website` via Place Details antes do
  Diagnóstico — redundante na Fase 1: o Text Search da F001 já coleta
  esses campos com a mesma FieldMask. Só agregaria frescor em
  re-diagnósticos de Leads antigos; se isso virar caso real, adicionar
  por spec (ex.: consultar Place Details quando o Lead tiver +30 dias).
- Detecção de Dor a partir do Diagnóstico → F004.
- Cálculo de score → F003.
- Diagnóstico em lote ("diagnosticar todos os novos") → exigiria fila ou
  long-running job; conflita com ADR-002 (sem workers na Fase 1).
- Coleta de reviews/respostas (base da Dor `SEM_RESPOSTA_REVIEWS`) →
  spec futura, FieldMask própria.
- Página de detalhe do Lead com histórico de Diagnósticos → F-listagem.
- Análise de conteúdo do site (SEO, responsividade via parsing, etc.).
- Re-diagnóstico automático/agendado.

## Custo estimado (junho/2026)
| API                | Free tier      | Após o free tier | Uso esperado          |
|--------------------|----------------|------------------|------------------------|
| PageSpeed Insights | 25.000 req/dia | — (gratuita)     | ~200 diagnósticos/mês |

A F002 não consome nenhuma API paga (o GET ao site do Lead é uma request
HTTP comum) → **$0/mês** em qualquer volume realista.
