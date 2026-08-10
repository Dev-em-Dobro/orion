# ADR-016 — Ler o conteúdo do site que o Lead publicou

## Status
Proposta — 2026-08-10 (decidir antes do código da
[F026](../02-features/F026-sinal-atendimento-automatizado.md) e da
[F027](../02-features/F027-outreach-por-email.md)).

## Contexto
Duas features do revamp precisam de sinais que **só existem dentro do HTML** do
site do Lead:

- [F026](../02-features/F026-sinal-atendimento-automatizado.md) — se há
  atendimento automatizado (widget de chatbot no site).
- [F027](../02-features/F027-outreach-por-email.md) — o e-mail de contato que o
  negócio publica.

Hoje o [Diagnóstico](../02-features/F002-diagnostico-de-presenca-digital.md)
**já baixa esse HTML**: `verificarSite` faz `await res.arrayBuffer()` só pra
medir o tempo de carregamento e **descarta o conteúdo**. Ou seja: a requisição
já acontece; a questão é se podemos **olhar** o que veio.

Isso esbarra em duas linhas da [visão](../00-product-vision.md):
- *"Scraping fora do Google Places"* — fora de escopo.
- *"dos Leads, só dado público, sem enriquecimento via dados pessoais"*.

O ponto de tensão é real e precisa de decisão explícita, não de interpretação
conveniente no meio da implementação.

## Decisão
**Sim, com fronteira estreita.** O Orion pode ler o HTML **da URL que o próprio
negócio cadastrou no Google Places** — e só dela.

Regras que fazem parte da decisão:

1. **Uma URL, um GET.** Só a `website` do Lead (seguindo redirects, como já é
   feito). **Sem crawl**: não segue links internos, não busca `/contato`, não
   abre subpáginas, não lê `sitemap.xml`.
2. **Sem terceiros.** Nada de Instagram, Facebook, LinkedIn, Receita Federal,
   agregadores ou APIs de enriquecimento. Se o `website` é um Agregador
   ([F009](../02-features/F009-sinal-site-agregador.md)), **não** se segue o
   link — a regra atual continua valendo.
3. **Sem persistir o HTML.** O conteúdo vive na memória da requisição. O que é
   gravado são **conclusões curtas**: a classificação de atendimento + a
   evidência (≤ 120 chars) e, no máximo, **um** e-mail comercial.
4. **Limites técnicos.** Só `content-type: text/html`, teto de 1 MB, o mesmo
   timeout de 10s de hoje. Fora disso, o sinal fica "não avaliado".
5. **Só dado de contato profissional.** E-mail publicado pelo negócio para ser
   contactado. **Nunca** nome, CPF, telefone pessoal de funcionário ou qualquer
   outro dado pessoal encontrado na página.
6. **Zero requisição nova.** A leitura aproveita o corpo que já era baixado.
   Se alguma feature futura precisar de uma **segunda** requisição ao site,
   isso é decisão nova — reabrir este ADR.
7. **Respeito operacional.** User-agent identificável, uma requisição por
   Diagnóstico, nada de paralelismo agressivo contra o mesmo domínio.

A linha "scraping fora do Google Places" da visão passa a ser lida como:
**nenhuma fonte além do Places e do site que o próprio Lead publicou lá** — e a
visão é atualizada pra dizer isso com todas as letras.

## Alternativas consideradas

| Opção | Avaliação |
|-------|-----------|
| **A — Ler só o HTML da home do Lead (escolhida)** | Sinal suficiente pra F026/F027, custo zero, fronteira defensável |
| B — Não ler nada | Mata a F026 e a F027 (e o e-mail teria de ser digitado à mão, Lead a Lead) |
| C — Crawl leve (home + `/contato`) | Melhora a captura de e-mail, mas dobra/triplica requisições no site de terceiro e começa a parecer scraping. Reavaliar só com evidência de que a home não basta |
| D — API de enriquecimento (Hunter, Apollo…) | Custo, dependência nova e **colide de frente** com a restrição de dados pessoais da visão |
| E — Renderizar com Playwright pra pegar site em JS | Já existe no projeto (F008), mas é caro em tempo/memória e nada garante ganho proporcional. Fora por ora |

## Consequências

### Positivas
- F026 e F027 saem por **$0** e **sem tempo adicional** no Diagnóstico.
- A fronteira fica escrita: dá pra responder "de onde veio esse e-mail?" com
  uma frase.
- Nenhuma dependência nova.

### Negativas / a aceitar
- **Sites em JS puro** (SPA sem SSR) devolvem HTML quase vazio: o widget de
  chat e o e-mail podem não aparecer. Vira `nao_detectado` / e-mail nulo —
  daí a F026 usar a linguagem "não detectado", nunca "não tem".
- Negócios que publicam o e-mail só numa página interna não são capturados
  (consequência aceita da regra "sem crawl").
- A Política de Privacidade (`/privacidade`) precisa de um parágrafo sobre a
  origem do e-mail do Lead e sobre o direito de removê-lo.
