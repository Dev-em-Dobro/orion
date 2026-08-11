# F020 — Menu de entregáveis (Builders Club)

## Status
Implementada — 2026-07-27 · **grupo removido da sidebar em 2026-08-11**

> **Mudança de 2026-08-11 — Materiais sai do menu.** O Orion é motor de
> prospecção; material de curso é conteúdo de comunidade e vive fora dele. As
> rotas continuam de pé (`/entregaveis`, `/entregaveis/[slug]`, os `.zip`), com
> o mesmo gate de compra — o que sumiu foi a **entrada no menu lateral**. Quem
> tem o link continua acessando; ninguém tropeça nisso navegando.
>
> Consequência: **AC1 deixa de valer** (ver Critérios de aceitação). E, como o
> menu era o único lugar que dependia de saber se a compra estava verificada, a
> sidebar parou de chamar `statusCompra` — uma consulta a menos em **toda**
> página ([F028](F028-desempenho.md)). Não se perde verificação: quem faz isso
> é o gate das rotas, que já chama `tentarAutoVerificar` por dentro.

## Objetivo
Servir os materiais da Consultoria Freela dentro do Orion: páginas em
`/entregaveis`, com o conteúdo espelhado internamente em vez de link público.

Pré-requisito de acesso: compra verificada ([F019.1](F019.1-ativacao-acesso.md)).

## Catálogo
Config estática em `src/lib/entregaveis/catalogo.ts` — espelha
[entregaveis-psi.vercel.app](https://entregaveis-psi.vercel.app/).

## Rotas
| Rota | Descrição |
|------|-----------|
| `/entregaveis` | Visão geral (lista + Baixar .zip nos kits) |
| `/entregaveis/[slug]` | Detalhe + iframe do material |
| `/api/entregaveis/download/[slug]` | Kit .zip (portfolio, contrato, scripts) |
| `/ativar-acesso` | Ativação quando compra não verificada |

## Kits .zip
Espelham o hub [entregaveis-psi](https://entregaveis-psi.vercel.app/):

| Slug | Arquivo |
|------|---------|
| `portfolio` | `meu-portfolio.zip` |
| `contrato` | `contrato-freela-devemdobro.zip` |
| `scripts-venda` | `scripts-de-venda-devemdobro.zip` |

Gerados sob demanda (ZIP STORE) a partir de `content/entregaveis/` — mesma
auth + compra verificada da API de arquivos.

## Gate
Layout de `/entregaveis/*` chama `redirectSeCompraPendente()`.
Orion principal permanece aberto sem compra.

## Critérios de aceitação
- [x] ~~**AC1** — Sidebar exibe grupo "Materiais" com visão geral + itens disponíveis.~~
      **Revogado em 2026-08-11**: o grupo saiu do menu. Nenhum link para
      `/entregaveis` parte da navegação.
- [ ] **AC2** — Usuário sem compra verificada é redirecionado a `/ativar-acesso`.
- [ ] **AC3** — Conteúdo servido internamente via `/api/entregaveis/*` (sem URL pública do hub externo).
- [x] ~~**AC4** — Itens "em breve" não aparecem no menu lateral.~~
      **Sem efeito desde 2026-08-11**: não há mais menu. `ENTREGAVEIS_MENU`
      continua no catálogo, sem consumidor.
- [ ] **AC5** — Visão geral oferece "Baixar .zip" para portfolio, contrato e scripts-venda.
