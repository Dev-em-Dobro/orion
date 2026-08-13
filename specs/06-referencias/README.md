# 06 — Referências

## Status
Vivo — última atualização 2026-07-11

## Por que este documento existe
Reúne **referências externas** que informam a estratégia do prospect-engine:
concorrentes diretos e indiretos, categorias de ferramenta do mercado e fontes
consultadas. Não é spec (não define comportamento de código) — é **inteligência
de mercado** para calibrar posicionamento, precificação mental e roadmap.

Regra: referência não vira feature sozinha. Se algo daqui deve virar
comportamento, abre-se spec em `/specs/02-features` (e ADR se precisar de lib).

## Índice
- [Dossiê de concorrentes](concorrentes.md) — pontos positivos e negativos de
  cada ferramenta analisada, tabela comparativa e implicações pro prospect-engine.
- [Oportunidades de feature](oportunidades-de-features.md) — as 3 funcionalidades
  com maior chance de fazer o **aluno fechar negócio** que o produto ainda não
  tem (derivadas do dossiê).

## Concorrentes e referências mapeados

| Ferramenta | Categoria | Modelo | Relação com o prospect-engine |
|------------|-----------|--------|-------------------------------|
| [Apollo.io](https://www.apollo.io/) | Sales intelligence + engagement (base B2B 230M+ contatos) | SaaS por assento, freemium | Concorrente **indireto**: outbound B2B global, foco em base de contatos, não em negócio local com site ruim |
| [Leads Per Hour](https://leadsperhour.com/) | Infra de agentes de IA para vendas B2B (BR/LatAm) | SaaS enterprise (R$1k+/mês) | Concorrente **indireto**: mesmo mercado (BR), mas mira times de vendas, não freelancer solo mirando negócio local |
| [MapLeads](https://www.mapleads.online/) | Extrator de leads de Google Maps / Facebook / Instagram | Freemium (scraping) | Concorrente **direto** na coleta: mesma matéria-prima (Google Maps), mas **scraping** vs. API oficial e **sem diagnóstico** |

> Categorias vizinhas relevantes que **não** são concorrentes diretos, mas
> ajudam a entender o mercado: extratores de Google Maps genéricos (Outscraper,
> Apify, G Maps Extractor, Leads-Sniper), CRMs de agência sobre Maps
> (getmapleads.io), e plataformas de agência pay-per-lead. Ver dossiê.

## O ângulo do prospect-engine (para não perder o norte)
Nenhum dos três concorrentes faz o que é o **core** desta ferramenta:
**diagnosticar a presença digital** do estabelecimento (sem site / site lento /
sem HTTPS) e usar isso como qualificador e gancho de abordagem. Eles entregam
*contato*; o prospect-engine entrega *contato + Dor concreta + Abordagem pronta*,
via **API oficial** (Google Places) e dentro da **LGPD** (só dado público,
envio manual). Ver [visão de produto](../00-product-vision.md).

## Metodologia e limitações desta pesquisa
- Pesquisa feita em **2026-07-11** via busca web + leitura das páginas oficiais
  e de reviews independentes (G2, Capterra, Trustpilot, blogs de teste).
- **Apollo.io** e **Leads Per Hour**: dados de preço e features confirmados nas
  páginas oficiais e cruzados com reviews. Alta confiança.
- **MapLeads (mapleads.online)**: o site é uma SPA JS que não renderiza em
  fetch simples; features vêm do título/descrição oficial e de agregadores.
  **Preço exato não confirmado** — a ferramenta se posiciona como "grátis".
  Confiança média; **confirmar ao vivo** antes de decisão. Há um cluster de
  nomes quase idênticos (mapleads.io, getmapleads.io, mapleadspro.com,
  mapleadscraper.com) — **não confundir**; este dossiê trata de `mapleads.online`.
- Preços mudam. Tratar valores como *snapshot de julho/2026*, não como fato fixo.
