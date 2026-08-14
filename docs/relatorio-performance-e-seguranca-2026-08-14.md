# Relatório — performance e segurança

**Data:** 2026-08-14 · **Branch:** `feature/security-hardening-revamp`
**Commits:** `66bdcce`, `292796a`, `0a23327`, `ad3874f`
**Verificação:** 362 testes passando, build limpo.

---

# Parte 1 — Performance

## Critério

> Toda página carrega em **menos de 2,5 s**.

**Resultado: atendido em todas as 17 rotas medidas.** A pior fica em **635 ms** —
3,9× de folga.

## Como foi medido, e por que assim

`scripts/perf-rotas.mts` sobe o **build de produção** (`next start`) numa porta
própria, forja uma sessão válida e mede cada rota de duas formas:

| camada | o que mede | por quê |
|---|---|---|
| **HTTP** (`fetch`, 12 amostras) | TTFB e corpo completo, p50 e p95 | é o piso — nenhum navegador pinta antes disso |
| **Navegador** (Chromium real) | `load`, `DOMContentLoaded`, LCP | é o que você sente; inclui parse de JS, hidratação e fonte |

Modo de produção não é detalhe: em `next dev` cada rota compila na primeira
visita, e o número seria do compilador, não do app.

### Os dois cenários (e por que um só não serve)

| cenário | banco | máquina |
|---|---|---|
| **piso do código** | Postgres local, ~1 ms | CPU do desktop, sem freio |
| **perfil de produção** | **+35 ms por ida-e-volta** (perfil Neon) | CPU 4× mais lenta + 4G ruim (150 ms RTT) |

O `.env` de desenvolvimento aponta pro Postgres em Docker, onde uma query custa
~1 ms. **Produção é Neon**, onde ela custa a viagem de rede. Contra o banco
local, uma tela com oito consultas em série mede igual a uma com uma só — o
número parece ótimo e não diz nada. `scripts/perf-proxy-latencia.mts` é um relay
TCP que injeta a latência, e é o cenário 2 que responde ao critério.

O relay simula **tempo de viagem**, não o Neon inteiro: sem cold start de
branch, sem limite de conexão do pooler. É uma aproximação **por baixo** — o
número real de produção tende a ser pior, nunca melhor.

### Uma armadilha que quase entrou no relatório

A primeira rodada "provou" que 35 ms de latência de banco não custavam nada:
TTFB idêntico nos dois cenários. Estava errado. O `next start` sobe via shell,
`proc.kill()` matava só o shell, e **o segundo cenário estava medindo o servidor
do primeiro**. O script agora derruba a árvore de processo e se recusa a subir
com a porta ocupada.

Fica registrado porque é o tipo de erro que produz um relatório bonito e falso.

## O achado: o pedágio do shell

TTFB p50 tinha **piso de ~250 ms em toda rota** no cenário de produção —
incluindo `/conteudo` e `/agente`, que não consultam **nada** de domínio.

O custo não era de página nenhuma. Era do **shell**, que roda antes de todas e
não estava coberto pelo AC5 da [F028](../specs/02-features/F028-desempenho.md).
Três causas, todas antes do primeiro byte:

| # | o que era | correção |
|---|---|---|
| 1 | `SidebarWithStatus` fazia `await contarTarefas()` e **depois** `await planoDoUsuario()` — duas idas-e-voltas em série pra duas consultas independentes | `Promise.all` |
| 2 | `contarTarefas` chama `tarefasDoUsuario` — a consulta mais cara que roda em toda página (`findMany` de Leads com Abordagens aninhadas) — só pra desenhar o número do badge. Em `/tarefas` rodava **duas vezes** por request | memoizada por request com `cache()` do React |
| 3 | `MedidorUso` é `async` e vive no shell, então toda página esperava as consultas de plano e uso antes do primeiro byte | foi pra dentro de `<Suspense>` com placeholder do tamanho exato — saiu do caminho crítico com zero layout shift |

Uma quarta correção veio junto com o trabalho de UI: **`/leads/[id]`** fazia
sete consultas num `Promise.all` e só então renderizava. Nome, score e estágio
saem do `requireLeadOwned`, que já resolveu — passam a pintar antes. As quatro
consultas de vizinho (`‹ 3 de 47 ›`) são as mais caras da tela, não dizem nada
sobre o Lead aberto, e foram pra um `<Suspense>` próprio.

## Números

**Cenário de produção, 12 amostras, `load` no navegador:**

| | antes | depois |
|---|---|---|
| pior rota | **731 ms** (`/ranking`) | **635 ms** |
| faixa das demais | 538–570 ms | **401–477 ms** |
| piso de TTFB p50 (shell) | ~263 ms | ~251 ms |

**Detalhe por rota (depois, cenário de produção):**

| rota | TTFB p50 | TTFB p95 | HTML p95 | `load` | LCP |
|---|---|---|---|---|---|
| `/` | 468 | 535 | 783 | 477 | 424 |
| `/leads` | 326 | 516 | 981 | 426 | 400 |
| `/leads?status=descartados` | 266 | 328 | 828 | 417 | 400 |
| `/leads/[id]` | 255 | 270 | 392 | 428 | 412 |
| `/leads/[id]?aba=abordagem` | 265 | 380 | 391 | 455 | 428 |
| `/funil` | 264 | 283 | 532 | 431 | 412 |
| `/agente` | 264 | 266 | 269 | 426 | 408 |
| `/tarefas` | 263 | 322 | 328 | 428 | 436 |
| `/ranking` | 250 | 342 | 467 | **635** | 572 |
| `/treino` | 251 | 265 | 506 | 459 | 400 |
| `/conteudo` | 260 | 278 | 281 | 414 | 424 |
| `/planos` | 265 | 325 | 328 | 421 | 400 |
| `/configuracao` | 251 | 314 | 498 | 433 | 408 |
| `/configuracao/tutorial-google` | 262 | 284 | 289 | 417 | 396 |
| `/skills` | 324 | 402 | 405 | 401 | 384 |
| `/entregaveis` | 265 | 324 | 329 | 416 | 428 |
| `/login` (307) | 2 | 4 | 4 | 248 | 224 |

No cenário **piso do código** (banco local, máquina rápida) a pior rota é
`/ranking` com **54 ms**.

## O que este número NÃO prova

Isto importa mais que os números acima:

1. **A base de teste tem 30 Leads**, não os 500 que os AC1–AC9 da F028 exigem.
   O que a varredura prova é **latência de estrutura** (idas-e-voltas em série),
   não comportamento em escala.
2. **`tarefasDoUsuario` é a que mais deve doer quando a base crescer.** Ela lê
   *todos* os Leads em estágio cobrável com as Abordagens aninhadas, e roda em
   **toda** página por causa do badge da sidebar. Com 30 Leads é irrelevante;
   com 5.000 vira o gargalo. A memoização resolveu a duplicação, não o tamanho.
3. **H1/H2 da F028 continuam pendentes** — co-localizar função e banco (região
   do Neon + `vercel.json`) e apontar a `DATABASE_URL` pro endpoint `-pooler`.
   São infra, não código, e são as de **maior impacto**. Todo o ganho medido
   aqui é pequeno perto do que essas duas dariam.
4. **185 kB de JS compartilhado em toda rota** (`First Load JS`). Não investiguei
   — o suspeito principal é o Sentry. Não impede o critério, mas é o maior item
   fixo do carregamento no cliente.
5. **Uma amostra isolada de `/leads?status=descartados` marcou 19 s de p95** numa
   rodada. **Não reproduziu** em 12 amostras (p95 = 328 ms); a causa provável é
   churn de conexão do Prisma através do relay, não código da aplicação. Fica
   registrado em vez de descartado.

## Como reproduzir

```bash
npm run build
npx tsx scripts/perf-rotas.mts          # 7 amostras
PERF_AMOSTRAS=12 npx tsx scripts/perf-rotas.mts
```

Saída bruta em `test-results/perf-rotas.json`. Variáveis: `PERF_AMOSTRAS`,
`PERF_LATENCIA_BANCO` (default 35), `PERF_EMAIL`, `PERF_PORTA`.

---

# Parte 2 — Segurança

Contexto: a [F036](../specs/02-features/F036-endurecimento-de-seguranca.md) já
tinha fechado sete brechas numa revisão anterior. Esta varredura olhou **o que
ficou de fora dela**, com foco nas duas telas onde o aluno conversa com IA.

## O que está sólido (verificado no código, não na spec)

| área | como está | onde |
|---|---|---|
| **Isolamento multi-tenant** | `user_id` **nunca** é parâmetro de ferramenta do Agente — vem da sessão e é injetado no handler. Não existe campo pelo qual pedir dado de outro aluno | `src/lib/agente/ferramentas.ts` |
| **SSRF** | Valida **cada hop** de redirect, não só a URL inicial. Bloqueia IP privado/metadata, porta fora de 80/443, credencial na URL, esquema não-http(s) | `src/lib/diagnostico/verificarSite.ts` |
| **Path traversal** | Rejeita `..` e NUL **antes** de resolver, e confere o resultado contra a raiz — as duas checagens, porque só a primeira não cobre symlink | `src/lib/arquivos/servir.ts` |
| **XSS** | **Zero** ocorrências de `dangerouslySetInnerHTML`, `eval`, `new Function` ou `innerHTML` em todo o `src/`. A resposta do Agente é renderizada como texto, escapada pelo React | varredura completa |
| **Autorização** | **Toda** Server Action passa por `requireTenant`/`requireUser`/`requireLeadOwned`. Nenhuma exceção | `src/actions/**` |
| **Cifra das chaves BYOK** | AES-256-GCM com IV aleatório por chamada, chave-mestra de 32 bytes validada no boot | `src/lib/seguranca/cifra.ts` |
| **Rate limit de auth** | 20 requisições / 60 s | `src/lib/auth/index.ts` |
| **Iframe do entregável** | `sandbox` sem `allow-same-origin` + CSP com `connect-src 'none'`, `form-action 'none'`, `base-uri 'none'` | `src/app/api/entregaveis/[...path]/route.ts` |
| **Cota** | Reservada **antes** da chamada paga e estornada na falha (ADR-017) — inclusive no Agente, onde o stream pode morrer no meio | `src/lib/limites/servico.ts` |

## Achado 1 — Injeção indireta no Agente · **CORRIGIDO**

**Severidade:** baixa · **Commit:** `ad3874f`

O Agente é read-only e bem isolado. O que faltava é outra coisa: **parte do que
volta das ferramentas não foi escrita nem pelo aluno nem por você.**

- `nome`, `categoria`, `endereco` → vêm do Google Places
- `atendimento_evidencia` e o e-mail público → saem do **HTML do site do próprio
  Lead**
- `dores[].detalhes` → derivadas desse HTML

Um site hostil pode plantar texto se passando por instrução de sistema nesses
campos. O estrago possível é pequeno — nenhuma ferramenta escreve, então não dá
pra exfiltrar nem alterar nada —, mas "pequeno" não é "nenhum": o agente podia
repetir uma ordem de terceiro como se fosse dele, ou apresentar um link plantado
como recomendação.

**Correção:** regra 5 no system prompt, dizendo explicitamente que o que volta de
ferramenta é **dado, nunca instrução**, e que campo com ordem embutida deve ser
relatado como conteúdo suspeito do Lead.

## Achado 2 — Injeção no system prompt do Simulador · **ABERTO, precisa da sua decisão**

**Severidade:** baixa-média · **Arquivo:** `src/lib/simulador/prompt.ts`

O `cenario` vem do **cliente** e é interpolado **cru** no system prompt:

```ts
`Você INTERPRETA o dono de um negócio do tipo "${cenario.categoria}".`
`No seu negócio isto é verdade: ${cenario.dores.join("; ")}.`
```

A validação Zod só confere formato e tamanho — `categoria` até 80 caracteres,
`dores` até 10 × 300. São ~3.080 caracteres de texto livre entrando no system
prompt, e a `categoria` está entre aspas que qualquer um fecha.

**Por que não é crítico:** o atacante é o próprio aluno logado, atacando a
própria conversa. Não há dado de terceiro exposto e nada é escrito no banco.

**Por que não é zero:** no **modo Orion** a chamada usa a **chave compartilhada
da plataforma**. Um aluno pode transformar o Simulador num LLM de uso geral por
conta da Orion. Hoje isso é limitado por cota mensal do plano, cota diária e
`maxTokens: 512` — o abuso tem teto, mas o teto é o que você paga.

**Por que não corrigi sozinho:** o modo "categoria manual" é texto livre **por
design** — o aluno digita o tipo de negócio que quiser. Apertar isso é decisão
de produto, não de código. Duas opções:

1. **Mínima** — no modo "a partir de um Lead", mandar só o `leadId` e derivar
   `categoria`/`dores` no servidor. Fecha o vetor onde ele não serve pra nada e
   não mexe no modo manual. *Recomendo esta.*
2. **Completa** — além da 1, delimitar a `categoria` manual e instruir a persona
   a tratar o conteúdo dos delimitadores como nome de nicho, nunca como ordem.

## Achado 3 — `/ranking` fora do matcher do middleware · **ABERTO, informativo**

**Severidade:** informativa · **Arquivo:** `src/middleware.ts`

Todas as rotas do grupo `(orion)` estão no `matcher` e em `isProtectedPath`,
menos `/ranking`.

**Não é vazamento:** o `layout.tsx` do `(orion)` chama `requireUser()` e
redireciona. A rota está protegida.

**O que muda:** um visitante deslogado em `/ranking` cai no caminho de "sessão
inválida" (`/api/auth/sessao-invalida`, que apaga cookie e manda pro login com
`?error=sessao_expirada`) em vez do redirect limpo com `callbackUrl`. Ele perde o
destino e vê uma mensagem de erro que não descreve o que aconteceu.

Correção: acrescentar `/ranking` nas duas listas.

## O que NÃO foi auditado

Sendo explícito sobre o alcance desta varredura:

- **Não houve teste dinâmico.** Nada foi explorado contra o app rodando; a
  análise é de leitura de código.
- **Não olhei o fluxo de webhook da Hubla** além do que a F036 já registra.
- **Não revisei dependências** (`npm audit`, CVEs de transitivas).
- **Não olhei headers de segurança da resposta** (HSTS, CSP global,
  `X-Frame-Options`) fora da rota de entregáveis.
- **Não testei o rate limit na prática** — só confirmei que está ligado com
  janela de 60 s e teto de 20.

---

# Resumo executivo

**Performance:** critério de 2,5 s atendido em todas as 17 rotas, pior caso em
635 ms. O gargalo encontrado não era de página nenhuma — era um pedágio de
~250 ms no shell, pago antes do primeiro byte em toda navegação, e caiu com três
correções pequenas. O risco que sobra é de **escala**, não de estrutura:
`tarefasDoUsuario` roda em toda página e lê a base inteira de Leads cobráveis.

**Segurança:** a base é sólida — isolamento, SSRF, path traversal, XSS e
autorização estão todos certos e verificados no código. Fechei a injeção
indireta no Agente. Sobram **duas decisões suas**: apertar o `cenario` do
Simulador (achado 2) e pôr `/ranking` no middleware (achado 3).
