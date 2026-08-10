# 00 — Product Vision

> **Fase 3 (a partir de 2026-08-10) — revamp do fluxo.** O produto deixa de ser
> um balcão de ferramentas manuais e passa a ser um **motor com opinião**:
> diagnóstico e priorização automáticos depois da busca, **Fila do dia**,
> abordagem por WhatsApp **e e-mail**, e **cobrança ativa** do que ficou parado.
> O plano completo está em [10 — Revamp do Fluxo](10-revamp-do-fluxo.md)
> (features F024–F031). O que muda nesta visão está marcado abaixo.

> **Fase 2 (a partir de 2026-07-13).** Este documento passou a descrever o
> produto **para alunos**: app hospedado, com **login**, **multi-tenant** e
> chaves de API do próprio aluno (**BYOK**). A premissa anterior — "ferramenta
> interna, um operador, sem auth e sem multi-tenant" — valeu na Fase 1 e foi
> **substituída**. Roadmap e decisões de lançamento em
> [07](07-lancamento-para-alunos.md); resumo do produto em [08](08-briefing.md).

## Usuário
Cada **aluno** (freelancer dev) tem a sua própria conta no app hospedado. O
sistema é **multi-tenant**: o aluno faz **login** e vê só os seus dados. Por
padrão usa as **chaves compartilhadas da Orion** (sem precisar de conta Google/
OpenAI), com **limites diários** anti-abuso ([F018](02-features/F018-limites-diarios.md)).
O modo **BYOK** (*bring your own key*) permanece opcional em `/configuracao`.
*(Na Fase 1 era ferramenta interna de um operador só — ver nota acima.)*

## Problema
Prospecção manual via boca-a-boca, indicação e busca aleatória em mapa consome
tempo, é inconsistente e não escala. O aluno freelancer dev não tem um método
repetível pra identificar negócios locais que de fato precisam de um dev (site
ruim, lento, ou sem site) antes de iniciar uma abordagem.

## Solução
O aluno faz login e configura as próprias chaves uma vez (BYOK). A partir daí, um
sistema que:
1. Coleta estabelecimentos por região/categoria via Google Places API
2. **Tria na hora** (sem custo) e **diagnostica sozinho os melhores** —
   site, HTTPS, performance mobile e sinal de atendimento automatizado
   ([F025](02-features/F025-fila-do-dia.md), [F026](02-features/F026-sinal-atendimento-automatizado.md))
3. Detecta **Dores** concretas (sem site, site lento, sem HTTPS, WhatsApp sem
   automação, etc.)
4. Calcula um **score** (0–100) e prioriza — **automaticamente**, sem clique
5. Entrega a **Fila do dia**: os melhores Leads prontos pra abordar
6. Gera o Outreach personalizado via IA, em **WhatsApp ou e-mail**
7. **Cobra o que ficou parado** (follow-up, desfecho não registrado) numa
   Central de Tarefas ([F031](02-features/F031-central-de-tarefas.md))
8. Mostra tudo numa dashboard simples onde o aluno marca o status — e agora
   também **corrige e descarta** ([F024](02-features/F024-estado-do-lead-reversivel.md))

## Resultado esperado
**10 Leads prontos por semana, por aluno, sem prospecção manual ativa.**

"**Lead pronto**" = score acima de um threshold definido + Diagnóstico executado +
ao menos uma Dor detectada + Outreach gerado e pronto pra enviar. (Termo
deliberadamente distinto do status de funil `qualificado`, que é a qualificação
de venda *depois* da resposta — ver [domain model](01-domain-model.md).)

## Restrições
- **LGPD** (agora com usuários externos): dos Leads, só **dado público** (Google
  Places **e o site que o próprio Lead publicou lá** — ver
  [ADR-016](04-decisions/ADR-016-leitura-do-site-do-lead.md)) — sem
  enriquecimento via dados pessoais e **sem disparo automático** (envio segue
  manual, inclusive no e-mail). Dos alunos, há PII de login e as chaves de API:
  **cifra das chaves em repouso**, **isolamento por usuário** e **Termos de Uso
  + Política de Privacidade** deixam de ser opcionais.
- **Custo / chaves**: modo **Orion** (padrão) — custo de API nas chaves do
  servidor, com **limites diários** por aluno (F018). Modo **BYOK** — custo
  de API do aluno, sem cotas F018. Hospedagem + banco continuam compartilhados.
- **Multi-tenant hospedado**: login obrigatório e toda query escopada por
  `user_id` (isolamento testado). Deixou de ser "ferramenta interna sem auth".
- **Tempo**: operações síncronas de até ~30s são aceitáveis (sem workers na
  Fase 1 — [ADR-002](04-decisions/ADR-002-sem-workers-fase-1.md)); reavaliar sob
  carga multi-usuário.

## Pilar complementar — conteúdo inbound (F007)
Além da prospecção **outbound** (achar o Lead e abordar), há um pilar
**inbound**: gerar **Ideias de Vídeo** pro YouTube que funcionam como funil e
atraem clientes até o **diagnóstico gratuito**. Complementa, não substitui, o
núcleo. Reaproveita a Claude API (ADR-005), sem API/lib nova e sem scraping.
Spec: [F007](02-features/F007-sugestoes-video-funil.md).

## Pilar de leitura — dashboard de funil (F010)
A home (`/`) é um **dashboard de funil read-only**: mostra a distribuição dos
Leads por estágio, as taxas de conversão entre estágios e os painéis de ação
(Leads que exigem atenção, follow-up pendente). É **derivado do estado atual**
do banco — sem event log, sem nova infra (ADR-002). Spec:
[F010](02-features/F010-dashboard-funil.md). Métricas que exigem histórico de
eventos (SLA de 1ª resposta, conversão no tempo, CAC, top objeções) permanecem
fora de escopo até existir captura desses dados.

## Diagnóstico de UX por IA (F008)
O antigo "diagnóstico de design/UI/UX via IA" (screenshot do site → Claude com
visão → novas Dores) **saiu do futuro e virou a F008**
([spec](02-features/F008-diagnostico-ux-ia.md), [ADR-006](04-decisions/ADR-006-screenshot-api-externa.md)).
Em produção serverless exige a API de screenshot externa (entra no BYOK — F016).

## Ideias futuras (sem spec ainda — avaliar antes de virar feature)
- Ver o **roadmap de lançamento** ([07](07-lancamento-para-alunos.md)) para os
  itens de Fase 2 já decididos (multi-provider LLM — F017; persistência da Dor —
  F004) e o backlog de polish.

## Em escopo agora (Fase 3 — [revamp do fluxo](10-revamp-do-fluxo.md))
- **Desempenho** ([F028](02-features/F028-desempenho.md)) — primeiro de todos.
- **Estado do Lead reversível**: descartar, restaurar, corrigir status ([F024](02-features/F024-estado-do-lead-reversivel.md)).
- **Fila do dia**: triagem, aprofundamento e priorização automáticos ([F025](02-features/F025-fila-do-dia.md)).
- **Sinal de atendimento automatizado** no WhatsApp ([F026](02-features/F026-sinal-atendimento-automatizado.md)).
- **Outreach por e-mail**, preparado na plataforma e enviado pelo aluno ([F027](02-features/F027-outreach-por-email.md)).
- **Central de Tarefas** in-app, sem cron ([F031](02-features/F031-central-de-tarefas.md)).
- **Menu Skills** ([F030](02-features/F030-menu-skills.md)) e **Agente Orion** ([F029](02-features/F029-agente-orion.md)).

### Entregue na Fase 2
- **Login / autenticação** por aluno (Better Auth).
- **Multi-tenant**: dados escopados por `user_id`, isolamento testado.
- **Configuração de chaves do aluno (BYOK)** na UI, cifradas em repouso.

## Fora de escopo
- Envio automático de mensagens (WhatsApp/email API) — LGPD; envio segue
  **manual**. O e-mail da [F027](02-features/F027-outreach-por-email.md) é
  **preparado** no Orion e disparado pelo cliente de e-mail do aluno; o Orion
  **não** opera servidor de saída pra prospecção
- Rastreamento de abertura/clique em e-mail (pixel, link encurtado) — por
  princípio: é o que transforma abordagem em spam
- App mobile nativo (a UI **é** responsiva)
- Analytics **histórico/temporal** do funil: SLA de 1ª resposta, conversão ao
  longo do tempo, CAC, top objeções — exigem event log / campos de evento que
  não existem (o dashboard read-only da F010 **está** em escopo)
- Integração com CRM externo (HubSpot, Pipedrive)
- Scraping de terceiros. A única leitura de conteúdo permitida é o **HTML da
  home do site que o próprio Lead cadastrou no Places**, sem crawl e sem
  persistir o HTML ([ADR-016](04-decisions/ADR-016-leitura-do-site-do-lead.md))
- Enriquecimento via LinkedIn, Receita Federal, Hunter, Apollo, etc.
- Workers, filas, jobs agendados (ADR-002 — mantido: a cobrança da
  [F031](02-features/F031-central-de-tarefas.md) é in-app, calculada quando o
  aluno abre o app; alcançar quem sumiu exigiria cron + e-mail, e isso é ADR
  novo)
