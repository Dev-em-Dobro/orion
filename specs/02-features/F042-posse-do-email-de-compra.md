# F042 — Posse do e-mail de compra

## Status
**Especificada — código pendente.** Spec escrita em 2026-09-20, antes de
qualquer linha, como o `CLAUDE.md` exige. A
[F036](F036-endurecimento-de-seguranca.md) registrou o inverso como dívida de
processo; esta não repete.

## Origem
Revisão de defaults inseguros na `main`, em 2026-09-20, depois do merge do
revamp. Sete achados: três eram pontuais e foram corrigidos direto (comparação
de token do webhook Hubla em tempo variável, default `localhost` do demo,
proteção de symlink que existia só no comentário); dois mudam comportamento
já especificado e são esta feature; dois seguem abertos (allowlist Elite do TMB
embutida no código, e filtros que passam quando o campo falta no payload).

## Objetivo
Duas mudanças no passo 4 da [F019.1](F019.1-ativacao-acesso.md) — a verificação
**manual** em `/ativar-acesso`:

1. **Provar posse** do e-mail de compra antes de vinculá-lo. Hoje basta
   *conhecer* o e-mail.
2. **Parar de responder** se um e-mail comprou ou não, para quem ainda não
   provou posse dele.

Elas vão na mesma feature de propósito. A §3 explica por que separá-las pioraria
as duas.

O que **não** muda: o webhook, a tabela `HublaEntitlement`, a cortesia Pro, o
plano do aluno, e a auto-verificação pelo e-mail de login. Nada aqui altera
quem tem direito a acesso — só como o app confirma que quem pede é quem tem.

---

## 1. Conhecer o e-mail é suficiente hoje

O cadastro é aberto: o magic link do Better Auth não desliga o auto-cadastro,
então qualquer pessoa cria conta com qualquer e-mail. Logada, ela digita em
`/ativar-acesso` o e-mail de compra **de outra pessoa**. A única trava é
primeiro-que-chega, que a F036 §4 instalou.

A cadeia, hoje:

| Passo | Onde |
|-------|------|
| aluno digita e-mail alheio | `verificarCompraAction` |
| entitlement ativo? e-mail livre? | `verificarCompraManual` |
| grava `purchase_email` no `User` | `gravarVerificacao` |
| 90 dias de Pro, se o grant é Elite | `concederCortesiaProSeElite` |
| entregáveis liberados | gate `requireCompraAtiva` |

A F036 §4 resolveu **uma compra → N acessos**. Não resolveu **uma compra →
acesso na conta errada**: quem chega primeiro leva, e o comprador de verdade
depois encontra `CompraJaVinculadaError` na própria compra.

**Por que a F036 não pegou isso:** ela media duplicidade de vínculo, não posse.
São problemas vizinhos com a mesma aparência na tela.

## 2. O formulário responde quem comprou

O passo 4 devolve dois erros distinguíveis: um para "não achei compra nesse
e-mail", outro para "achei, mas já é de outra conta". Duas respostas diferentes
para a mesma pergunta = oráculo. Sem limite de tentativas — a F036 §3 limitou
`/api/auth/*` (20 req/60s por IP) e deixou Server Actions fora, explicitamente —
um laço alimenta e-mails e colhe **a lista de quem comprou o Builders Club**.

Isso é dado pessoal de terceiro vazando por diferença de mensagem. Entra como
risco de LGPD, não só como higiene.

## 3. Por que as duas numa feature só

Resolver a (2) sozinha significa mensagem única para todo mundo. Aí o aluno
legítimo cujo e-mail já está vinculado a outra conta perde a explicação — e a
F036 §4 decidiu justamente o contrário, com razão registrada: *"no manual houve
intenção, e silêncio pareceria bug"*. Consertar o oráculo sozinho reverteria
aquela decisão.

Com a (1) resolvida, a mensagem útil volta **de graça**: depois de provar posse
do e-mail, dizer "esse e-mail já está vinculado a outra conta" não informa nada
a um atacante — ele teria que ter a caixa de entrada. A prova de posse é o que
**compra de volta** a mensagem específica.

Então: uma feature, duas seções, e o desenho é o mesmo.

---

## 4. Fluxo novo (passo 4 da F019.1)

O passo 4 vira dois passos. A tela não bifurca — é isso que mata o oráculo.

**4a. Aluno informa o e-mail da compra.**

| Situação no banco | E-mail enviado | O que a tela diz |
|---|---|---|
| entitlement ativo, e-mail livre | código de 6 dígitos | *"Se houver uma compra nesse e-mail, enviamos um código. Ele vale 15 minutos."* |
| entitlement ativo, e-mail já de outra conta | código de 6 dígitos | **a mesma frase** |
| nenhum entitlement | **nada** | **a mesma frase** |
| limite de tentativas batido | nada | **a mesma frase** |

Em todos os casos a tela avança para o campo do código. Mesma frase, mesmo
próximo passo, nenhum ramo observável.

Quando há entitlement, o código sai mesmo que o e-mail já pertença a outra
conta: quem recebe é o dono da caixa, e é ele quem merece saber o motivo.
Quando não há compra nenhuma, nada é enviado — não se manda e-mail para quem
nunca comprou.

**4b. Aluno informa o código.**

Só aqui o resultado real aparece, porque só aqui houve prova de posse:

| Situação | Resultado |
|---|---|
| código certo, entitlement ativo, e-mail livre | vincula (o que o passo 5 já fazia) e segue para o app |
| código certo, e-mail já de outra conta | `CompraJaVinculadaError` — a mensagem da F036 §4, preservada |
| código certo, entitlement revogado no meio | mensagem de compra não encontrada + link de compra (passo 6) |
| código errado, expirado, já usado, ou **inexistente** | *"Código inválido ou expirado."* — uma resposta só |

O último caso é o que fecha a porta: pedir código para um e-mail que nunca
recebeu desafio responde igual a errar um código de verdade. Chutar não
distingue nada.

## 5. Modelo — `PurchaseEmailChallenge`

Tabela nova. Guarda o desafio em aberto **e** serve de contador de tentativas —
por isso não há segunda tabela.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | string | cuid |
| `user_id` | string | FK `User`, `onDelete: Cascade` |
| `email` | string | e-mail de compra pretendido, já normalizado |
| `code_hash` | string | SHA-256 do código. **Nunca** o código em claro |
| `tentativas` | int | erros de código neste desafio; default 0 |
| `expires_at` | datetime | criação + 15 min |
| `consumed_at` | datetime \| null | preenchido no acerto; uso único |
| `created_at` | datetime | base da contagem de limite |

Índices: `(user_id, created_at)` para o limite por conta, `(email, created_at)`
para o limite por e-mail, `(user_id, email, consumed_at)` para achar o desafio
vigente.

Não é entidade de domínio — é infra da porta de entrada, como `DailyUsage` e
`HublaEntitlement`. Entra no [domain model](../01-domain-model.md) na seção de
relacionamentos, com essa ressalva.

## 6. Limites

| Limite | Valor | Por quê |
|---|---|---|
| validade do código | 15 min | janela curta, e o aluno tem o e-mail aberto |
| erros por desafio | 5 | depois disso o desafio queima; 6 dígitos com 5 chances é 1 em 20 mil |
| desafios por conta | 5 / hora | impede o laço de sondagem numa conta só |
| desafios por e-mail | 3 / hora | impede bombardear a caixa de um comprador a partir de várias contas |

O limite por conta **não** é a defesa principal: o cadastro é aberto, então quem
insiste paga o preço de criar conta a cada 5 sondagens. A defesa principal é a
resposta idêntica da §4a — sem sinal, sondar não devolve informação. Os limites
servem para conter ruído e bombardeio de e-mail.

Estourar limite cai na mesma frase da §4a, nunca em "tente de novo em 40
minutos": contagem revelada é contagem que informa.

## 7. O que continua igual

- **Auto-verificação (passo 3 da F019.1)** — sem desafio, e isso é correto: o
  `user.email` já é comprovado. Magic link só entra na caixa de quem a controla,
  e o login Google traz e-mail verificado pelo Google. Exigir código ali seria
  pedir a mesma prova duas vezes.
- **Exclusividade do vínculo** (F036 §4) — regra intacta; só muda **quando** o
  motivo é revelado.
- **Vínculos já verificados** — nada retroativo. Ninguém precisa reconfirmar.
- **Webhook, entitlement, cortesia Pro, plano** — fora do caminho.
- **Gate** — `/ativar-acesso` continua exigindo sessão e não exigindo compra.

---

## Critérios de aceitação

- [ ] **AC1** — E-mail com entitlement ativo e livre: sai código, e o vínculo só
      é gravado **depois** do código certo. Antes disso, `purchase_email`
      continua nulo.
- [ ] **AC2** — E-mail sem nenhum entitlement: **nenhum e-mail é enviado**, e a
      tela mostra a mesma frase e o mesmo campo de código do AC1.
- [ ] **AC3** — Duas submissões, uma com compra e outra sem, produzem resposta
      indistinguível na tela: mesma mensagem, mesmo próximo passo, mesmo status.
- [ ] **AC4** — Código certo, e-mail já vinculado a outra conta: a mensagem
      específica da F036 §4 aparece, e a segunda conta **não** é liberada.
- [ ] **AC5** — Código para um e-mail que nunca recebeu desafio responde
      exatamente *"Código inválido ou expirado."*
- [ ] **AC6** — Código expirado (> 15 min) e código já consumido dão a mesma
      resposta do AC5. Replay de código consumido não vincula.
- [ ] **AC7** — 5 códigos errados queimam o desafio; a 6ª tentativa, mesmo com o
      código **certo**, não vincula.
- [ ] **AC8** — 6º desafio da mesma conta em 1 hora não envia e-mail e devolve a
      frase da §4a. 4º desafio para o mesmo e-mail em 1 hora, partindo de contas
      diferentes, idem.
- [ ] **AC9** — `code_hash` no banco não permite reconstruir o código: um dump da
      tabela não libera vínculo nenhum.
- [ ] **AC10** — Auto-verificação (e-mail de login = e-mail da compra) continua
      sem formulário e **sem** código — a AC5 da F019.1 segue valendo.
- [ ] **AC11** — Conta com `purchase_verified_at` já preenchido antes desta
      feature continua com acesso, sem novo desafio.
- [ ] **AC12** — Entitlement revogado entre o envio do código e o acerto: não
      vincula, e cai na mensagem de compra não encontrada com link de compra.

## Decisões de implementação

- **Código de 6 dígitos com `crypto.randomInt`**, não `Math.random` — é segredo,
  ainda que de 15 minutos.
- **Guardado como SHA-256**, comparado com o `tokenValido` de
  `lib/seguranca/token` (o comparador em tempo constante que a revisão de
  2026-09-20 extraiu do webhook TMB). Segundo consumidor do módulo; nenhuma
  lib nova.
- **Nenhuma lib nova ⇒ sem ADR.** `node:crypto` é nativo e a infra de e-mail
  transacional já existe (ADR-010).
- **E-mail enviado dentro da Server Action**, síncrono, como o magic link já faz.
  ADR-002 preservado: sem worker, sem fila.
- **O limite não entra em `OPERACOES_COTA`.** A cota diária é consumo de API do
  aluno e aparece no medidor de uso; verificação de compra não é consumo nem
  coisa que o aluno "gasta". O critério registrado na F018/F035 — *cota existe
  onde o mensal não limita consumo de API* — não alcança este caso. Contagem
  sai da própria `PurchaseEmailChallenge`.
- **Uma tabela, dois papéis** (desafio em aberto e histórico de tentativas da
  última hora). Linha consumida ou expirada segue contando para o limite; é o
  que impede o laço de recomeçar de graça.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| **Tirar a verificação manual**: "entre com o e-mail que você usou na compra". Zero tabela, zero e-mail, oráculo some junto | Quebra o caso que justifica o passo 4 existir: quem comprou com um e-mail e usa o app com outro. Joga na mão do suporte uma fila que o desafio resolve em 15 minutos. Fica como plano B se o desafio provar atrito alto demais |
| **Só unificar a mensagem**, sem desafio | Reverte a decisão da F036 §4 e deixa o aluno legítimo sem explicação. E não toca no problema (1): conhecer o e-mail continuaria bastando |
| **Só limitar tentativas**, sem unificar mensagem | Limite atrasa a enumeração, não a impede; e nada resolve da posse |
| **Link mágico em vez de código** | Mesma segurança, mais atrito: obriga trocar de aba/dispositivo no meio de um fluxo que já é de recuperação |

## Fora do escopo (F042)

- **Allowlist Elite do TMB embutida no código** (`TMB_ELITE_CODES` ausente cai
  em constante) — mesmo formato do que a F036 §5 fechou na Hubla. Spec própria.
- **Filtros que passam quando o campo falta** no payload (`lancamento_id` no
  TMB, `subscription.status` na Hubla). Spec própria.
- **Rate limit geral nas Server Actions** — segue fora, como na F036. Esta spec
  limita um fluxo, não instala limitador global.
- **Auditoria de segurança** (quem tentou vincular e-mail de terceiro) — a F036
  já listou como ausente, e continua.
- **Fechar o auto-cadastro** do magic link. Cadastro aberto é decisão de produto
  (o Orion principal é aberto a logados, F019.1 AC1); esta feature protege o
  vínculo de compra sem depender disso.
