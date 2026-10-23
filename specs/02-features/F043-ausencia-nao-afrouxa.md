# F043 — Ausência não afrouxa (webhooks Hubla e TMB)

## Status
**Especificada — código pendente.** Escrita em 2026-09-20, antes do código.

## Origem
Os dois achados que sobraram da revisão de defaults inseguros de 2026-09-20 —
os mesmos sete de onde saiu a [F042](F042-posse-do-email-de-compra.md). Uma
regra só atravessa as duas seções: **o que falta não concede**.

## Correção de rota sobre o achado original

A revisão classificou como "default inseguro" a allowlist Elite do TMB caindo na
constante `TMB_ELITE_CODES_DEFAULT` quando `TMB_ELITE_CODES` está ausente, e
recomendou exigir a env com `503`. **Está errado nos dois pontos:**

1. A [F041](F041-webhook-tmb.md) §Ofertas **documenta** esse default — *"Default
   da allowlist de acesso = Elite + Mentoria. Override Elite: `TMB_ELITE_CODES`
   (preferido) ou `TMB_PRODUCT_CODES` (legado)"* — e lista os três codes numa
   tabela. É decisão especificada, com a env no papel de *override*, não de
   requisito. Não é o mesmo caso que a [F036](F036-endurecimento-de-seguranca.md)
   §5 fechou na Hubla, onde ausência virava "aceita qualquer produto".
2. Exigir a env **quebraria produção hoje**: ela não está setada lá, nem no
   `.env.example` fora de comentário. O deploy responderia `503` a todo webhook
   TMB e pararia de conceder acesso a quem compra.

O que sobra do achado é real, mas é outra coisa: quando a allowlist não
reconhece um code, **ninguém é avisado**. Isso é a §2.

---

## 1. Campo ausente no payload não concede

Dois lugares com a mesma expressão, e a mesma consequência: o filtro só filtra
quando o campo aparece. Se o provedor omitir o campo, a ausência herda "aceita"
por acidente da forma do `if`.

### 1a. Hubla — `subscription.status`

Hoje: `if (subStatus && subStatus !== "active") ignorar`.

| Payload | Hoje | Novo |
|---------|------|------|
| sem objeto `subscription` | concede | **concede** — compra avulsa/boleto não tem assinatura |
| `status: "active"` | concede | concede |
| `status: "canceled"` (ou qualquer outro) | ignora | ignora |
| objeto presente, `status` **ausente ou vazio** | **concede** | **ignora** |

A regra nova: *objeto presente ⇒ `status` tem que existir **e** ser `active`*.

Só a última linha muda. Isso é deliberado: exigir `subscription` sempre
quebraria a compra avulsa, que é como o Elite de R$ 997 entra. A
[F019](F019-webhook-hubla.md) dizia "se subscription `active`" sem decidir o caso
do objeto pela metade — esta spec decide.

### 1b. TMB — `lancamento_id`

Hoje: com `TMB_LANCAMENTO_ID` configurada, `if (lid && lid !== filtro) ignorar`.

| Payload | Filtro configurado | Hoje | Novo |
|---------|--------------------|------|------|
| `lancamento_id` igual ao filtro | sim | concede | concede |
| `lancamento_id` diferente | sim | ignora | ignora |
| `lancamento_id` **ausente** | sim | **concede** | **ignora** |
| qualquer | **não** | concede | concede — filtro que não existe não filtra |

Impacto em produção hoje: **nenhum**. `TMB_LANCAMENTO_ID` está comentada, então a
última linha é a que vale. A mudança só morde quando alguém liga o filtro — e
aí ele passa a valer de verdade, que é o motivo de existir.

### Por que isso importa mesmo com token no webhook

O token continua sendo a porta. Mas "ausência concede" não depende de atacante:
basta o provedor mudar o formato e parar de mandar um campo. Nesse dia, um filtro
que ninguém tocou para de filtrar, em silêncio. A decisão tem que estar escrita —
hoje ela não foi tomada, foi herdada da expressão.

---

## 2. Ignorar e conceder-para-nada precisam aparecer

Três situações hoje terminam em `200` sem deixar rastro. Duas são config
desatualizada; a terceira é pior, porque o aluno fica sem acesso e nada explica.

| Situação | Hoje | Novo |
|----------|------|------|
| TMB: `code` fora da allowlist | `200`, `motivo: "code fora das ofertas de acesso"` | idem + **aviso registrado** com o code |
| Hubla: produto fora da allowlist | `200` ignorado ([F019](F019-webhook-hubla.md) AC8) | idem + **aviso** com o product id |
| Hubla: grant gravado com chave que a porta **não** reconhece | entitlement ativo, aluno **sem acesso**, nada registrado | idem + **aviso**, com a chave |

A terceira merece detalhe, porque é o caso que morde hoje. Com `offers[]` no
payload e nenhuma oferta casando as envs, o grant é gravado com
`chaveEntitlement = offerIds[0]` — o offer id cru. Só que a porta
(`/ativar-acesso`, F019.1) compara contra a lista montada **das envs**. Offer id
que não está em nenhuma env não está na lista: o `HublaEntitlement` fica `ativo`
e o comprador continua barrado.

É exatamente o que acontece se `HUBLA_OFFER_ID_PRO` estiver vazia ou
desatualizada — e ela está comentada no `.env.example`. O sintoma chega como
"comprei e não entra", sem nada no log ligando uma coisa à outra.

**O aviso registra o id, nunca o e-mail.** Code, product id e offer id são
identificadores de oferta; e-mail de comprador é dado pessoal e não entra em log
(a F036 já deixou auditoria de segurança fora de escopo, e isto não é auditoria
— é diagnóstico de configuração).

Não muda status HTTP nenhum: `200` continua sendo a resposta certa para evento
ignorado. O que muda é haver rastro.

---

## Critérios de aceitação

- [ ] **AC1** — `customer.member_added` com `subscription` presente e `status`
      ausente ou vazio → **ignorado**, sem gravar entitlement.
- [ ] **AC2** — `customer.member_added` **sem** objeto `subscription` → concede,
      exatamente como hoje. Compra avulsa não regride.
- [ ] **AC3** — `subscription.status = "active"` → concede; qualquer outro valor
      → ignora. Sem mudança.
- [ ] **AC4** — Com `TMB_LANCAMENTO_ID` configurada, venda sem `lancamento_id` →
      **ignorada**.
- [ ] **AC5** — Sem `TMB_LANCAMENTO_ID`, venda sem `lancamento_id` → concede.
      Ligar o filtro é opt-in e continua sendo.
- [ ] **AC6** — `TMB_ELITE_CODES` ausente continua caindo no default
      documentado na F041, **sem** `503`. Produção não quebra.
- [ ] **AC7** — `code` TMB fora da allowlist → `200` ignorado **e** um aviso
      registrado contendo o code.
- [ ] **AC8** — Evento Hubla de produto fora da allowlist → `200` ignorado **e**
      aviso com o product id.
- [ ] **AC9** — Grant Hubla cuja `chaveEntitlement` não está em
      `idsChaveAcessoHubla()` → entitlement gravado (comportamento atual
      preservado) **e** aviso apontando a chave e a env que a reconheceria.
- [ ] **AC10** — Nenhum aviso desta feature contém e-mail de comprador.

## Decisões de implementação

- **A regra fica no `interpretar` puro**, não nas rotas: as duas funções já são
  testáveis sem Prisma nem Next, e é lá que os testes do AC1–AC5 vivem.
- **Aviso via `console.warn`** com prefixo do módulo (`[hubla/webhook]`,
  `[tmb/webhook]`), padrão que as duas rotas já usam no `catch`. Chega no log da
  Vercel sem depender do Sentry estar configurado; o Sentry, quando há DSN,
  captura junto pela integração de console que a ADR-013 já instalou.
- **Nada de contador nem tabela.** Rastro em log resolve o diagnóstico; métrica
  de webhook ignorado seria outra feature.
- **`TMB_ELITE_CODES` segue opcional.** Ver a correção de rota no topo.
- Sem lib nova ⇒ **sem ADR**. Sem worker ⇒ ADR-002 de pé.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| **Exigir `TMB_ELITE_CODES` com `503`**, como a F036 §5 fez na Hubla | Quebra produção hoje (env ausente lá) e contradiz a F041, que especifica o default com a env como override. O caso da Hubla era diferente: lá ausência virava "aceita qualquer produto" |
| **Exigir `subscription` em todo grant** | Quebra a compra avulsa — o Elite de R$ 997 é boleto, não assinatura |
| **Devolver `4xx` em evento ignorado**, para o provedor reenviar | Evento ignorado não é erro do provedor; `4xx` provocaria retentativa infinita de um evento que nunca vai interessar |
| **Bloquear o grant quando a chave não está na allowlist de acesso** (§2, 3ª linha) | Trocaria "entitlement inútil, aluno barrado" por "nenhum entitlement, aluno barrado" — mesma dor, e perderia o registro de que a compra existiu. O aviso resolve o diagnóstico sem apagar dado |
| **Registrar o e-mail no aviso**, para achar o aluno afetado | Dado pessoal em log. O offer id basta para achar a env errada, e é a env que se corrige |

## Fora do escopo (F043)

- **Contrato do webhook TMB em `/specs/03-contracts/`.** Só a Hubla tem um; o
  TMB vive na prosa da F041. Vale escrever, não aqui.
- **Métrica / alerta** de webhook ignorado (contagem, limiar, notificação).
  Esta spec entrega rastro, não monitoramento.
- **Auditoria de eventos de segurança** — segue fora, como na F036.
- **Rever a lista de codes TMB** ou pedir à TMB um code novo: decisão de
  operação, não de código.
- **Normalizar `chaveEntitlement`** para sempre cair numa chave reconhecida pela
  porta. É mudança de regra de concessão (F019 AC10/AC11), pesa mais que esta
  feature e merece spec própria se virar problema recorrente.
