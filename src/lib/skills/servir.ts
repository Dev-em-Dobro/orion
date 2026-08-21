// F030 — arquivos das Skills, em content/skills/<slug>/.
// Spec: /specs/02-features/F030-menu-skills.md

import path from "node:path";
import { lerArquivo, listarArquivos } from "@/lib/arquivos/servir";
import { montarZip, type ArquivoZip } from "@/lib/entregaveis/zip";
import { skillPorSlug } from "./catalogo";

const ROOT = path.join(process.cwd(), "content", "skills");

/** Conteúdo do SKILL.md, para o preview antes do download. */
export async function lerSkillMd(slug: string): Promise<string | null> {
  if (!skillPorSlug(slug)) return null;
  const arquivo = await lerArquivo(ROOT, [slug, "SKILL.md"]);
  return arquivo ? arquivo.body.toString("utf8") : null;
}

export async function listarArquivosDaSkill(slug: string): Promise<string[]> {
  if (!skillPorSlug(slug)) return [];
  return listarArquivos(ROOT, [slug]);
}

/**
 * `.zip` com a pasta da skill dentro — instalável direto em
 * `~/.claude/skills/`, com o `SKILL.md` na raiz da pasta.
 */
export async function montarZipDaSkill(
  slug: string,
): Promise<{ body: Buffer; nomeArquivo: string } | null> {
  if (!skillPorSlug(slug)) return null;

  const relativos = await listarArquivosDaSkill(slug);
  if (relativos.length === 0) return null;

  const arquivos: ArquivoZip[] = [];
  for (const rel of relativos) {
    const lido = await lerArquivo(ROOT, [slug, ...rel.split("/")]);
    if (!lido) return null;
    arquivos.push({ nome: `${slug}/${rel}`, conteudo: lido.body });
  }

  return { body: montarZip(arquivos), nomeArquivo: `${slug}.zip` };
}
