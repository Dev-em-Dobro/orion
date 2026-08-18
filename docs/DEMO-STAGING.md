# Demo do Orion no staging — roteiro

> Escrito em 2026-08-17, contra o staging que está no ar hoje
> (deploy `dpl_Fap7BB…`, branch `feature/security-hardening-revamp`).

## O link

**https://staging.orion-lead-hunter.devemdobro.com**

---

## Antes de marcar: dois bloqueios

Os dois foram verificados hoje. Nenhum é difícil de resolver, mas nenhum se
resolve na hora da demo.

### 1. O staging está atrás do SSO da Vercel

Testei `/planos`, `/login`, `/termos` e `/api/health` — **todos** devolvem `302`
pra `vercel.com/sso-api`. Quem não está logado no time `dev-em-dobros-projects`
da Vercel não passa da porta. Não é o login do Orion, é uma camada antes dele.

Saídas, em ordem de preferência:

- **Adicionar o Beto ao time da Vercel** — ele loga com a conta dele e passa.
- **Protection Bypass for Automation** — gera um token e uma URL com query
  string; funciona sem conta, mas o link vaza acesso pra quem o receber.
- **Desligar Deployment Protection** nos previews — abre o staging pra internet
  inteira. Só se o dado lá dentro puder ser público, e ele **não pode** (ver
  bloqueio 2).

### 2. Use só a conta de demonstração — as outras são de alunos reais

**A conta da demo é `cadudias@hotmail.com`**, cedida pelo Ricardo pra isso.

As outras 48 contas do staging são de **alunos reais**, com e-mail pessoal e a
base de prospecção deles. Entrar numa dessas pra demonstrar é mostrar o trabalho
de outra pessoa pra plateia. Não faça.

O que a conta de demo tem hoje (conferido em 2026-08-17):

| status | Leads | com Diagnóstico |
|---|---|---|
| `novo` | 32 | 0 |
| `priorizado` | 4 | 4 |
| `enriquecido` | 2 | 2 |
| `contatado` | 1 | 1 |
| **`proposta`** | **1** | 1 |

Mais **1 Abordagem já gerada**. Dá pra rodar o roteiro inteiro sem gerar nada
novo — inclusive o passo da proposta, que precisa de um Lead a partir de
`qualificado` (F012, emenda) e é o único Lead nesse estágio no staging todo.

> **Cheque o Lead em `proposta` antes de apresentar.** Ele é o último passo do
> roteiro e é único — se alguém o mover no funil entre agora e a demo, a aba
> Proposta fecha e o final do roteiro cai.

### Se a conta secar

O repositório tem um script que popula uma conta com Leads em **todos** os
estágios, inclusive `proposta`:

```bash
DATABASE_URL="<URL do Neon de STAGING>" npx tsx scripts/seed-dev.mts cadudias@hotmail.com
```

- É **idempotente**: apaga os Leads `demo-*` e recria. Não encosta nos Leads
  reais da conta.
- Cria o usuário se não existir e marca a compra (entitlement de acesso).
- **Nunca rodar contra produção** — o próprio script avisa.

---

## Como entrar

1. Abrir **https://staging.orion-lead-hunter.devemdobro.com** (passando o SSO,
   ver bloqueio 1).
2. Digitar **`cadudias@hotmail.com`** e clicar **"Enviar link de acesso"**.
3. **Abrir a caixa de entrada de verdade.** O staging manda e-mail pelo Resend
   (SMTP real) — **não** existe Mailpit lá; o Mailpit é só do ambiente local
   (`http://127.0.0.1:8025`). O assunto é *"Seu link de acesso — Orion Lead
   Hunter"*.
4. Clicar em **"Entrar no Orion Lead Hunter"**. O link vale poucos minutos.

> **O e-mail cai na caixa do Ricardo (Hotmail).** Sem acesso a ela, o Beto não
> completa o login sozinho — alguém precisa repassar o link, e ele expira em
> poucos minutos.
>
> Por isso: **o Beto entra antes**, com o Ricardo junto, e deixa a sessão aberta
> até a hora de apresentar. Magic link ao vivo, dependendo da caixa de entrada de
> outra pessoa, é o jeito mais fácil de a demo começar travada.

---

## O roteiro

### 1. Listagem de Leads — `/leads`

A porta de entrada. Grid de cards, um por Lead, com o badge de score dizendo
**o quanto confiar** nele (score confirmado por Diagnóstico vs. estimado pela
Triagem) e a Dor principal. Em cima, os filtros por estágio — *Prontos*,
*Abordados*, *Responderam*, *Qualificados* — que são atalho pra mesma lista
recortada.

Ponto a fazer: **o card diz por que aquele Lead, não onde ele está.**

### 2. Mandar um Lead pro Funil

No card (ou selecionando vários e usando a barra de seleção em massa), o botão
**"Mandar pro Funil"**.

Detalhe que vale explicar: a ação só age em Lead com status `novo` — quem já
está no funil não volta pro começo por engano.

### 3. O Funil — `/funil`

Kanban com sete colunas, nesta ordem:

**Prontos** → **Abordados** → **Responderam** → **Qualificados** → **Proposta**
→ **Ganhos** / **Perdidos**

Arrastar o card entre colunas muda o status do Lead. É aqui que dá pra mostrar
que o estado é **reversível** (F024): arrastou pra coluna errada, arrasta de
volta, nada se perde.

### 4. Dentro do Lead

Clicar no card abre o detalhe, com quatro abas:

| Aba | O que mostra |
|---|---|
| **Diagnóstico** | performance do site, as Dores detectadas, o score e de onde ele veio |
| **Abordagem** | a mensagem pronta |
| **Objeções** | o que fazer quando o dono reclamar |
| **Proposta** | só abre a partir de `qualificado` |

### 5. Gerar a mensagem de WhatsApp — aba **Abordagem**

Três botões, e a diferença entre eles é o ponto da demo:

- **Gerar abordagem** — a primeira mensagem.
- **Gerar follow-up** — a segunda, pra quem não respondeu.
- **Gerar roteiro falado** (canal ligação) — o mesmo argumento, mas pra falar no
  telefone. Sem URL, porque ninguém soletra link.

Gerada a mensagem, aparecem **"Abrir no WhatsApp"** (abre a conversa com o
número do Lead) e **"Copiar texto"** / **"Copiar roteiro"**.

Vale dizer em voz alta: **a Abordagem não é gerada por IA desde 2026-08-16** —
é montada em código a partir do Diagnóstico. Por isso é instantânea e ilimitada.

### 6. Objeções — aba **Objeções**

Catálogo curado: as objeções que o dono de negócio realmente levanta, com a
resposta pronta pra cada uma. Não é tela vazia esperando IA.

### 7. Proposta — aba **Proposta**

Aqui entra o Lead que já está na coluna **Proposta** do funil. A aba só abre a
partir de `qualificado`: proposta antes de qualificar é proposta no escuro — nas
outras abas ela aparece fechada, explicando por quê.

Botão **"Gerar proposta"** → sai em **PDF**.

O caminho mais bonito pra chegar aqui é pelo funil: abrir `/funil`, apontar o
card na coluna *Proposta* e clicar nele. Assim a plateia vê **de onde** o Lead
veio, em vez de aparecer um Lead do nada já qualificado.

---

## Sobre demonstrar o plano Pro

Você pediu "pode ser uma conta do plano Pro também". Duas coisas atrapalham:

1. **O staging não tem `HUBLA_PRODUCT_ID_PRO` configurado na Vercel.** Sem essa
   variável, `planoDoUsuario()` devolve `free` pra todo mundo — mesmo que o seed
   grave o entitlement de Pro no banco. Pra valer, seria adicionar a variável no
   ambiente Preview e redeployar.
2. **Depois da pausa da F035 (subida hoje), plano quase não aparece na UI.** Não
   há mais tela de planos, nem "Ver planos", nem "Plano Pro" no medidor. A única
   diferença visível entre Free e Pro é o número do medidor da topbar: `x/40`
   contra `x/300`.

Ou seja: dá pra fazer, mas o que a plateia veria de diferente é um número. Se a
ideia era mostrar "o que o aluno ganha pagando", hoje não há o que mostrar — e
isso é proposital enquanto não existir plano pago de verdade na Hubla.

---

## O que evitar na demo

- **Buscar Leads novos ao vivo.** Consome cota de verdade da chave do Google e
  depende de latência externa. Se for buscar, buscar antes e mostrar o
  resultado.
- **Entrar na conta de qualquer aluno real** — ver bloqueio 2.
- **Prometer a tela de planos.** Ela está fora do ar de propósito (F035, pausa de
  2026-08-17).
