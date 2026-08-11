// F020 — leitura segura dos arquivos espelhados em content/entregaveis/.
//
// A checagem de path e o mapa de MIME vivem em `lib/arquivos/servir` desde a
// F030, que precisou do mesmo comportamento para as Skills. Aqui fica só o que
// é específico dos entregáveis: a sanitização de URLs externas.

import path from "node:path";
import {
  lerArquivo,
  mimeDoArquivo,
} from "@/lib/arquivos/servir";

const ROOT = path.join(process.cwd(), "content", "entregaveis");

export function mimeEntregavel(arquivo: string): string {
  return mimeDoArquivo(arquivo);
}

export async function lerArquivoEntregavel(
  segments: string[],
): Promise<{ body: Buffer; contentType: string } | null> {
  return lerArquivo(ROOT, segments);
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
