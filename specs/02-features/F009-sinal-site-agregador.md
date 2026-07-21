# F009 — Sinal: site é Agregador / perfil social (sem site próprio)

## Status
Proposta — 2026-06-13

## Objetivo
Detectar quando o `website` de um Lead **não é um site próprio**, e sim um
**agregador link-in-bio** (Linktree, Beacons, Bio.link, …) ou um **perfil de
rede social** usado como site (instagram.com, facebook.com), e tratar esse caso
como **oportunidade máxima** no score — igual a `SEM_SITE`.

Hoje o motor **enterra** justamente esses Leads: um agregador resolve com
`200`/HTTPS/rápido, então o Diagnóstico (F002) marca `tem_site = true` e a
Necessidade (F003) cai pra ~20 — o fundo da fila. É um **falso positivo** de
`tem_site`. Esta feature corrige e joga esses Leads pro topo.

## Por quê (estratégia)
Um Lead cujo único "site" é um Linktree é o alvo ideal:
- **Não tem site próprio** → projeto do zero, Dor concreta de dev (Necessidade máxima).
- **Já se preocupa com presença digital** (montou link-in-bio, está ativo no
  Instagram) → tem intenção, movimento e, em geral, verba. É um sinal de compra
  *mais quente* que "sem site nenhum" — que pode significar "não liga pra
  internet". E o pitch se escreve sozinho: "vi que vocês usam o Linktree no
  lugar de um site próprio…".

Bate na regra de bolso do [playbook](../05-playbook/nichos-alto-valor.md):
**mirar quem tem Dor real E dinheiro E percebe a perda de cliente.**

## Conceito (linguagem ubíqua)
**Agregador** — campo `site_e_agregador` no Diagnóstico: `true` quando o
`website` do Lead aponta para um **agregador link-in-bio** *ou* para um
**perfil de rede social usado como site**. Nesses casos o Lead **não possui
site próprio**, ainda que a URL resolva. Ver [domain model](../01-domain-model.md).

Plataformas reconhecidas (fonte única: `src/lib/diagnostico/agregador.ts`,
derivada desta spec):

- **Agregadores link-in-bio**: `linktr.ee`, `linktree.com`, `beacons.ai`,
  `bio.link`, `linkin.bio`, `campsite.bio`, `taplink.cc`/`.at`/`.ws`, `solo.to`,
  `msha.ke`, `lnk.bio`, `znap.link`, `many.link`, `manylink.co`, `shor.by`,
  `linkpop.com`, `allmylinks.com`, `hoo.be`, `tap.bio`, `liinks.co`, `about.me`,
  `flow.page`, `direct.me`.
- **Perfil social como site** (escopo desta versão): `instagram.com`,
  `instagr.am`, `facebook.com`, `fb.com`, `fb.me`.

> Promover/rebaixar uma plataforma é mudança de estratégia → **editar esta spec
> antes** do código. `carrd.co` e outros construtores de site de página única
> ficam **de fora de propósito** (a página costuma ser o site real do negócio).

## Input / Saída (UI)
Sem input novo. A detecção roda dentro do **Diagnóstico** (F002), no botão
**Diagnosticar** já existente.

- O resumo do Diagnóstico ganha a variação:
  > *"Diagnóstico concluído: presença só em agregador/rede social — sem site próprio."*
- Na lista `/leads`:
  - a coluna **Website** ganha um chip (`link-in-bio` / `rede social`) quando a
    URL é agregador/social — **mesmo antes de diagnosticar** (a classificação é
    offline);
  - a coluna **Site** (site próprio?) mostra **✗** quando o último Diagnóstico
    tem `site_e_agregador = true`;
  - o desempate de ordenação trata "só agregador" como "sem site próprio"
    (sobe na lista).

## Fluxo
Delta sobre [F002](F002-diagnostico-de-presenca-digital.md) e
[F003](F003-score-e-priorizacao.md) (specs atualizadas com referência a esta).

**No Diagnóstico (F002):**
1. `Lead.website = null` → inalterado (`tem_site = false`, `site_e_agregador = false`).
2. Senão, classifica a URL via `classificarWebsite(website)` (puro, offline):
   - **Agregador/social** → persiste `tem_site = true`, `site_e_agregador = true`,
     `tem_https` = (a URL final usa `https:`), `performance_mobile = null`,
     `tempo_carregamento_ms = null`. **Não** chama `verificarSite` nem o PSI
     (medir a performance de um Linktree não tem valor e gastaria uma chamada).
   - **Caso contrário** → fluxo F002 normal (`verificarSite` + PSI),
     `site_e_agregador = false`.

**No score (F003):**
- `necessidade` retorna **100** quando `!tem_site` **OU** `site_e_agregador`
  (oportunidade máxima — igual a `SEM_SITE`).

## Critérios de aceitação
- [ ] **AC1** — Lead com `website = https://linktr.ee/fulano` → Diagnóstico com
      `site_e_agregador = true`, `tem_site = true`, `performance_mobile = null`;
      **PSI não é chamado**.
- [ ] **AC2** — Lead com `website = https://instagram.com/clinicafulano` →
      `site_e_agregador = true` (perfil social).
- [ ] **AC3** — Lead com site próprio (ex.: `https://clinicafulano.com.br`) →
      `site_e_agregador = false` e fluxo F002 inalterado (verificarSite + PSI).
- [ ] **AC4** — `classificarWebsite` casa subdomínios e `www.`
      (ex.: `fulano.taplink.cc`, `www.instagram.com`) e **não** casa falsos
      positivos (ex.: `meubio.link.example.com`, `carrd.co`).
- [ ] **AC5** — Necessidade de um Diagnóstico com `site_e_agregador = true` é
      **100**. Dentista Tier ALTO, 150 avaliações, só Linktree → `score = 96`
      (mesmo resultado da AC1 da F003 para "sem site").
- [ ] **AC6** — `classificarWebsite` é pura (sem dep de Next/Prisma/rede) e
      testável isoladamente.
- [ ] **AC7** — Na lista `/leads`, Lead com website agregador/social exibe o
      chip mesmo sem Diagnóstico, e aparece acima de Leads de mesmo score com
      site próprio no desempate.

## Decisões de implementação
- `src/lib/diagnostico/agregador.ts` — `classificarWebsite(url)` puro; o mapa de
  plataformas é a fonte única (derivada desta spec). Sem rede, sem lib nova →
  **sem ADR** (compatível com [ADR-002](../04-decisions/ADR-002-sem-workers-fase-1.md)).
- Campo `site_e_agregador Boolean @default(false)` em `Diagnostico`
  (migração **aditiva**, não-destrutiva).
- `TipoDor.SITE_AGREGADOR` adicionado ao enum **já** (data model pronto para a
  F004), mas o **registro de Dor** só é criado quando a F004 entrar.
- F002 e F003 atualizadas com o delta e a referência a esta spec.

## Fora do escopo (F009)
- Criar o registro de **Dor** `SITE_AGREGADOR` → feito na
  [F004](F004-deteccao-de-dor.md) (aqui só o sinal e o score).
- Outras plataformas como "site": TikTok, LinkedIn, YouTube, `wa.me`, Google
  Maps, iFood/delivery — promover por spec se virar caso real (escopo escolhido:
  agregadores link-in-bio + Instagram/Facebook).
- `carrd.co` e outros construtores de site de página única (podem ser o site real).
- Re-classificação/re-diagnóstico automático de Leads antigos.

## Custo estimado
Detecção é cálculo puro **offline**. Além disso **economiza** chamadas ao PSI
(não diagnostica performance de agregador). **$0/mês** — marginalmente negativo
em custo.
