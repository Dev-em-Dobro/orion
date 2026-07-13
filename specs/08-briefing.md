# 08 — Briefing do Produto

## Status
Briefing — 2026-07-13. **Produto: Orion** (nome definido em 2026-07-13 — o
caçador da mitologia; "caça" os Leads).

## Lançamento
**20 de julho de 2026, ao vivo (live) às 20h**, para alunos (Dev em Dobro).

> **Nota de realismo.** Os bloqueadores da Fase 2 (login, multi-tenant, BYOK,
> deploy, LGPD) somam semanas de trabalho. Tratar o dia 20 como o **evento de
> lançamento na live**; o acesso realista é **beta fechado** primeiro, com o
> caminho crítico priorizado e o que não couber virando fast-follow. Ver o
> [roadmap de lançamento](07-lancamento-para-alunos.md).

## O que é (em uma frase)
O **Orion** é um motor de prospecção que acha **negócios locais que já precisam de
um dev** — e entrega o contato com a **Dor diagnosticada** e a **mensagem de
abordagem pronta**.

## Como funciona (o fluxo)
1. **Coleta** negócios por região/categoria via Google Places — dado público. [F001]
2. **Diagnostica** a presença digital: tem site? HTTPS? é rápido no mobile? [F002/F008]
3. **Detecta Dores** concretas: sem site, site lento, sem HTTPS… [F002 → F004]
4. **Prioriza** com um score de 0–100. [F003]
5. **Gera o outreach** de WhatsApp pronto e personalizado, via Claude. [F005]
6. **Acompanha o funil** e ajuda a fechar: follow-up, objeções, proposta e
   roleplay de venda. [F006/F010/F011/F012/F013]

Resultado: **"Leads prontos"** — contato + Dor + abordagem, prontos pra enviar
**manualmente** (LGPD: só dado público, sem disparo em massa).

## Pra quem
Aluno **freelancer dev** que quer clientes e não tem método repetível pra achar
quem, de fato, precisa dele.

## O diferencial (o fosso)
Os concorrentes ou fazem **scraping cru + disparo em massa** (MapLeads) ou são
**caros/enterprise** (Apollo, Leads Per Hour). Nenhum entrega **contato + Dor
diagnosticada + outreach pronto**, por **dado público (API oficial)**, dentro da
**LGPD**, a **custo marginal**, para **um operador**. O **diagnóstico que
qualifica** é o que ninguém faz — e é o núcleo. Ver [concorrentes](06-referencias/concorrentes.md).

## O que muda pro lançamento (Fase 2)
De ferramenta interna → produto pros alunos:
- **Login** por aluno.
- **Multi-tenant**: cada aluno vê só os seus dados.
- **BYOK** (*traga sua chave*): o aluno usa as próprias chaves de API → o **custo
  de API é dele**; o nosso fica só em hospedagem + banco.
- App **hospedado** (subdomínio Dev em Dobro), UI mais clean, Termos + Privacidade.

Detalhe, decisões e ordem no [roadmap de lançamento](07-lancamento-para-alunos.md).

## O que já existe (features)
Coleta [F001], Diagnóstico de presença [F002], Score [F003], Outreach WhatsApp
[F005], Follow-up e funil [F006], Ideias de vídeo/inbound [F007], Diagnóstico de
UX por IA com visão [F008], Sinal de site agregador [F009], Dashboard de funil
[F010], Assistente de objeções [F011], Gerador de proposta [F012], Simulador de
venda/roleplay [F013].

## Futuro (o que a gente quer fazer)
- **Curto prazo (habilitar o lançamento):** login, multi-tenant, BYOK, deploy +
  domínio, LGPD, UI clean.
- **Fast-follow (pós-beta):** multi-provider de IA (OpenAI e Gemini além do
  Anthropic) [F017], persistir a Dor no domínio [F004], redesign de UI, testes
  automatizados, observabilidade.
- **Visão:** transformar o que era ferramenta pessoal num produto que o aluno usa
  pra, de forma repetível, **achar e fechar clientes locais** — mantendo o
  princípio de "10 Leads *prontos*", não "1.000 contatos disparados".
