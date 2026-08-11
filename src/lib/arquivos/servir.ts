// Leitura segura de arquivos versionados em `content/`.
//
// Extraído de `lib/entregaveis/servir.ts` (F020) quando a F030 precisou do
// mesmo comportamento para as Skills — a spec pedia reuso, não uma segunda
// cópia da checagem de path traversal.

import fs from "node:fs/promises";
import path from "node:path";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".zip": "application/zip",
  ".pdf": "application/pdf",
};

export function mimeDoArquivo(arquivo: string): string {
  return MIME[path.extname(arquivo).toLowerCase()] ?? "application/octet-stream";
}

/**
 * Resolve os segmentos dentro da raiz, ou `null` se escaparem dela.
 * Rejeita `..` e NUL antes de resolver, e confere o resultado contra a raiz —
 * as duas checagens, porque só a primeira não cobre symlink.
 */
export function caminhoSeguro(root: string, segments: string[]): string | null {
  if (segments.length === 0) return null;
  if (segments.some((s) => s === ".." || s.includes("\0"))) return null;

  const abs = path.resolve(root, segments.join("/"));
  const rootResolved = path.resolve(root);
  if (!abs.startsWith(rootResolved + path.sep) && abs !== rootResolved) {
    return null;
  }
  return abs;
}

export async function lerArquivo(
  root: string,
  segments: string[],
): Promise<{ body: Buffer; contentType: string } | null> {
  const abs = caminhoSeguro(root, segments);
  if (!abs) return null;

  try {
    const stat = await fs.stat(abs);
    if (!stat.isFile()) return null;
    return { body: await fs.readFile(abs), contentType: mimeDoArquivo(abs) };
  } catch {
    return null;
  }
}

/** Caminhos relativos de todos os arquivos sob `segments`, recursivo. */
export async function listarArquivos(
  root: string,
  segments: string[],
): Promise<string[]> {
  const abs = caminhoSeguro(root, segments);
  if (!abs) return [];

  const encontrados: string[] = [];

  async function andar(dir: string, prefixo: string) {
    let entradas;
    try {
      entradas = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entradas) {
      const rel = prefixo ? `${prefixo}/${e.name}` : e.name;
      if (e.isDirectory()) await andar(path.join(dir, e.name), rel);
      else if (e.isFile()) encontrados.push(rel);
    }
  }

  await andar(abs, "");
  return encontrados.sort();
}
