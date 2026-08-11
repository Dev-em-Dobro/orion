# Rodar o Orion na sua máquina

Guia curto pra subir o app local com dados de demonstração — dá pra navegar
por tudo que o revamp criou sem nenhuma chave de API.

## Antes de começar

- **Docker Desktop aberto** (o app precisa dele pro Postgres e pro Mailpit).
- Node 20+.
- O `.env` já existe na raiz, com segredos gerados pra esta máquina. Ele está
  no `.gitignore` — não vai pro repositório.

## 1. Subir e preparar (uma vez)

```bash
npm ci                 # se ainda não instalou
npm run dev:setup      # sobe Postgres + Mailpit e aplica as migrações
npm run seed:dev -- seu@email.com
```

O `seed:dev` cria a sua conta com a compra verificada e **15 Leads de
demonstração**, cobrindo todos os estados: fila do dia, follow-up atrasado,
proposta parada, descartado, ganho, e seis recém-coletados esperando
aprofundamento.

> Use o e-mail que você vai digitar no login. O magic link não sai por e-mail
> de verdade — cai no Mailpit.

## 2. Rodar

```bash
npm run dev
```

- App: <http://localhost:3000>
- Caixa de entrada (magic link): <http://127.0.0.1:8025>

No login, digite o mesmo e-mail do seed, clique em entrar e pegue o link no
Mailpit.

## 3. O que dá pra ver sem chave nenhuma

| Tela | O que observar |
|------|----------------|
| `/` Dashboard | **Fila do dia** no topo (quem abordar agora) e **Pra fazer agora** logo abaixo (o que está atrasado) |
| `/leads` | Grade de cards, chips de filtro, seleção em massa, exportar CSV, descartar |
| `/leads/[id]` | Abas Diagnóstico · Abordagem · Objeções · Proposta e a navegação `N de M ‹ ›` |
| `/funil` | Kanban — arraste um card ou use o seletor dentro dele |
| `/tarefas` | As seis cobranças, agrupadas por atraso, com Adiar e Dispensar |
| `/agente` | Sobe, mas precisa de chave de IA pra responder |

## 4. Para testar de ponta a ponta (com chaves)

A busca real e a IA precisam de chave. Dois caminhos:

**a) Pela interface (o mesmo caminho do aluno)** — logado, vá em
`/configuracao`, troque para **BYOK** e cole as suas chaves. É o jeito
recomendado: exercita o fluxo que o aluno vive.

**b) Pelo `.env`** — descomente e preencha:

```
ORION_GOOGLE_API_KEY=   # Places API (New) + PageSpeed Insights
ORION_OPENAI_API_KEY=   # no modo Orion o LLM é sempre OpenAI
```

Com a chave Google, a busca em `/leads` funciona de verdade: escolha nicho,
estado e cidade, e o aprofundamento dispara sozinho depois da coleta.

> A busca gasta cota do Google (SKU Enterprise, US$ 35/1.000 depois das 1.000
> grátis por mês). O padrão de 20 resultados = **1 requisição**. Detalhes em
> `specs/11-custos-e-precificacao.md`.

## Comandos úteis

```bash
npm test                  # 230 testes unitários
npm run db:studio         # inspecionar o banco
npm run dev:down          # derrubar Postgres e Mailpit
npm run seed:dev -- x@y.z # repopular (apaga só os Leads "demo-")
```

`ORION_LOG_QUERIES=1` já está no `.env`: o terminal do `npm run dev` mostra
quantas queries cada página fez — é o contador da F028.

## Se algo não subir

| Sintoma | Causa provável |
|---------|----------------|
| `error during connect ... dockerDesktopLinuxEngine` | Docker Desktop fechado |
| `Can't reach database server at localhost:5432` | `npm run dev:up` não rodou, ou a porta 5432 já está ocupada por outro Postgres |
| `BETTER_AUTH_SECRET ausente` | O `.env` sumiu — recrie a partir do `.env.example` |
| Login não chega | Veja o Mailpit em <http://127.0.0.1:8025>; o link vale poucos minutos |
| `/skills` vazio | Esperado: o conteúdo das skills ainda não foi adicionado (`content/skills/`) |
