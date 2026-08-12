// F020 — leitura segura dos arquivos espelhados em content/entregaveis/.

import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(process.cwd(), "content", "entregaveis");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".zip": "application/zip",
  ".pdf": "application/pdf",
};

export function mimeEntregavel(arquivo: string): string {
  const ext = path.extname(arquivo).toLowerCase();
  return MIME[ext] ?? "application/octet-stream";
}

function caminhoSeguro(segments: string[]): string | null {
  if (segments.length === 0) return null;
  if (segments.some((s) => s === ".." || s.includes("\0"))) return null;

  const joined = segments.join("/");
  const abs = path.resolve(ROOT, joined);
  const rootResolved = path.resolve(ROOT);
  if (!abs.startsWith(rootResolved + path.sep) && abs !== rootResolved) {
    return null;
  }
  return abs;
}

export async function lerArquivoEntregavel(
  segments: string[],
): Promise<{ body: Buffer; contentType: string } | null> {
  const abs = caminhoSeguro(segments);
  if (!abs) return null;

  try {
    const stat = await fs.stat(abs);
    if (!stat.isFile()) return null;
    const body = await fs.readFile(abs);
    return { body, contentType: mimeEntregavel(abs) };
  } catch {
    return null;
  }
}

export function urlInternaEntregavel(pasta: string): string {
  return `/api/entregaveis/${pasta}/index.html`;
}

/** Remove URLs externas remanescentes ao servir texto (HTML/JS/MD). */
export function sanitizarTextoEntregavel(texto: string): string {
  return texto
    .replace(/https:\/\/orion-lead-hunter\.devemdobro\.com\/login/g, "/")
    .replace(/https:\/\/entregaveis-psi\.vercel\.app[^"'\\s]*/g, "/entregaveis");
}

export function sanitizarCorpoEntregavel(
  body: Buffer,
  contentType: string,
): Buffer {
  if (!contentType.startsWith("text/")) return body;
  const texto = sanitizarTextoEntregavel(body.toString("utf8"));
  return Buffer.from(texto, "utf8");
}
