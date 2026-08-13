# F026 — Sinal de atendimento automatizado no WhatsApp

## Status
Implementada — 2026-08-10 · parte do [revamp do fluxo](../10-revamp-do-fluxo.md) (Fase B)

## Objetivo
Descobrir, durante o Diagnóstico, se o negócio **já tem atendimento
automatizado** (chatbot / atendente virtual no WhatsApp ou no site) — e, quando
não tem, transformar isso numa **Dor** que o aluno pode vender.

Hoje o Orion só sabe falar de *site*. Automação de atendimento é um serviço de
ticket parecido, mais rápido de entregar, e o argumento é imediato: *"vocês
respondem tudo no braço; dá pra automatizar as 20 perguntas repetidas e não
perder cliente fora do horário."*

Também serve como **sinal de maturidade**: quem já paga uma plataforma de
chatbot tem verba e tem gente pensando em tecnologia.

## O que dá (e o que não dá) pra saber
Isso precisa ficar explícito, na spec e na UI:

- **Não mandamos mensagem** para o WhatsApp do Lead pra testar resposta
  automática. Seria disparo não solicitado (LGPD) e uso indevido da plataforma.
- O sinal é **inferido do site público que o próprio negócio cadastrou no
  Google** — ver [ADR-016](../04-decisions/ADR-016-leitura-do-site-do-lead.md).
- Portanto: **`nao_detectado` significa "não encontramos sinal"**, não "não
  tem". Um negócio pode ter um bot rodando só dentro do WhatsApp, sem nenhum
  vestígio no site. A UI usa exatamente essa linguagem.

Na prática o sinal é forte o suficiente pra ser útil: quem contrata plataforma
de atendimento quase sempre planta o widget no site, e quem não tem site
(maioria dos Leads de maior score) também quase nunca tem automação.

## Conceitos

### `atendimento_automatizado` (novo campo do Diagnóstico)
| Valor | Quando | Leitura |
|-------|--------|---------|
| `detectado` | Fingerprint de plataforma conhecida de chatbot/atendimento no HTML | Já automatiza |
| `indicios` | Sinal fraco: widget de chat não identificado, ou texto tipo "atendimento automático / assistente virtual / bot", ou `wa.me` com mensagem pré-preenchida | Talvez automatize |
| `nao_detectado` | HTML lido com sucesso e **nenhum** sinal encontrado | Nada encontrado — provável oportunidade |
| `nao_avaliado` | Sem site, site é Agregador (F009), site fora do ar, ou HTML não pôde ser lido | Não dá pra dizer |

Campo irmão `atendimento_evidencia` (string, ≤ 120 chars) guarda **o que** foi
encontrado — ex.: `"widget ManyChat"`, `"link wa.me com texto pré-preenchido"`.
Sem evidência não há classificação: a UI sempre mostra o porquê.

### Fingerprints
Constante em `src/lib/diagnostico/atendimento.ts`, agrupada por confiança:

- **Forte (`detectado`)** — domínios/scripts de plataformas de chatbot e
  atendimento: ManyChat, BotConversa, Take Blip, Zenvia, Huggy, Octadesk, Poli,
  Kommo, Leadster, JivoChat, Tawk.to, Tidio, Crisp, Chatvolt, Chatguru,
  Chatwoot, Z-API, Evolution API, 360dialog, Respond.io, Wati, RD Station
  Conversas, Zendesk Chat, Freshchat, Twilio, Dialogflow, Botpress.
- **Fraco (`indicios`)** — `wa.me`/`api.whatsapp.com` com `?text=`; termos
  "atendimento automático", "assistente virtual", "chatbot", "bot de
  atendimento", "resposta automática", "atendimento 24h"; presença de um
  container de chat genérico (`#chat-widget`, `.chat-bubble`) sem vendor.

A lista é **dado, não lógica**: crescer a lista não muda o algoritmo, e cada
entrada tem um rótulo legível que vira a `atendimento_evidencia`.

### Nova Dor: `SEM_ATENDIMENTO_AUTOMATIZADO`
Criada quando **todas** valem:
- `atendimento_automatizado = nao_detectado`;
- o Lead tem `telefone` (sem telefone não há WhatsApp pra automatizar).

Severidade **MEDIA**. Detalhe: *"Nenhum sinal de atendimento automatizado no
site — o WhatsApp provavelmente é respondido no braço."*

Alimenta a Abordagem ([F005](F005-abordagem-whatsapp.md) /
[F027](F027-abordagem-por-email.md)) como qualquer outra Dor.

## Modelo de dados
```prisma
enum AtendimentoAutomatizado {
  detectado
  indicios
  nao_detectado
  nao_avaliado
}

model Diagnostico {
  // ...
  atendimento_automatizado AtendimentoAutomatizado @default(nao_avaliado)  // F026
  atendimento_evidencia    String?                                          // F026
}

enum TipoDor {
  SEM_SITE
  SITE_AGREGADOR
  SITE_LENTO
  SEM_HTTPS
  SEM_RESPOSTA_REVIEWS
  SEM_ATENDIMENTO_AUTOMATIZADO   // F026
}
```
Diagnósticos existentes ficam `nao_avaliado` (não reprocessa base antiga).

## Fluxo
1. `verificarSite` ([F002](F002-diagnostico-de-presenca-digital.md)) passa a
   **devolver o HTML** que já baixa hoje. O código atual faz
   `await res.arrayBuffer()` só pra medir o tempo de carregamento e **joga o
   conteúdo fora** — a F026 aproveita esse mesmo corpo. **Zero requisição
   adicional, zero custo adicional, zero segundo a mais.**
   - Teto de 1 MB e só `content-type: text/html` (o resto é descartado).
   - O HTML **não é persistido** — vive na memória da requisição
     (ADR-016).
2. `detectarAtendimento(html)` — função pura: procura os fingerprints e devolve
   `{ classificacao, evidencia }`.
3. O Diagnóstico grava os dois campos novos.
4. `detectarDores` ganha a regra da nova Dor.
5. A UI passa a exibir o sinal (ver abaixo).

## UI
- **Detalhe do Lead** — linha no bloco de Diagnóstico:
  `Atendimento automatizado: não detectado · nenhum widget de chat encontrado no site`
  com tooltip: *"Verificamos só o site público do negócio. Não enviamos
  mensagem para o WhatsApp dele."*
- **Card da Fila do dia** ([F025](F025-fila-do-dia.md)) — selo discreto
  **"WhatsApp no braço"** quando `nao_detectado` e há telefone.
- **Filtro na lista `/leads`** — "Atendimento: todos / não detectado /
  detectado" (junto dos filtros de categoria e tipo de site).

## Critérios de aceitação
- [ ] **AC1** — HTML contendo `widget.manychat.com` → `detectado`, evidência
      `"widget ManyChat"`.
- [ ] **AC2** — HTML só com `https://wa.me/5541999999999?text=Ol%C3%A1` →
      `indicios`, evidência mencionando o link pré-preenchido.
- [ ] **AC3** — HTML de site comum, sem nenhum fingerprint → `nao_detectado`.
- [ ] **AC4** — Lead sem site, com Agregador (F009), ou com site fora do ar →
      `nao_avaliado` (e **nenhuma** Dor de atendimento é criada).
- [ ] **AC5** — `nao_detectado` + `telefone` presente → cria a Dor
      `SEM_ATENDIMENTO_AUTOMATIZADO` com severidade `MEDIA`.
- [ ] **AC6** — `nao_detectado` **sem** telefone → **não** cria a Dor.
- [ ] **AC7** — O Diagnóstico não faz nenhuma requisição HTTP a mais do que
      fazia antes da F026 (verificado no teste com fetch mockado: 1 GET no site
      + 1 no PageSpeed, como hoje).
- [ ] **AC8** — Resposta não-HTML ou maior que 1 MB → `nao_avaliado`, sem
      estourar memória nem quebrar o Diagnóstico.
- [ ] **AC9** — `detectarAtendimento` é pura (sem Next, sem Prisma, sem rede) e
      testada com os HTMLs de exemplo das AC1–AC3.
- [ ] **AC10** — A UI nunca afirma "não tem atendimento automatizado": usa
      "não detectado" + a explicação do método.

## Decisões de implementação
- `src/lib/diagnostico/atendimento.ts` — fingerprints (dado) + detector (puro).
- `verificarSite` muda a assinatura pra incluir `html?: string`; a F002 segue
  usando `tempoMs` e `temHttps` como hoje.
- `src/lib/dores/detectar.ts` ganha a nova regra; `textos.ts` ganha o texto.
- Sem lib nova. A decisão de **ler o conteúdo** do site (e não só medir a
  resposta) é nova → **[ADR-016](../04-decisions/ADR-016-leitura-do-site-do-lead.md)**.

## Fora do escopo (F026)
- **Entrar no score.** A Dor nova **não** altera Necessidade nem o score na v1.
  Mexer nisso é mudança de estratégia de priorização e exige editar a
  [F003](F003-score-e-priorizacao.md) **antes** — a F026 só produz o sinal e o
  filtro.
- Mandar mensagem pro WhatsApp do Lead pra testar (LGPD + termos da
  plataforma). Nunca.
- Detectar automação em Instagram/Facebook Messenger.
- Ler o site quando o Lead só tem Agregador (F009) — a decisão de não seguir
  link-in-bio continua valendo.
- Re-analisar Diagnósticos antigos em massa.

## Custo estimado
**$0.** Nenhuma API nova, nenhuma requisição nova — a análise usa um corpo HTTP
que já era baixado e descartado.
