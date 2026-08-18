# Runbook — levar o revamp (Fase 3) para produção

> **Status:** escrito em 2026-08-17, **ainda não executado**. Produção roda a
> Fase 2 (`main`); o revamp vive em `feature/security-hardening-revamp`.
>
> Este documento é pra ser lido **no dia**, na ordem, com o terminal aberto. Ele
> não decide se vale a pena subir — decide **como**, se você já decidiu que sim.

---

## 1. O que vai subir

`origin/main..feature/security-hardening-revamp`:

| | |
|---|---|
| Commits | **78** |
| Arquivos | **373** (+31.356 / −3.264) |
| Migrações novas | **14** |
| `schema.prisma` | +181 linhas |
| Features | **F024–F040** (o `specs/10-revamp-do-fluxo.md` cobre F024–F034; F035–F040 nasceram depois e não estão no plano mestre) |

Produção hoje **não tem nada disso**: nem Fila do dia, nem Central de Tarefas,
nem kanban, nem planos, nem Agente. Não é atualização incremental — é o app
mudando de forma debaixo de alunos que já usam o antigo.

**Fora de escopo:** as branches `F021`, `F022`, `F023` seguem sem entrar
(decisão do §7 do plano mestre). Nada a fazer com elas.

---

## 2. A assimetria que organiza tudo

**Código a Vercel reverte num clique. Banco, não.**

Todo o resto deste runbook existe por causa dessa frase. As decisões que parecem
paranoia (branch do Neon antes, checagem read-only antes, janela de parada) são
o que compra o direito de errar no lado que não tem desfazer.

---

## 3. Pré-voo — dias antes, tudo read-only

Nada aqui altera produção. Se qualquer item falhar, **o deploy não tem data**
até resolver.

### 3.1. A checagem que pode cancelar o dia

A migração `20260813210000_canal_email_sai_do_enum` **aborta de propósito** se
existir qualquer Abordagem com `canal = 'email'`. Ela levanta uma exceção com a
contagem, em vez de deixar o cast estourar cru no meio do deploy.

```sql
SELECT count(*) FROM "Outreach" WHERE canal = 'email';
```

- **0** → segue o jogo.
- **> 0** → **pare**. Isso é decisão de produto, não de infra: uma Abordagem com
  `canal=email` é registro de contato que **foi feito**. Apagar ou reescrever
  pra `whatsapp` seria mentir sobre o histórico do aluno. As saídas são
  arquivar, exportar, ou manter `email` no enum (e adiar a F035/F038). O próprio
  SQL da migração documenta esse raciocínio.

### 3.2. Os alunos que já configuraram chave própria (BYOK)

> **Decidido em 2026-08-17 — o BYOK acabou.** Todo mundo passa a usar as chaves
> da plataforma; quem precisa de mais volume sobe de plano. Implementado no
> commit `5717a5e` (F016, "Encerramento"), com migração que **apaga** as chaves
> salvas.
>
> O que isso muda **neste runbook**: a migração `20260817180000_fim_do_byok_-`
> `apaga_chaves` entra na fila do §4 e é **irreversível** — ciphertext apagado
> não volta nem com a master key. Confira antes quantas contas de produção
> perdem chave (a consulta abaixo), porque são pessoas que vão notar.
>
> **Dependência que isso cria:** a frase "quem quiser mais sobe de plano" só é
> verdade se existir plano pago no dia do deploy. Hoje não existe —
> `HUBLA_PRODUCT_ID_PRO`/`AGENCIA` não estão configurados, e `/planos` está fora
> do ar pela pausa da F035. **Ou o plano pago existe até lá, ou o aluno que
> perder a chave própria fica sem caminho nenhum.** Decidir isso é pré-requisito
> do deploy, não detalhe.

**Rode isto no banco de produção antes do dia** — é quem vai perder chave:

```sql
SELECT key_mode, count(*) AS contas,
       count(*) FILTER (WHERE google_ciphertext    IS NOT NULL) AS com_google,
       count(*) FILTER (WHERE anthropic_ciphertext IS NOT NULL) AS com_anthropic
FROM user_api_keys GROUP BY key_mode ORDER BY key_mode;
```

*(A tabela chama `user_api_keys` no banco — o model Prisma é `UserApiKeys` com
`@@map`. Consultar pelo nome do model dá "relation does not exist".)*

No staging, em 2026-08-17: **1 conta em `byok`, 34 em `orion`** — e 32 das de
`orion` ainda tinham chave do Google guardada, sem uso. Se prod tiver a mesma
proporção, o número de gente que sente a mudança é pequeno; o número de
credenciais que saem do banco, não.

**Se houver conta em `byok` em produção, avise essas pessoas antes.** Elas
colaram uma chave que vai deixar de existir, e ficam limitadas ao Free até
haver plano pago. É mudança de contrato — melhor dita na cara do que descoberta
batendo no limite.

Depois da migração, o AC11 da F016 confere o resultado:

```sql
SELECT count(*) AS linhas,
       count(*) FILTER (WHERE key_mode <> 'orion') AS fora_de_orion,
       count(*) FILTER (WHERE google_ciphertext IS NOT NULL
                          OR anthropic_ciphertext IS NOT NULL
                          OR openai_ciphertext IS NOT NULL
                          OR gemini_ciphertext IS NOT NULL
                          OR screenshotone_ciphertext IS NOT NULL) AS com_chave
FROM user_api_keys;
```

As três colunas depois da primeira têm que vir **zero**.

### 3.3. Backup que presta

Criar uma **branch do Neon** a partir do banco de produção, nomeada com a data
(ex.: `pre-revamp-2026-08-20`). É instantânea e é o único rollback real de
banco que existe aqui.

Anotar o nome/ID da branch **neste documento** antes de continuar.

### 3.4. Como as migrações vão chegar no banco

O `prisma/schema.prisma` declara **só** `url = env("DATABASE_URL")` — não há
`directUrl`. E o `DATABASE_URL` de produção aponta pro host **`-pooler`**
(PgBouncer, `connection_limit=1`), que é o certo pra serverless e o **errado**
pra DDL.

Criar a variável `DIRECT_URL` na Vercel, sozinha, **não faz nada** — o Prisma
não a lê enquanto o schema não declarar. Duas saídas:

| Opção | O que dá | Custo |
|---|---|---|
| **A — rodar à mão com o host direto** (foi o que fizeram no staging, ver ADR-015 §"Estado das outras decisões") | Exporta `DATABASE_URL` = endpoint **direto** do Neon de prod (sem `-pooler`) só na sessão do terminal e roda o `migrate deploy` da sua máquina | Zero código. Depende de ninguém errar o copiar-colar do host |
| **B — declarar `directUrl` no schema** | `directUrl = env("DIRECT_URL")` no bloco `datasource`, + a variável em Preview e Production | É mudança de código: entra na branch, com spec/ADR se for virar permanente. Resolve de vez |

A ADR-015 já aponta pra **B** como o estado desejado ("o endpoint direto fica
reservado às migrações"), e registra a ausência como pendência. Se houver tempo,
faça B antes do dia — vira uma decisão a menos sob pressão.

### 3.5. Variáveis de ambiente de produção

Conferidas em 2026-08-17. Nenhuma **bloqueia** o deploy; duas caem em default
silencioso e uma ausência é desejada:

| Variável | Situação | Efeito se ficar como está |
|---|---|---|
| `DEMOS_BASE_URL` | ausente em Production | O link do site de amostra (F038) **não aparece** na Abordagem. Não quebra — nasce sem a feature |
| `SENTRY_TRACES_SAMPLE_RATE` | ausente | Cai no default 0.1 de produção (ADR-015 decisão 3, que a própria ADR lista como pendente). É o valor que se quer |
| `HUBLA_PRODUCT_ID_PRO` / `_AGENCIA` | ausentes | **Manter ausentes.** Sem elas `planoDoUsuario` devolve `free` pra todo mundo — que é exatamente a pausa da F035 |
| `BYOK_NOVOS_ALUNOS` | ausente | **Manter ausente.** Desligada, o BYOK não existe pra ninguém (F016, encerramento de 2026-08-17). Ligar em `1` reabriria a tela — mas não devolveria as chaves que a migração 14 apagou |
| `DIRECT_URL` | ausente | Ver 3.4 |

### 3.6. Sincronizar com a `main`

A `main` tem **4 commits** que a branch não tem — entre eles `4c9426b` (script
de grant manual de entitlement, F019.1) e `ec8c2ab` (rename da marca pra Orion).

```bash
git checkout feature/security-hardening-revamp
git merge origin/main
# resolver conflitos, e então:
npm test && npx tsc --noEmit && npm run build
```

Se o merge conflitar em algo não-trivial, **isso é trabalho de outro dia**, não
do dia do deploy.

---

## 4. As 14 migrações, e o risco de cada uma

Na ordem em que rodam. Todas já rodaram no staging — é a evidência de que os
`ALTER TYPE ... ADD VALUE` passam no Postgres do Neon.

| # | Migração | O que faz | Risco |
|---|---|---|---|
| 1 | `indices_desempenho` | 5 `CREATE INDEX` | Baixo. Pode demorar em tabela grande |
| 2 | `lead_status_reversivel` | +2 colunas em `Lead`, `LeadStatus += 'descartado'` | Baixo — `status_em` é `NOT NULL DEFAULT CURRENT_TIMESTAMP` |
| 3 | `sinal_atendimento_automatizado` | +2 colunas, `TipoDor += SEM_ATENDIMENTO_AUTOMATIZADO` | Baixo |
| 4 | `score_estimado_e_cota_diagnostico` | `+score_estimado`, `QuotaOperacao += 'diagnostico'` | Baixo. **Tem backfill**: `UPDATE Lead SET score_estimado=false WHERE score > 0` — os Leads já diagnosticados de prod continuam com score confirmado. Sem isso, todo Lead antigo viraria "score chutado" |
| 5 | `outreach_email` | +3 colunas nulas | Baixo |
| 6 | `central_de_tarefas` | `CREATE TABLE` + índices | Baixo — tabela nova |
| 7 | `cota_agente` | `QuotaOperacao += 'agente_msg'` | Baixo |
| 8 | `uso_mensal_do_plano` | `CREATE TABLE` + índices | Baixo |
| 9 | `uso_mensal_por_operacao` | `CREATE TABLE`, + `DROP INDEX user_purchaseEmail_idx` | Baixo |
| 10 | `perfil_publico_ranking` | `CREATE TABLE` + índice | Baixo |
| 11 | `canal_ligacao` | `Canal += 'ligacao'` | Baixo |
| 12 | **`outreach_vira_abordagem`** | `RENAME VALUE 'outreach' → 'abordagem'` em `QuotaOperacao` e `OperacaoMensal` | **Alto — quebra o código que está em prod agora.** Ver §5 |
| 13 | **`canal_email_sai_do_enum`** | Recria o tipo `Canal` sem `email` | **Alto — aborta se §3.1 não deu 0** |
| 14 | **`fim_do_byok_apaga_chaves`** | Zera as chaves cifradas dos 5 provedores e força `key_mode='orion'` | **Alto — irreversível.** Só DADO, nenhuma coluna cai. Ciphertext apagado não volta nem com a master key. Ver §3.2 |

Todas as colunas `NOT NULL` adicionadas têm `DEFAULT`. Nenhuma falha por tabela
populada.

---

## 5. Por que precisa de janela

A migração 12 renomeia valores de enum que o **código hoje em produção** ainda
escreve. Entre a migração e o deploy do código novo existe um intervalo em que:

- o banco só conhece `'abordagem'`;
- a Fase 2, servindo os alunos, ainda grava `'outreach'`;
- toda gravação de cota nesse intervalo **falha**.

O inverso é igualmente ruim: subir o código novo antes das migrações o faz bater
num schema que não tem as colunas nem as tabelas dele.

Não existe ordem "segura" sem parada. Existem três saídas:

1. **Janela curta assumida** (recomendada) — escolher um horário de baixo uso,
   rodar migrações e merge em sequência imediata, e aceitar alguns minutos em
   que gravação de cota pode falhar. É o mais simples, e o volume de prod hoje
   torna o risco pequeno.
2. **Página de manutenção** — não existe no app. Seria trabalho novo.
3. **Migração em duas fases** (aceitar os dois valores do enum, deploy, depois
   remover o antigo) — o correto em sistema grande, e caro demais pro tamanho
   deste.

**Decidir qual antes do dia, e anotar aqui.**

---

## 6. Execução

Só entra aqui com o §3 inteiro verde.

```bash
# 1. Confirmar de novo, agora perto da hora, que nada mudou
SELECT count(*) FROM "Outreach" WHERE canal = 'email';   -- tem que ser 0

# 2. Branch do Neon (backup) — anotar o nome
#    <feito no console do Neon>

# 3. Ver o que falta aplicar, sem aplicar
DATABASE_URL="<host DIRETO de prod, sem -pooler>" npx prisma migrate status

# 4. Aplicar as 14
DATABASE_URL="<host DIRETO de prod, sem -pooler>" npx prisma migrate deploy

# 5. Código: o merge na main dispara o deploy de Production sozinho
git checkout main && git merge feature/security-hardening-revamp && git push origin main
```

Entre o passo 4 e o 5 é a janela do §5. Não pare pra tomar café no meio.

---

## 7. Verificação

**Primeiro, o health.** Ele não tem auth e falha explicitamente:

```bash
curl -s https://orion-lead-hunter.devemdobro.com/api/health | jq
```

Devolve **200** com `ok: true`, ou **503**. O corpo traz:

- `secrets[]` — um por secret crítico, com `detalhe` quando falha;
- `regiao` — a região da função (deve ser `gru1`, ADR-015);
- `db.rtt_ms` + `rtt_ok` — se vier alto, a primeira chamada pode ser o Neon
  acordando (1.100–3.700 ms na medição do staging). Chamar de novo antes de
  entrar em pânico.

**Depois, o caminho do aluno**, logado numa conta real: buscar Leads → a Fila do
dia aparece → aprofundar um lote → abordar → o card anda no kanban → a Central
de Tarefas cobra. É o fluxo que o revamp inteiro existe pra entregar; se algum
elo não fechar, o deploy não terminou.

**E o Sentry aberto na primeira meia hora.** É onde a quebra de gravação de cota
do §5 apareceria, se aparecer.

---

## 8. Rollback

| O que | Dá pra voltar? | Como |
|---|---|---|
| Código | **Sim, imediato** | Instant Rollback da Vercel pro deploy anterior de Production |
| Migrações 1–11 | Na prática sim, sem pressa | São aditivas. Coluna e tabela a mais não quebram a Fase 2 |
| Migração 12 (`RENAME VALUE`) | Só com SQL manual | `RENAME VALUE 'abordagem' → 'outreach'` desfaz — mas só faz sentido junto com o rollback do código |
| Migração 13 (`Canal` sem `email`) | **Não, sem restaurar backup** | O tipo foi recriado |
| Dados gravados depois do deploy | **Não** | Restaurar a branch do Neon **perde** o que os alunos fizeram desde o deploy |

Ou seja: rollback de código é barato e sempre disponível. Rollback de banco é
uma decisão de perder dados. Se algo der errado, **reverta o código primeiro** e
pense no banco com calma — as migrações aditivas não atrapalham a Fase 2
rodando.

---

## 9. O que fica pendente depois

Não bloqueia o deploy, mas some da cabeça de todo mundo se não ficar escrito:

- **`directUrl` no schema** (se você foi pela opção A do §3.4) — a ADR-015 pede,
  e todo deploy futuro vai reencontrar esse mesmo problema.
- **`DEMOS_BASE_URL`** — sem ela a F038 nasce sem o link de amostra em prod.
- **ADR-015 decisão 3** (sample do Sentry a 0.1) — marcar como resolvida se o
  default cobriu, ou setar a variável.
- **A pausa da F035** — `PLANOS_NA_UI = false` sobe junto. Produção não vai ter
  tela de planos, que é o desejado enquanto não existe `product_id` pago na
  Hubla. Pra religar, ver o bloco "Pausa de 2026-08-17" na spec F035: é o flag
  **mais** recriar o `loading.tsx` da rota.
- **Atualizar o `specs/10-revamp-do-fluxo.md`** — o Status ainda diz "Proposta",
  e o documento não menciona F035–F040.
- **Medir o §8 do plano mestre** — TTFB p95 < 800 ms em `/leads` com 500 Leads,
  > 80% dos Leads abordados recebendo follow-up. São os números que dizem se o
  revamp funcionou; sem medir, o deploy foi só uma troca de código.
