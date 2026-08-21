# Referências — Dossiê de Concorrentes

## Status
Pesquisa — snapshot 2026-07-11 (ver [metodologia](README.md#metodologia-e-limitações-desta-pesquisa))

## Como ler
Cada ferramenta tem: **o que é**, **modelo/preço**, **pontos positivos**,
**pontos negativos** e **relevância pro prospect-engine** (o que copiar, o que
evitar). No fim: [tabela comparativa](#tabela-comparativa) e
[o que tirar disto](#o-que-tirar-disto-pro-prospect-engine).

---

## 1. Apollo.io
`https://www.apollo.io/` — Sales intelligence + engagement platform (EUA, global).

### O que é
Plataforma "tudo-em-um" de vendas B2B: base de dados de contatos + prospecção +
sequências de abordagem multicanal + discador + enriquecimento + mini-CRM. Vende
a ideia de **substituir 5 ferramentas** (provedor de dados, plataforma de
abordagem, discador, enriquecimento e CRM). Base própria: **230M+ contatos** e
**30M+ empresas**.

### Modelo e preço (snapshot jul/2026)
Freemium, cobrança **por assento**, sistema de **créditos** (e-mail, export,
telefone móvel).

| Plano | Preço (anual) | Créditos/ano | Destaques |
|-------|---------------|--------------|-----------|
| Free | US$ 0 | ~900 | Busca básica, extensão Chrome; sem sequências/discador |
| Basic | ~US$ 49/mês/assento (US$ 588/ano) | ~30.000 | Sequências, A/B, sync CRM básico |
| Professional | ~US$ 79/mês/assento (US$ 948/ano) | ~48.000 | Discador EUA, waterfall enrichment, intent |
| Organization | ~US$ 119/mês/assento (mín. 3 assentos) | ~72.000 | SSO, papéis custom, analytics avançado |

Add-ons: créditos avulsos ~US$ 0,20 cada (mín. 250); número móvel consome 5–10
créditos por lookup; **créditos expiram mensalmente, sem rollover**.

### Pontos positivos
- **Base enorme** (230M+ contatos) com um dos conjuntos de filtros mais
  profundos da categoria — bom para segmentação B2B fina.
- **Consolidação real**: dados + abordagem + discador + CRM leve num lugar só;
  cases citam +70% de leads, 4× eficiência de SDR e −64% de custo de stack.
- **Extensão Chrome** que puxa leads verificados direto do LinkedIn.
- Integrações limpas com **HubSpot e Salesforce**.
- Freemium generoso (900 créditos/ano sem cartão) — dá pra testar de verdade.
- Compliance forte: GDPR, SOC 2, CCPA, ISO 27001, etc. Ratings altos em
  G2 (~4.7) e Capterra (~4.5).

### Pontos negativos
- **Acurácia dos dados superestimada** — a dor nº 1 nas reviews. Testes
  independentes apontam **65–70% de acerto** (não os números anunciados);
  **32–38% de bounce** em exports ditos "verificados" em alguns testes.
- **Dados fracos em LATAM e APAC**: cargos desatualizados e telefones inválidos
  — exatamente as regiões que interessam a um operador no Brasil.
- **Telefones caros e ruins** (5–10 créditos por número, muitos incorretos).
- Créditos **expiram todo mês sem acumular** → pressão de uso ou desperdício.
- Interface **densa/complexa** no começo; app pode travar em listas grandes.
- Trustpilot **2.9/5** (1.049 reviews): reclamações de cobrança, suspensão de
  conta e suporte lento — descompasso grande vs. G2/Capterra.
- **Foco em contato B2B corporativo**, não em negócio local (dentista, clínica,
  advogado de bairro) — o ICP do prospect-engine mal aparece na base.

### Relevância pro prospect-engine
Concorrente **indireto**. Referência de **UX de filtros** e de **abordagem
multicanal**, mas o ICP é outro (B2B corporativo global vs. local BR). A lição
principal é o **anti-padrão de acurácia**: prometer "verificado" e entregar 70%
queima confiança. O prospect-engine, usando **dado público do Google Places** e
**diagnóstico real**, deve prometer só o que entrega. LGPD e custo (US$ 588+/ano)
também o tornam inviável como ferramenta pessoal barata.

---

## 2. Leads Per Hour (LPH)
`https://leadsperhour.com/` — Infra de agentes de IA para vendas B2B (Brasil/LatAm).

> ⚠️ **Cuidado com o nome.** Apesar de "Leads Per Hour" soar como extrator de
> Maps, **não é** um scraper. É uma plataforma de **agentes de IA para times de
> vendas**, nativa em **português BR**. Confirmado na página oficial (2026-07-11).

### O que é
Plataforma que cobre o "ciclo inteiro" de vendas com três agentes integrados:
- **LPH Prospect** — prospecção automatizada 24/7 em 4 canais (e-mail, LinkedIn,
  WhatsApp, telefone), do ICP até reunião agendada.
- **LPH Meet** — coach de vendas em tempo real na call: detecta objeção em ~0,8s
  e sugere resposta com dados do CRM ao vivo.
- **LPH Roleplay** — simulações de SDR geradas de calls reais, com scorecard de
  10 competências para acelerar onboarding de vendedor.

Filosofia: "vendedor multiplicado por IA" (não substituição). Integra RD Station,
HubSpot, Salesforce, Pipedrive.

### Modelo e preço (snapshot jul/2026)
SaaS **enterprise**, contrato **anual** em BRL, cotado por volume de reuniões/leads.

| Plano | Preço/mês (anual) | Reuniões | Leads | Destaques |
|-------|-------------------|----------|-------|-----------|
| Starter | R$ 1.347 | 50 | 1.000 | Scorecard 10 competências, suporte e-mail |
| Growth | R$ 3.729 | 75 | 1.500 | Análise de sentimento, follow-up automático, prioridade |
| Professional | R$ 4.921 | 100 | 2.000 | CRM avançado, dashboard de gestor, onboarding dedicado, SLA |
| Custom | Sob consulta | — | — | Times grandes, multi-BU, compliance |

ROI anunciado: +41% close rate, +45% win rate, −80% custo de prospecção,
11h/semana economizadas por rep.

### Pontos positivos
- **Nativo em PT-BR** e no tom de venda local — vantagem real no mercado alvo.
- **Cobre o funil inteiro** (prospecção → call ao vivo → treino), com dados
  fluindo entre os agentes — proposta mais integrada que rivais de estágio único.
- **Coaching ao vivo** (objeção em 0,8s) e **roleplay de onboarding** são
  diferenciais fortes para *times*.
- Integração com os CRMs usados no Brasil (RD Station incluso).
- Abordagem multicanal com WhatsApp — canal que importa no BR.

### Pontos negativos
- **Caro e enterprise**: piso de R$ 1.347/mês (anual) → ~R$ 16k/ano. Fora de
  cogitação para freelancer solo com teto de ~R$ 50/mês.
- **Feito para time de vendas** (VP de vendas, gestor de 12+ reps), não para
  operador único — muito do valor (coaching, roleplay) não se aplica a solo.
- **Prospecção genérica B2B**, não mira "negócio local com site ruim"; sem
  diagnóstico de presença digital.
- **Automação multicanal agressiva** (e-mail/WhatsApp/telefone 24/7) levanta
  risco de **LGPD/consentimento** e de spam se mal calibrada.
- Presença de reviews independentes ainda **escassa** — ROI é auto-reportado
  pela própria empresa; tratar com ceticismo.
- Provável **período de contrato/lock-in** anual.

### Relevância pro prospect-engine
Concorrente **indireto**, mesmo mercado (BR) mas outro comprador (time de vendas,
não freelancer). Serve de **referência de ambição** (funil inteiro, PT-BR,
WhatsApp) e de **contraste de posicionamento**: onde o LPH é caro, automatizado
e para times, o prospect-engine é **barato, manual-por-design (LGPD) e para um
operador**. O nome idêntico é um alerta para não citar "LeadsPerHour" achando
que é o scraper de Maps.

---

## 3. MapLeads
`https://www.mapleads.online/` — Extrator gratuito de leads de Google Maps / Facebook / Instagram.

> ⚠️ **Nome ambíguo.** Existe um cluster de produtos parecidos
> (`mapleads.io`, `getmapleads.io`, `mapleadspro.com`, `mapleadscraper.com`).
> Este item é **especificamente `mapleads.online`**. Detalhes de preço não
> foram 100% confirmados (SPA JS) — ver [limitações](README.md#metodologia-e-limitações-desta-pesquisa).

### O que é
Ferramenta que se posiciona como **"#1 Free B2B Lead Generation Tool"**: extrai
leads de **Google Maps, Grupos do Facebook e Instagram**, com contato direto
(e-mail, telefone, site). Anuncia também **escrita de e-mail com IA** e
**disparo em massa por WhatsApp**. Funciona no modelo de extrator/scraper
(coleta dados enquanto você navega/busca).

### Modelo e preço (snapshot jul/2026 — parcialmente confirmado)
Freemium. **Free** com extração limitada (agregadores citam algo como export de
poucos leads por busca no grátis; ilimitado no pago). **Preço pago exato do
mapleads.online não confirmado** — posiciona-se fortemente como "grátis".
*(Não confundir com o "Map Lead Scraper" de US$ 9,90/mês por 100k registros —
é outro produto.)*

### Pontos positivos
- **Direto ao ponto e barato/grátis**: baixa barreira de entrada para montar
  lista rápida de negócios locais.
- **Mesma matéria-prima** do prospect-engine (Google Maps) + Facebook/Instagram
  — cobre canais que a API oficial do Places não cobre.
- Extrai **e-mail/telefone/site** e ainda tenta **e-mail via IA** e **WhatsApp
  em massa** — pacote de "coleta + disparo" num lugar.
- Bom para **volume** quando o objetivo é só quantidade de contatos.

### Pontos negativos
- **Scraping, não API oficial** → viola/tensiona os **Termos do Google Maps**;
  risco de bloqueio, dados quebrando quando o layout muda, e **exposição legal**.
  (O prospect-engine escolheu API oficial justamente por isso — ver
  [ADR / visão](../00-product-vision.md).)
- **Qualidade de e-mail variável**: Maps não fornece e-mail; a ferramenta
  "adivinha" varrendo o site do negócio → muito e-mail genérico/errado.
- **Sem diagnóstico**: entrega o contato cru, não diz *quem tem Dor* (site
  lento, sem HTTPS, sem site). Zero priorização por qualidade do lead.
- **Velocidade limitada** e dependência de o negócio ter site/e-mail exposto.
- **Disparo em massa por WhatsApp** convida a **spam** e a problemas de **LGPD**
  e de ban do número — o oposto do "envio manual com consentimento" do projeto.
- **Marca difusa** (vários "MapLeads") e pouca reputação verificável → confiança
  e continuidade incertas.

### Relevância pro prospect-engine
Concorrente **direto na etapa de coleta** — e o mais próximo do que o
prospect-engine faz na F001. A diferença de posicionamento é a **tese inteira**
do projeto: onde o MapLeads faz *scraping cru + disparo em massa*, o
prospect-engine faz *API oficial + diagnóstico de Dor + score + abordagem
personalizado e manual*. É a melhor referência para dizer **"o que NÃO ser"**:
não virar mais um extrator-e-spammer; o valor está em **qualificar**, não em
juntar contato.

---

## Tabela comparativa

| Critério | Apollo.io | Leads Per Hour | MapLeads | **prospect-engine** |
|----------|-----------|----------------|----------|---------------------|
| Categoria | Sales intelligence B2B global | Agentes de IA p/ time de vendas (BR) | Extrator de Maps/FB/IG | Motor de prospecção local + diagnóstico |
| Fonte de dados | Base própria 230M+ | Base B2B + canais | **Scraping** Maps/FB/IG | **Google Places (API oficial)** |
| Diagnóstico de presença digital | Não | Não | Não | **Sim (core)** |
| Score/priorização por Dor | Não (por ICP/intent) | Parcial (ICP) | Não | **Sim** |
| Abordagem | Multicanal automatizado | Multicanal 24/7 + coach | E-mail IA + WhatsApp massa | **Gerado por Claude, envio manual** |
| Público | SDR/RevOps corporativo | Times de vendas | Quem quer lista rápida | **Freelancer dev solo** |
| Preço | US$ 0 → 119+/assento/mês | R$ 1.347+/mês (anual) | Grátis/baixo (a confirmar) | **~R$ 50/mês (custo de API)** |
| LGPD / compliance | GDPR/SOC2 (mas dado B2B) | Automação = risco consent. | Scraping = risco alto | **Só dado público + envio manual** |
| Idioma/mercado | Global (LATAM fraco) | PT-BR nativo | Genérico | **PT-BR / Brasil local** |

---

## O que tirar disto (pro prospect-engine)

**Copiar / se inspirar:**
- **PT-BR nativo e WhatsApp** como canal (LPH acerta no mercado) — já é a aposta
  da F005.
- **Freemium honesto de teste** e onboarding leve (Apollo) — para o projeto,
  traduz em "custa centavos por operação", não assinatura.
- **Filtros/segmentação profundos** (Apollo) como norte de UX da dashboard,
  ainda que numa escala muito menor.

**Evitar (anti-padrões confirmados nas reviews):**
- **Prometer acurácia que não se entrega** (Apollo, 70% real vs. "verificado")
  → o projeto só afirma o que o Diagnóstico comprova.
- **Scraping cru + disparo em massa** (MapLeads) → o projeto usa API oficial e
  envio manual; a diferença é jurídica e de qualidade, não estética.
- **Automação multicanal agressiva** (LPH/MapLeads) → conflita com LGPD e com o
  princípio de "10 Leads *prontos*", não "1.000 contatos disparados".
- **Complexidade/lock-in enterprise** (LPH/Apollo Organization) → o projeto é de
  um operador, síncrono e sem infra pesada (ADR-002).

**A tese que nenhum concorrente ataca (nosso fosso):**
> Entregar **contato + Dor concreta diagnosticada + Abordagem pronta**, por
> **dado público via API oficial**, dentro da **LGPD**, a **custo marginal** e
> para **um operador**. Coleta é commodity (MapLeads); abordagem automatizado é
> caro e arriscado (Apollo/LPH). O **diagnóstico que qualifica** é o que
> ninguém entrega — e é o core desta ferramenta.

---

## Fontes
- [Apollo.io — site oficial](https://www.apollo.io/) e [/pricing](https://www.apollo.io/pricing)
- [Apollo.io Review 2026 — teste 4 semanas (Salesforge)](https://www.salesforge.ai/blog/apollo-io-review)
- [Apollo.io Reviews — G2](https://www.g2.com/products/apollo-io/reviews) · [Capterra](https://www.capterra.com/p/158696/Apollo/reviews/) · [TrustRadius](https://www.trustradius.com/products/apollo/reviews)
- [Leads Per Hour — site oficial](https://leadsperhour.com/) e [/en](https://leadsperhour.com/en/)
- [MapLeads — site oficial](https://www.mapleads.online/)
- [Comparativos de extratores de Google Maps — Outscraper](https://outscraper.com/9-best-google-maps-scrapers/) · [Apify](https://blog.apify.com/best-google-maps-scrapers/) · [Bright Data](https://brightdata.com/blog/web-data/best-google-maps-scrapers)
