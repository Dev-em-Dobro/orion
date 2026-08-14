// F030 — visão geral das Skills.
// Spec: /specs/02-features/F030-menu-skills.md

import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { SKILLS_MENU } from "@/lib/skills/catalogo";

export const dynamic = "force-dynamic";

export default function SkillsPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Skills</h1>
      <p className="mt-1 text-sm text-muted">
        O arsenal que a gente usa, pronto pra instalar no seu Claude Code. As
        skills rodam na sua máquina — aqui você baixa e aprende a usar.
      </p>

      {SKILLS_MENU.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            titulo="Nenhuma skill publicada ainda"
            descricao="As skills aparecem aqui assim que forem liberadas. Enquanto isso, os materiais da consultoria já estão disponíveis."
            acao={{ href: "/entregaveis", label: "Ver materiais" }}
          />
        </div>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {SKILLS_MENU.map((skill) => (
            <li key={skill.slug}>
              <Link
                href={`/skills/${skill.slug}`}
                className="block h-full rounded-xl border border-border bg-card p-4 transition-colors hover:border-zinc-700"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-medium text-zinc-100">{skill.titulo}</h2>
                  <span className="badge bg-zinc-500/15 text-zinc-400">
                    v{skill.versao}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">{skill.resumo}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
