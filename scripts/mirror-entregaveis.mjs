// Espelha entregaveis-psi.vercel.app em content/entregaveis/ (uso interno Orion).

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://entregaveis-psi.vercel.app";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "content", "entregaveis");

const SEEDS = [
  "01-SITES-PRONTOS/index.html",
  "02-PROMPTS/index.html",
  "04-PORTFOLIO/index.html",
  "05-CONTRATO/index.html",
  "06-SCRIPTS-VENDA/index.html",
  "07-SETUP-ORION/index.html",
  "08-BRIEFING/index.html",
  "09-PRECIFICACAO/index.html",
  "_lib/baixar-zip.js",
  "_lib/jszip.min.js",
];

const done = new Set();
const pending = [...SEEDS];

function resolveRef(baseUrl, ref) {
  if (
    ref.startsWith("http") ||
    ref.startsWith("data:") ||
    ref.startsWith("mailto:") ||
    ref.startsWith("#")
  ) {
    return null;
  }
  const full = new URL(ref, baseUrl);
  if (!full.href.startsWith(BASE)) return null;
  return full.href.replace(`${BASE}/`, "");
}

async function crawl(relPath) {
  if (done.has(relPath)) return;
  done.add(relPath);

  const url = `${BASE}/${relPath}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn("skip", relPath, res.status);
    return;
  }

  const buf = Buffer.from(await res.arrayBuffer());
  const dest = path.join(ROOT, relPath);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, buf);
  console.log("ok", relPath, buf.length);

  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("html") && !ct.includes("javascript")) return;

  const text = buf.toString("utf8");
  const re = /(?:href|src)=["']([^"'#?]+)["']/g;
  for (const m of text.matchAll(re)) {
    const next = resolveRef(url, m[1]);
    if (next && !done.has(next) && !pending.includes(next)) {
      pending.push(next);
    }
  }
}

await fs.mkdir(ROOT, { recursive: true });

while (pending.length > 0) {
  const rel = pending.shift();
  if (!rel) continue;
  await crawl(rel);
}

console.log("total", done.size, "files");
