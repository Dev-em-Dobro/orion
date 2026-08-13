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

## Isolamento do material (F036 — 2026-08-13)

O entregável é HTML de curso servido de dentro do Orion e exibido em iframe. O
sandbox trazia `allow-scripts` **e** `allow-same-origin` juntos — combinação que
anula o próprio sandbox: com a origem do app, o script do material alcança
`localStorage`, cookies não-`httpOnly` e o DOM da página que o embute. Material
de curso não é código hostil, mas ele é editado fora do repositório e servido
autenticado; a diferença entre "não é hostil" e "não pode ser" é essa linha.

| Camada | Antes | Depois |
|--------|-------|--------|
| `sandbox` do iframe | `allow-scripts allow-same-origin allow-downloads allow-popups` | `allow-scripts allow-downloads allow-popups` |
| Resposta de `/api/entregaveis/*` | `nosniff` + `Cache-Control: private, no-store` | idem + CSP quando o `content-type` é `text/html` |

```
default-src 'self' 'unsafe-inline' data: blob:;
connect-src 'none'; form-action 'none';
frame-ancestors 'self'; base-uri 'none'
```

`connect-src 'none'` corta `fetch`/XHR do material; `form-action 'none'` corta
POST pra fora; `frame-ancestors 'self'` impede embutir o material em site de
terceiro. `'unsafe-inline'` fica: o conteúdo é HTML estático com `<style>` e
`<script>` inline, e apertar isso exigiria reescrever o material.

**O que quebra, se algum material depender:** chamada de rede a partir do
entregável, envio de formulário e leitura de `localStorage` da origem do app.
Material que precise disso vira caso de spec, não de exceção no header.

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
- [x] **AC6** ([F036](F036-endurecimento-de-seguranca.md)) — O iframe do
      entregável **não** tem `allow-same-origin`, e a resposta HTML de
      `/api/entregaveis/*` traz `Content-Security-Policy`.
