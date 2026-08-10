# Orion Lead Hunter

> Repositório / codename interno: `prospect-engine`.

Motor de prospecção para **negócios locais**: acha estabelecimentos que precisam
de um dev, diagnostica a presença digital, prioriza por score e gera Outreach via
Claude API. **A partir da Fase 2, é um app hospedado para alunos**: cada aluno faz
**login**, o app é **multi-tenant** (cada um vê só os seus dados) e usa as
**próprias chaves de API** (BYOK), configuráveis na UI. A marca/oferta fica em
`src/lib/brand.ts`; o nome do produto na UI/e-mails em `src/lib/produto.ts`. Visão em `specs/00-product-vision.md`, roadmap de lançamento
em `specs/07-lancamento-para-alunos.md`, briefing em `specs/08-briefing.md`.

> **Fase 3 em construção — revamp do fluxo.** Login, multi-tenant e BYOK (Fase 2)
> estão na `main`. A Fase 3 transforma o app de balcão de ferramentas manuais em
> **motor com opinião**: priorização automática, Fila do dia, canal e-mail,
> cobrança de tarefas, Skills e Agente. Plano mestre em
> `specs/10-revamp-do-fluxo.md` (features **F024–F034**, ADRs **014–016**).
> Os IDs F021–F023 estão **reservados** por branches não mergeadas (ver §7 do
> plano). "Sem nova lib sem ADR."

## Regras absolutas
- **Specs em `/specs` são a fonte da verdade.** Código segue spec, nunca o contrário.
- **Mudança de comportamento exige mudança de spec ANTES do código.** Sem exceção.
- **Toda feature tem ID** (`F001`, `F002`, ...). Commits e PRs referenciam o ID.
- **Linguagem ubíqua** definida em `/specs/01-domain-model.md`. Não usar sinônimos
  (é "Lead", não "prospect"; "Diagnóstico", não "análise"; "Dor", não "problema"
  genérico; "Outreach", não "mensagem" no sentido de domínio).

## Stack fixa
- Next.js 15 (App Router) + TypeScript estrito
- PostgreSQL hospedado no Neon
- Prisma ORM
- Tailwind + shadcn/ui
- Claude API para geração de outreach
- Google Places API + PageSpeed Insights API para coleta e diagnóstico
- **Sem workers, sem filas** — tudo via Server Actions síncronas (ADR-002,
  mantido na Fase 3: operações longas viram **lotes curtos** com progresso)
- **Fase 2 (na `main`):** Better Auth (login), multi-tenant por `user_id`, cifra
  das chaves BYOK, e-mail transacional (magic link) e camada multi-provider LLM
  (Vercel AI SDK). Ver `specs/07-lancamento-para-alunos.md`.
- **Fase 3 (em construção):** priorização automática, canal e-mail (sem envio
  pela plataforma), agente com ferramentas read-only. Ver `specs/10-revamp-do-fluxo.md`.
- **Sem nova lib sem ADR** em `/specs/04-decisions/`

## Convenções de código
- Lógica de domínio em `src/lib/`, **sem dependência de Next**
- Server Actions em `src/actions/`, finas, só orquestram `src/lib/`
- Tipos derivados do schema Prisma, **não duplicados**
- Validação de input com Zod nas Server Actions
- UI em `src/components/` (shadcn/ui como base)

## Fluxo de trabalho
1. Ler a spec da feature em `/specs/02-features/F00X-*.md`
2. Atualizar/criar plano de implementação
3. Implementar contra os critérios de aceitação da spec
4. Validar manualmente na dashboard
5. Commit com mensagem `F00X: <descrição>`
