# Plano — Pablo testa o staging hoje de manhã, prod sobe à tarde

> Escrito em **2026-08-19**, para execução no mesmo dia.
> Este documento é o **resumo operacional**. Ele não substitui o
> [RUNBOOK-PROD-REVAMP](RUNBOOK-PROD-REVAMP.md), que é quem manda na parte do
> deploy — aqui só está a ordem das coisas e o que ainda falta decidir.

---

## O staging já tem o revamp

**https://staging.orion-lead-hunter.devemdobro.com**

Está no ar a branch `feature/security-hardening-revamp` inteira — **86 commits à
frente da `main`**, features **F024–F040**: Fila do dia, Central de Tarefas,
funil kanban, planos, Agente, Skills. Produção hoje não tem nada disso.

Subiu agora de manhã (19/08, 10h23) o commit `06a6761`, que conserta dois bugs
achados no QA de ontem:

- **Psicólogo e Nutricionista não buscavam nada.** Mandavam um tipo que não
  existe na API do Google (`psychologist` / `nutritionist`) e a busca voltava
  erro 400. Nunca funcionaram, desde que entraram no dropdown.
- **O erro da API aparecia cru pro aluno**, com JSON e link de doc do Google.

Pablo já está no time da Vercel (`pablovianas`), então passa o SSO do staging
sem precisar de nada.

---

## Antes de começar: o login não se resolve sozinho

A conta de demonstração é **`cadudias@hotmail.com`**, e o staging manda magic
link por e-mail de verdade (Resend) — **o link cai na caixa do Ricardo**, e vale
poucos minutos.

**Resolver isto antes de o Pablo sentar pra testar**, uma das três:

1. Ricardo repassa o link na hora (precisa dos dois online juntos);
2. criar uma conta de QA no e-mail do próprio Pablo, com
   `npx tsx scripts/seed-dev.mts <email-do-pablo>` apontando pro Neon de
   **staging**;
3. Ricardo loga e deixa a sessão aberta na máquina do Pablo.

> **Não entrar em conta de aluno.** As outras ~48 contas do staging são de
> alunos reais, com a base de prospecção deles.

---

## Parte 1 — QA no staging (Pablo, ~40 min)

Ordem proposital: é o caminho que o revamp existe pra entregar. Se um elo não
fechar, anotar e seguir — o objetivo é levantar a lista toda, não parar no
primeiro.

| # | Passo | O que tem que acontecer |
|---|---|---|
| 1 | `/leads` → buscar **Dentista · PR · Curitiba**, quantidade 20 | Vêm ~20 Leads, cada card com score e Dor |
| 2 | Buscar **Psicólogo · GO · Goiânia** | **Vêm Leads.** É o bug consertado hoje — ontem dava erro 400 vermelho |
| 3 | Buscar **Nutricionista** em qualquer cidade | Idem. Mesmo bug, mesmo conserto |
| 4 | Olhar o Tier dos Leads dos passos 2 e 3 | Têm que entrar como **ALTO**, não BAIXO |
| 5 | Home `/` — a Fila do dia | Lista priorizada, não a lista crua |
| 6 | Selecionar Leads → **Mandar pro Funil** | Só age em Lead `novo`; os já no funil não voltam |
| 7 | `/funil` — arrastar card entre colunas | Status muda, e **volta** se arrastar de volta (F024) |
| 8 | Abrir um Lead → aba **Diagnóstico** | Performance do site, Dores, origem do score |
| 9 | Aba **Abordagem** → gerar abordagem, follow-up e roteiro falado | Sai na hora (não usa IA desde 16/08). Botões de WhatsApp e copiar funcionam |
| 10 | Aba **Objeções** | Catálogo preenchido, não tela vazia |
| 11 | Aba **Proposta** num Lead ainda não qualificado | Aparece **fechada, explicando por quê** |
| 12 | Mover o Lead pra `qualificado` → aba Proposta | Abre. Gerar proposta → sai **PDF** |
| 13 | `/tarefas` — Central de Tarefas | Cobra o que ficou pendente |
| 14 | `/configuracao` | Modo Orion, tema, ranking — salvam e persistem |

### Já conhecidos — não perder tempo reportando

- **`/api/localidades/<UF>` demora** (26s numa medição local, campo Cidade fica
  desabilitado enquanto isso). Provavelmente cold start; se acontecer em staging
  com o app já quente, aí sim é achado.
- **Suspeita não confirmada:** o formulário de busca pode limpar Nicho e Estado
  quando a busca dá erro. Se der erro, olhar isso de propósito.
- **`/planos` responde 404** — de propósito (pausa da F035).
- **Não há tela de planos nem diferença visível entre Free e Pro** além do número
  do medidor na topbar. Também de propósito.

---

## Parte 2 — três coisas travam o deploy de prod

Não são opinião: são os próprios portões do runbook, e **hoje estão abertos**.
Verificado em 19/08 pela manhã.

### 1. O teste do Pro não foi ligado ⛔ — o mais sério

`HUBLA_PRODUCT_ID_PRO` **não existe em Production** (conferido hoje: só
`HUBLA_PRODUCT_ID` está lá), e os entitlements não foram concedidos.

#### Por que dar 1 mês de Pro de cortesia pra todo mundo

O revamp traz uma coisa que produção não tem: **teto mensal**. Free = 40 Leads
novos/mês. O número não é chute nem maldade — é o free tier do Google dividido
pelos alunos ([11 §4](../specs/11-custos-e-precificacao.md)). Como régua, está
certo.

O problema é **em quem ela cai**. Medido em produção em 18/08: a base criou
**1.385 Leads em 7 dias** com ~28 alunos ativos — da ordem de **200 Leads por
aluno por mês, 5× o teto**. Subir o revamp sem mais nada não seria "limitar":
seria **cortar o uso real da base em ~95%, da noite pro dia**, em gente que
nunca teve teto nenhum.

E o aluno que estourasse não teria saída: `/planos` responde **404** de
propósito, porque não existe plano pago pra vender enquanto os `product_id`
reais não estiverem na Hubla. Ou seja, ele bateria num muro que diz "acabou" e
não oferece nada. Cobrar antes de ter o que vender é a pior ordem possível.

O mês de cortesia **separa as duas coisas**: o revamp entrega agora, a cobrança
começa quando houver o que cobrar.

**Custa pouco.** Um Pro no teto dá R$6,34/mês. 56 alunos no Pro = 840
requisições Places/mês, **dentro das 1.000 grátis** da conta. O mês inteiro sai
por R$100–130 — barato o bastante pra não ser decisão difícil.

**O aluno não vê nada disso.** `PLANOS_NA_UI` continua `false`: o medidor da
topbar passa a ler `x/300` em vez de `x/40`, e a palavra "plano" não aparece em
lugar nenhum. Não é exceção à pausa da F035 — é a pausa funcionando como foi
projetada.

**E não resolve, adia.** Em **18/09** todos voltam pros 40 com a `/planos` ainda
em 404, a menos que os `product_id` de verdade existam na Hubla até lá. É por
isso que tem prazo em vez de ser permanente: o mês compra tempo pra construir o
produto pago, não substitui a decisão.

Detalhamento completo na
[F035, "Período de teste do Pro"](../specs/02-features/F035-planos-e-limites.md).

#### Como ligar

O runbook §5.1 é explícito: **isto roda ANTES do §6**, e é o que faz o revamp
acordar com todo mundo já no Pro — sem nenhum minuto de teto de 40. Os
entitlements são inertes para a Fase 2, que não tem lógica de plano, então
gravá-los antes do deploy é seguro.

```bash
DATABASE_URL="<prod>" node scripts/conceder-trial-pro.mjs --dry-run   # confere a lista
DATABASE_URL="<prod>" node scripts/conceder-trial-pro.mjs             # concede aos 56
# + criar HUBLA_PRODUCT_ID_PRO=trial-pro-2026-09 em Production, no painel da Vercel
```

Desfaz com `--revogar`, ou **apagando a variável** — que devolve todo mundo ao
Free na hora, sem deploy. É também o interruptor de emergência do dia: se algo
cheirar mal depois que subir, some com a variável.

### 2. Backup do Neon não foi criado ⛔

Runbook §3.3: branch do Neon a partir do banco de produção, nomeada com a data
(ex.: `pre-revamp-2026-08-19`). É instantânea, e é **o único rollback de banco
que existe**. O nome tem que ser anotado no runbook antes de seguir.

### 3. Como as migrações chegam no banco — decidir ⚠️

`DIRECT_URL` não está em Production, e o `schema.prisma` só declara
`DATABASE_URL`, que aponta pro host `-pooler` (errado para DDL). Na prática
sobra a **opção A** do §3.4: rodar `migrate deploy` à mão exportando o endpoint
**direto** do Neon (sem `-pooler`) só na sessão do terminal.

Funciona — foi o que fizeram no staging. Só exige não errar o copiar-colar.

---

## Parte 3 — subir à tarde

Só começa com a Parte 1 sem achado bloqueante e os **três itens da Parte 2
resolvidos**. A partir daqui quem manda é o
[RUNBOOK-PROD-REVAMP §6](RUNBOOK-PROD-REVAMP.md#6-execução) — seguir de lá, na
ordem, com o terminal aberto.

Resumo do que vai acontecer:

1. Conceder o trial Pro e ligar a variável (Parte 2, item 1) — **antes de tudo**;
2. Reconfirmar no banco de prod: `SELECT count(*) FROM "Outreach" WHERE canal = 'email';` tem que dar **0** (por quê, abaixo);
3. Criar a branch de backup no Neon e anotar o nome;
4. `npx prisma migrate status` com o host direto — ver o que falta, sem aplicar;
5. `npx prisma migrate deploy` — aplica as **13** migrações;
6. `git checkout main && git merge feature/security-hardening-revamp && git push origin main` — o merge dispara o deploy sozinho.

**Entre o 5 e o 6 existe uma janela** em que gravação de cota pode falhar: o
banco já renomeou o enum (`outreach` → `abordagem`) e o código antigo ainda
grava o valor velho. Escolher horário de baixo uso (a base faz ~4 sessões/dia) e
**não parar no meio**.

#### Por que conferir o `canal = 'email'` antes (passo 2)

O canal e-mail foi **desfeito** no revamp (F027), e a migração 13
(`canal_email_sai_do_enum`) tira `email` do enum `Canal`. Postgres não remove
valor de enum: o tipo é recriado e a coluna convertida com
`USING canal::text::"Canal"` — e **essa conversão falha se sobrar uma linha com
`'email'`**.

A migração antecipa essa falha de propósito: ela conta primeiro e levanta uma
exceção legível com o número, em vez de deixar o erro cru do cast aparecer no
meio do deploy. Isso é escolha de projeto, não defeito — está escrito no SQL:

> uma Abordagem com `canal=email` é **registro de contato que foi feito**.
> Apagar ou reescrever pra `whatsapp` seria mentir sobre o histórico do aluno.

**Por que conferir ANTES em vez de deixar a migração reclamar na hora:** a 13
roda logo depois da **12** (`outreach_vira_abordagem`), que é a de risco alto.
Se a 13 abortar, a 12 **já aplicou** — o banco já só conhece `'abordagem'`, o
código da Fase 2 ainda em produção ainda grava `'outreach'`, e nenhum código
novo subiu. Ou seja: você fica **parado dentro da janela**, que é o pior lugar
possível pra estar. Dois segundos de `SELECT` evitam isso.

**O que esperar:** **0**. O canal e-mail nunca foi implementado em produção — o
valor existe no enum desde a F005, mas quem o ligaria era a F027, que foi
desfeita antes de chegar lá. Medido em 18/08: `0`. A reconferência perto da hora
é formalidade barata, não desconfiança.

**Se vier > 0, pare.** Não é problema de infra, é decisão de produto: as saídas
são arquivar, exportar, ou manter `email` no enum (e adiar a migração 13). Não
existe saída que apague o histórico.

### Verificação depois

```bash
curl -s https://orion-lead-hunter.devemdobro.com/api/health | jq
```

200 com `ok: true`, `regiao: gru1`. Se o `rtt_ms` vier alto, é o Neon acordando
— chamar de novo antes de entrar em pânico.

Depois, o caminho do aluno numa conta real: buscar → Fila do dia → aprofundar →
abordar → card anda no kanban → Central de Tarefas cobra. E **Sentry aberto na
primeira meia hora** — é onde a quebra de cota da janela apareceria.

### Se der errado

Código volta num clique (Instant Rollback da Vercel). Banco não: as migrações
1–11 são aditivas e não atrapalham a Fase 2 rodando, mas a 13 (`Canal` sem
`email`) só volta restaurando backup, e restaurar backup **perde o que os alunos
fizeram desde o deploy**. Por isso: **reverter o código primeiro**, pensar no
banco com calma depois.

---

## Ressalva honesta sobre o staging como ensaio

O banco de staging tem **duas migrações que não existem no repo**
(`f021_pipeline_crm` e `f022_proposta_persistida`, das branches F021/F022 que
estão fora de escopo). O schema testado lá **não é** exatamente o que produção
vai ter.

As 13 migrações do lote passaram no staging, o que é evidência boa sobre os
`ALTER TYPE` — mas "rodou no staging" vale um pouco menos do que parece.
