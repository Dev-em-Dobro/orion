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
 * Rejeita `..` e NUL antes de resolver, e confere o resultado contra a raiz.
 *
 * Conta **léxica**: `path.resolve` não olha o disco. Um symlink dentro da raiz
 * apontando pra fora passa por aqui — quem barra esse caso é
 * `caminhoRealDentroDaRaiz`, no caminho assíncrono.
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

/**
 * O caminho de verdade de `abs`, se ele continuar dentro da raiz **depois** de
 * resolver symlinks. `null` se escapar, se não existir, ou se a própria raiz não
 * existir — nos três casos não há o que servir.
 *
 * Só `fs.realpath` resolve link, e só pode ser chamado de função async — é por
 * isso que a checagem mora aqui e não em `caminhoSeguro`. A raiz também é
 * resolvida: no Windows ela volta com a caixa canônica, e comparar prefixo só
 * vale entre dois caminhos reais.
 */
async function caminhoRealDentroDaRaiz(
  root: string,
  abs: string,
): Promise<string | null> {
  try {
    const raizReal = await fs.realpath(root);
    const real = await fs.realpath(abs);
    if (real !== raizReal && !real.startsWith(raizReal + path.sep)) return null;
    return real;
  } catch {
    return null;
  }
}

export async function lerArquivo(
  root: string,
  segments: string[],
): Promise<{ body: Buffer; contentType: string } | null> {
  const abs = caminhoSeguro(root, segments);
  if (!abs) return null;

  const real = await caminhoRealDentroDaRaiz(root, abs);
  if (!real) return null;

  try {
    const stat = await fs.stat(real);
    if (!stat.isFile()) return null;
    // MIME do arquivo real: se um link mudasse a extensão, o Content-Type tem
    // que descrever os bytes que saem, não o nome pedido.
    return { body: await fs.readFile(real), contentType: mimeDoArquivo(real) };
  } catch {
    return null;
  }
}

/**
 * Caminhos relativos de todos os arquivos sob `segments`, recursivo.
 *
 * A caminhada não precisa de checagem extra: `withFileTypes` classifica por
 * `lstat`, então um symlink não é `isDirectory()` nem `isFile()` e cai fora dos
 * dois ramos sozinho. O que se confere aqui é o ponto de partida.
 */
export async function listarArquivos(
  root: string,
  segments: string[],
): Promise<string[]> {
  const abs = caminhoSeguro(root, segments);
  if (!abs) return [];

  const real = await caminhoRealDentroDaRaiz(root, abs);
  if (!real) return [];

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

  await andar(real, "");
  return encontrados.sort();
}
