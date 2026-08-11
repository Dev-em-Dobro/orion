# F027 — Outreach por e-mail (dentro da plataforma)

## Status
Implementada — 2026-08-10 · parte do [revamp do fluxo](../10-revamp-do-fluxo.md) (Fase C)

## Objetivo
Permitir abordar o Lead **por e-mail** sem sair do Orion: descobrir o e-mail
comercial que o próprio negócio publica no site, gerar **assunto + corpo** com
IA a partir das Dores diagnosticadas, e abrir tudo pronto no cliente de e-mail
do aluno em um clique.

O canal `email` **já existe** no domínio (`Outreach.canal`) desde a
[F005](F005-outreach-whatsapp.md) — nunca foi implementado. A F027 o liga.

Por que importa: muito negócio local não responde WhatsApp de número
desconhecido, mas lê o e-mail do contato@ — e o e-mail aguenta um argumento
mais longo (o diagnóstico técnico completo), que é justamente o diferencial do
Orion.

## Decisão de escopo: **envio não entra nesta rodada**
Decidido em 2026-08-10 (ver [revamp §4](../10-revamp-do-fluxo.md#4-decisões-desta-rodada)):
o Orion **prepara** o e-mail; **quem envia é o cliente de e-mail do aluno**
(via `mailto:`). O Orion **não** opera servidor de saída pra prospecção.

Razões: (a) prospecção fria saindo do domínio da Dev em Dobro queimaria a
reputação usada pelo **magic link de login** (ADR-010); (b) o envio manual
mantém a disciplina LGPD que a [visão](../00-product-vision.md) já fixou;
(c) o e-mail sai da caixa do aluno, então a resposta chega pra ele e a conversa
fica no lugar certo.

Quando (e se) o envio pela plataforma entrar, as opções já levantadas estão em
"Fora do escopo".

## Conceitos

### `Lead.email` — e-mail de contato publicado
E-mail **comercial**, extraído **exclusivamente** do site que o próprio negócio
cadastrou no Google Places ([ADR-016](../04-decisions/ADR-016-leitura-do-site-do-lead.md)),
do mesmo HTML já baixado pelo Diagnóstico ([F026](F026-sinal-atendimento-automatizado.md)).
Zero requisição extra.

`email_origem`: `site` (extraído) | `manual` (o aluno digitou).

**Regras de extração** (`src/lib/leads/extrairEmail.ts`, função pura):
1. Prioridade 1: `href="mailto:…"`.
2. Prioridade 2: e-mail em texto plano no HTML.
3. **Descarta** sempre: `noreply@`/`no-reply@`, endereços de infraestrutura
   (`@sentry.`, `@wixpress.`, `@wordpress.`, `@example.`), qualquer coisa que
   case com nome de arquivo (`…@2x.png`), e endereços com mais de 100 chars.
4. **Prefere** o endereço cujo domínio é o mesmo do site; senão, o primeiro
   válido (é comum o negócio local usar Gmail).
5. Guarda **no máximo 1** endereço por Lead. Não fazemos lista.

**LGPD** — a fronteira, explícita:
- Só endereço **publicado pelo próprio negócio no site dele**, para ser
  contactado. É dado de contato profissional, publicado com essa finalidade.
- **Não** buscamos e-mail em terceiros, redes sociais, bases vazadas ou
  ferramentas de enriquecimento.
- Não montamos lista de disparo: 1 e-mail por Lead, abordagem individual e
  manual.
- O aluno pode **apagar** o e-mail de um Lead na UI.
- A Política de Privacidade (`/privacidade`) ganha um parágrafo dizendo isso.

### `Outreach.assunto`
Novo campo (`String?`). Preenchido só quando `canal = email`; `null` no
WhatsApp.

## Modelo de dados
```prisma
enum EmailOrigem {
  site
  manual
}

model Lead {
  // ...
  email        String?       // F027 — contato publicado no site do Lead
  email_origem EmailOrigem?  // F027
}

model Outreach {
  // ...
  assunto String?  // F027 — só para canal = email
}
```

## Fluxo

### 1. Captura (dentro do Diagnóstico)
Durante o aprofundamento ([F025](F025-fila-do-dia.md)) / Diagnóstico
([F002](F002-diagnostico-de-presenca-digital.md)), o mesmo HTML usado pela F026
passa por `extrairEmail`. Achou → grava `Lead.email` + `email_origem = site`.
Não achou → deixa `null` (não é erro, não vira Dor).

Re-diagnóstico **não sobrescreve** um e-mail com `email_origem = manual`.

### 2. Geração — `gerarOutreachAction({ lead_id, canal, tipo })`
A action da F005 ganha o parâmetro `canal` (`whatsapp` | `email`), mantendo
`tipo` (`primeira` | `followup`) da [F006](F006-follow-up-e-funil.md).

Para `canal = email`:
1. Exige `Lead.email` (ou o endereço digitado na hora, que é gravado com
   `email_origem = manual`). Sem endereço → `{ erro: "Lead sem e-mail — cole um endereço ou use o WhatsApp" }`.
2. Prompt próprio (`src/lib/outreach/prompt-email.ts`), com saída estruturada
   `{ assunto, corpo }`. Diferenças em relação ao WhatsApp:
   - **Assunto** curto e concreto, sem clickbait e sem "URGENTE"
     (ex.: *"Site da [Nome] está lento no celular"*).
   - Corpo mais longo que o do WhatsApp (6–12 linhas), com o dado do
     Diagnóstico explícito (performance mobile, HTTPS, atendimento) e uma
     pergunta final única.
   - **Sem emoji** (mesma regra da F005), sem anexo, sem imagem, sem
     rastreamento (pixel/UTM) — nada que faça o e-mail parecer disparo.
   - Assinatura com o nome do aluno e a oferta do `brand.ts`.
3. Cria o `Outreach` com `canal = email`, `assunto`, `conteudo = corpo`,
   `enviado = false`. Consome cota `outreach` (F018), igual ao WhatsApp.

### 3. Envio (manual, pelo aluno)
No resultado, três ações:
- **Copiar assunto** / **Copiar corpo**.
- **Abrir no meu e-mail** — link
  `mailto:<email>?subject=<assunto>&body=<corpo>` (encodado). Se o corpo passar
  de **1.800 caracteres**, o botão avisa que alguns clientes truncam e sugere
  copiar/colar — sem esconder o botão.
- **Marcar como enviada** — reusa a action da F006 (promove
  `priorizado → contatado`, grava `enviado_em`, alimenta as cobranças da
  [F031](F031-central-de-tarefas.md)).

### 4. Escolha do canal na UI
Onde hoje existe **Gerar Outreach**, passa a existir **Gerar abordagem** com
dois botões: **WhatsApp** e **E-mail**. O de e-mail fica desabilitado (com
tooltip) quando o Lead não tem `email` — e ao lado dele um link **"colar
e-mail"** que abre o input.

Na Fila do dia (F025), o card mostra qual canal está disponível.

## Critérios de aceitação
- [ ] **AC1** — HTML com `<a href="mailto:contato@barbearia.com.br">` grava
      `email = contato@barbearia.com.br`, `email_origem = site`.
- [ ] **AC2** — HTML com `noreply@` e `foto@2x.png` e nenhum outro endereço →
      `email = null`.
- [ ] **AC3** — Com endereços do domínio do site e de terceiros, prevalece o do
      domínio do site.
- [ ] **AC4** — Gerar Outreach de e-mail cria `Outreach` com `canal = email`,
      `assunto` não vazio e corpo sem emoji.
- [ ] **AC5** — Gerar e-mail sem `Lead.email` e sem endereço digitado →
      `{ erro }` específico, sem criar Outreach e sem consumir cota.
- [ ] **AC6** — Endereço digitado na hora é gravado com `email_origem = manual`
      e sobrevive a um re-diagnóstico.
- [ ] **AC7** — "Abrir no meu e-mail" produz `mailto:` com assunto e corpo
      corretamente encodados (acentos e quebras de linha preservados).
- [ ] **AC8** — Marcar a Outreach de e-mail como enviada promove o Lead a
      `contatado` e alimenta o follow-up (F006) e as Tarefas (F031) igual ao
      WhatsApp.
- [ ] **AC9** — Follow-up (`tipo = followup`) funciona no canal e-mail, com
      assunto de 2º toque (ex.: prefixo "Re:" só quando fizer sentido).
- [ ] **AC10** — Apagar o e-mail do Lead na UI zera `email` e `email_origem`.
- [ ] **AC11** — `extrairEmail` é pura, sem rede, testada com as AC1–AC3.
- [ ] **AC12** — Isolamento (F015) mantido em todas as actions novas.

## Decisões de implementação
- `src/lib/leads/extrairEmail.ts` — pura.
- `src/lib/outreach/prompt-email.ts` — prompt + saída estruturada
  `{ assunto, corpo }` pela camada LLM existente (F017); sem SDK novo.
- `src/actions/leads/gerarOutreach.ts` ganha `canal`; `definirEmailLead.ts`
  cobre digitar/apagar endereço.
- Sem lib nova. A leitura do HTML é coberta pelo
  [ADR-016](../04-decisions/ADR-016-leitura-do-site-do-lead.md).

## Fora do escopo (F027)
- **Envio pela plataforma** (decisão desta rodada). Quando entrar, as três
  opções avaliadas são: (a) o aluno conecta o próprio SMTP/Resend em
  `/configuracao`, no padrão BYOK — a preferida; (b) domínio da Orion com
  reply-to do aluno — descartada pelo risco à reputação do login; (c) Gmail
  OAuth — melhor entregabilidade, exige verificação de escopo no Google.
  Qualquer uma exige **ADR próprio** e revisão da LGPD antes.
- Sequência/cadência automática de e-mails, disparo em lote, mala direta.
- Rastreamento de abertura e clique (pixel, link encurtado). Fora por
  princípio: é o que transforma abordagem em spam.
- Caixa de entrada dentro do Orion (ler respostas). Precisa de IMAP/OAuth →
  outro projeto.
- Descobrir e-mail por padrão (`contato@dominio`) sem tê-lo visto publicado —
  é chute e vira bounce.
- Enriquecimento via ferramentas de terceiros (Hunter, Apollo, etc.).

## Custo estimado
Captura de e-mail: **$0** (usa HTML já baixado). Geração: 1 chamada LLM por
e-mail, mesmo custo da F005 (~R$0,05), na chave do aluno ou na cota Orion.
Envio: **$0** (sai do cliente de e-mail do aluno).
