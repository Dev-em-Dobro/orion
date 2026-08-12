// Completa o espelho: baixa referências locais (.md, etc.) dos HTML/JS já salvos.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://entregaveis-psi.vercel.app";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "content", "entregaveis");

async function listFiles(dir, acc = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await listFiles(full, acc);
    else if (/\.(html|js|md)$/i.test(e.name)) acc.push(full);
  }
  return acc;
}

function refsFromText(text, baseRel) {
  const found = new Set();
  const baseUrl = `${BASE}/${baseRel.replace(/\\/g, "/")}`;

  for (const m of text.matchAll(/(?:href|src)=["']([^"'#?]+)["']/g)) {
    const r = resolveRef(baseUrl, m[1]);
    if (r) found.add(r);
  }
  for (const m of text.matchAll(/fetch\(\s*['"]([^'"]+)['"]/g)) {
    const r = resolveRef(baseUrl, m[1]);
    if (r) found.add(r);
  }
  for (const m of text.matchAll(/data-zip-files=["']([^"']+)["']/g)) {
    for (const part of m[1].split(",")) {
      const r = resolveRef(baseUrl, part.trim());
      if (r) found.add(r);
    }
  }
  for (const m of text.matchAll(/data-slug=["']([^"']+)["']/g)) {
    const r = resolveRef(baseUrl, `${m[1]}.md`);
    if (r) found.add(r);
  }

  return found;
}

function resolveRef(baseUrl, ref) {
  if (
    !ref ||
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

async function exists(rel) {
  try {
    await fs.access(path.join(ROOT, rel));
    return true;
  } catch {
    return false;
  }
}

async function download(rel) {
  const url = `${BASE}/${rel}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn("skip", rel, res.status);
    return false;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const dest = path.join(ROOT, rel);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, buf);
  console.log("ok", rel, buf.length);
  return true;
}

const files = await listFiles(ROOT);
const pending = new Set();

for (const file of files) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const text = await fs.readFile(file, "utf8");
  for (const ref of refsFromText(text, rel)) pending.add(ref);
}

let added = true;
while (added) {
  added = false;
  for (const rel of [...pending]) {
    if (await exists(rel)) {
      pending.delete(rel);
      continue;
    }
    const ok = await download(rel);
    pending.delete(rel);
    if (ok) {
      added = true;
      const text = await fs.readFile(path.join(ROOT, rel), "utf8");
      for (const ref of refsFromText(text, rel)) {
        if (!(await exists(ref))) pending.add(ref);
      }
    }
  }
}

console.log("done, pending", pending.size);
