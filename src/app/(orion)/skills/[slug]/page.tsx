// F030 — detalhe de uma Skill: o que é, como instalar, prévia e download.
// Spec: /specs/02-features/F030-menu-skills.md

import Link from "next/link";
import { notFound } from "next/navigation";
import { skillPorSlug } from "@/lib/skills/catalogo";
import { lerSkillMd, listarArquivosDaSkill } from "@/lib/skills/servir";

export const dynamic = "force-dynamic";

export default async function SkillPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const skill = skillPorSlug(slug);
  if (!skill) notFound();

  const [conteudo, arquivos] = await Promise.all([
    lerSkillMd(slug),
    listarArquivosDaSkill(slug),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <p className="text-sm text-zinc-500">
        <Link href="/skills" className="hover:text-primary">
          ← Skills
        </Link>
      </p>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{skill.titulo}</h1>
          <p className="mt-1 text-sm text-muted">{skill.resumo}</p>
        </div>
        <a
          href={`/api/skills/download/${skill.slug}`}
          className="btn-primary shrink-0"
        >
          Baixar .zip
        </a>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold tracking-wide text-zinc-300 uppercase">
          Quando usar
        </h2>
        <ul className="mt-2 space-y-1 text-sm text-zinc-300">
          {skill.quandoUsar.map((q) => (
            <li key={q}>· {q}</li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold tracking-wide text-zinc-300 uppercase">
          Como instalar
        </h2>
        <ol className="mt-2 space-y-3 text-sm text-zinc-300">
          <li>
            1. Baixe o .zip e extraia a pasta{" "}
            <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs">
              {skill.slug}
            </code>{" "}
            em uma destas pastas:
            <div className="mt-2 space-y-1">
              <p className="text-xs text-zinc-500">
                Pra usar em todos os projetos:
              </p>
              <code className="block rounded-lg border border-border bg-zinc-900/70 p-2 text-xs text-zinc-200">
                ~/.claude/skills/{skill.slug}/
              </code>
              <p className="mt-2 text-xs text-zinc-500">Só no projeto atual:</p>
              <code className="block rounded-lg border border-border bg-zinc-900/70 p-2 text-xs text-zinc-200">
                .claude/skills/{skill.slug}/
              </code>
            </div>
          </li>
          <li>
            2. Abra o Claude Code e chame{" "}
            <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs">
              /{skill.slug}
            </code>
            .
          </li>
        </ol>
      </section>

      {conteudo && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold tracking-wide text-zinc-300 uppercase">
            Prévia do SKILL.md
          </h2>
          <pre className="mt-2 max-h-96 overflow-auto rounded-xl border border-border bg-zinc-900/70 p-4 text-xs whitespace-pre-wrap text-zinc-300">
            {conteudo}
          </pre>
        </section>
      )}

      {arquivos.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold tracking-wide text-zinc-300 uppercase">
            Arquivos ({arquivos.length})
          </h2>
          <ul className="mt-2 space-y-0.5 text-xs text-zinc-500">
            {arquivos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
