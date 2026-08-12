# F020 — Menu de entregáveis (Builders Club)

## Status
Implementada — 2026-07-27

## Objetivo
Exibir os materiais da Consultoria Freela no Orion: grupo **Materiais** na sidebar,
páginas em `/entregaveis` e links externos para a central hospedada.

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
- [ ] **AC1** — Sidebar exibe grupo "Materiais" com visão geral + itens disponíveis.
- [ ] **AC2** — Usuário sem compra verificada é redirecionado a `/ativar-acesso`.
- [ ] **AC3** — Conteúdo servido internamente via `/api/entregaveis/*` (sem URL pública do hub externo).
- [ ] **AC4** — Itens "em breve" não aparecem no menu lateral.
- [ ] **AC5** — Visão geral oferece "Baixar .zip" para portfolio, contrato e scripts-venda.
