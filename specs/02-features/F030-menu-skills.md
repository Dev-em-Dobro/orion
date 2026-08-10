# F030 — Menu Skills (arsenal de skills pra instalar)

## Status
Proposta — 2026-08-10 · parte do [revamp do fluxo](../10-revamp-do-fluxo.md) (Fase D)

## Objetivo
Entregar dentro do Orion as **skills** que o time usa no dia a dia — a começar
pelo **extrator-de-DNA** — pro aluno **baixar e instalar** no agente de código
dele (Claude Code).

Decisão desta rodada: o menu é um **catálogo pra instalar**, não um executor.
As skills rodam na máquina do aluno; o Orion hospeda, versiona, explica e
entrega o arquivo.

Espelha o padrão que já funciona nos entregáveis
([F020](F020-menu-entregaveis.md)) — mesma arquitetura, mesmo gate de compra,
mesma forma de servir arquivo. Nenhuma infra nova.

## Conceitos

### Skill
Pacote de instruções que o aluno instala no Claude Code. No catálogo:

| Campo | Descrição |
|-------|-----------|
| `slug` | Identificador (`extrator-de-dna`) |
| `titulo` | Nome exibido |
| `resumo` | Uma linha: o que faz |
| `quando_usar` | 2–4 bullets de situação real |
| `versao` | Versão do pacote (aparece no download e na página) |
| `arquivos` | O que vem no `.zip` (SKILL.md + auxiliares) |
| `disponivel` | `false` mantém fora do menu (mesmo padrão "em breve" da F020) |

Config estática em `src/lib/skills/catalogo.ts`; conteúdo em
`content/skills/<slug>/`.

### O que a página de uma skill mostra
1. O que a skill faz e quando usar.
2. **Baixar .zip**.
3. **Como instalar**, com o caminho pronto pra copiar:
   - Para usar em todos os projetos: `~/.claude/skills/<slug>/`
   - Só no projeto atual: `.claude/skills/<slug>/`
   - Depois: abrir o Claude Code e chamar `/<slug>`.
4. Preview do `SKILL.md` (o aluno vê antes de baixar).

## Rotas
| Rota | Descrição |
|------|-----------|
| `/skills` | Visão geral: cards das skills disponíveis |
| `/skills/[slug]` | Detalhe: o que é, instalação, preview, download |
| `/api/skills/download/[slug]` | `.zip` da skill (gerado sob demanda, ZIP STORE, igual à F020) |

Sidebar: grupo **Skills** (irmão de Materiais), com "Visão geral" + uma entrada
por skill disponível.

## Gate
Mesmo da F020: layout de `/skills/*` chama `redirectSeCompraPendente()`
([F019.1](F019.1-ativacao-acesso.md)). Sem compra verificada → `/ativar-acesso`,
e o grupo aparece esmaecido com cadeado na sidebar.

## Conteúdo inicial
| Slug | Status |
|------|--------|
| `extrator-de-dna` | **Pendente de conteúdo** — precisa dos arquivos do time |

> **Bloqueio conhecido:** a feature está pronta pra receber conteúdo, mas o
> menu só sai do ar vazio quando os arquivos das skills forem colocados em
> `content/skills/<slug>/`. Cada skill nova é um PR que adiciona a pasta + uma
> entrada no catálogo — sem tocar em código.

## Critérios de aceitação
- [ ] **AC1** — Sidebar exibe o grupo "Skills" com visão geral + as skills
      `disponivel = true`; as `false` não aparecem.
- [ ] **AC2** — `/skills` lista os cards com título, resumo e link de detalhe.
- [ ] **AC3** — `/skills/[slug]` mostra o que faz, quando usar, instruções de
      instalação com o caminho copiável e o preview do `SKILL.md`.
- [ ] **AC4** — "Baixar .zip" entrega um arquivo com a pasta da skill e o
      `SKILL.md` na raiz dela, instalável direto em `~/.claude/skills/`.
- [ ] **AC5** — Usuário sem compra verificada é redirecionado a
      `/ativar-acesso` e vê o grupo com cadeado.
- [ ] **AC6** — Conteúdo servido **internamente** (nada de URL pública externa),
      como na F020 (AC3).
- [ ] **AC7** — `slug` inexistente ou com `..`/barra → 404, sem sair de
      `content/skills/` (mesma sanitização de caminho da F020).
- [ ] **AC8** — Adicionar uma skill nova exige só: pasta em `content/skills/` +
      entrada no catálogo (nenhuma mudança de rota ou componente).

## Decisões de implementação
- `src/lib/skills/catalogo.ts` — espelha `src/lib/entregaveis/catalogo.ts`.
- Reusa a montagem de `.zip` e a entrega de arquivo dos entregáveis
  (`src/lib/entregaveis/zip.ts` e `servir.ts`) — extrair o que for comum pra
  um helper compartilhado em vez de duplicar.
- Sem lib nova → **sem ADR**.

## Fora do escopo (F030)
- **Rodar a skill dentro do Orion** (decisão desta rodada). Se um dia entrar,
  vira feature própria com custo de LLM, cota e ADR.
- Versionamento/atualização automática das skills na máquina do aluno.
- Instruções para outros agentes (Cursor, Codex, Copilot) — v1 é Claude Code.
- Skills enviadas por alunos / marketplace.

## Custo estimado
**$0/mês** — arquivos estáticos servidos pelo próprio app, como a F020.
