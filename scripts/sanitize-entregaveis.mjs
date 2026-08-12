// Remove links externos e referências ao hub publicado dos entregáveis espelhados.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "content", "entregaveis");

const REPLACEMENTS = [
  [
    /https:\/\/orion-lead-hunter\.devemdobro\.com\/login/g,
    "/",
  ],
  [
    /href="\.\.\/index\.html"/g,
    'href="/entregaveis" target="_top"',
  ],
  [
    /<a href="\.\.\/index\.html">Orion<\/a>/g,
    '<a href="/" target="_top">Orion</a>',
  ],
  [
    /Orion: \*\*https:\/\/orion-lead-hunter\.devemdobro\.com\/login\*\* \(acesso liberado no Kickoff, login por convite\)\./,
    "Orion: use o **Dashboard** no menu lateral (você já está logado).",
  ],
  [
    "Não consegui carregar este guia aqui. Se você abriu o arquivo direto (file://), abra pela página publicada ou por um servidor local (Live Server). Você também pode ver o arquivo <a href=\"' + slug + '.md\" target=\"_blank\" rel=\"noopener\">' + slug + '.md</a>.",
    "Não consegui carregar este guia. Atualize a página ou fale com o suporte Dev em Dobro.",
  ],
  [
    "Não consegui carregar o contrato aqui. Se você abriu o arquivo direto (file://), abra pela página publicada ou por um servidor local (Live Server). Você também pode abrir o arquivo <a href=\"' + ARQ + '\" target=\"_blank\" rel=\"noopener\">' + ARQ + '</a> ou baixar o .zip.",
    "Não consegui carregar o contrato. Atualize a página ou baixe o .zip.",
  ],
  [
    "Observacao: precisa ser servido por http(s) (Live Server, GitHub Pages, Hubla).\n  Aberto direto por file:// o fetch e bloqueado pelo navegador.",
    "Observacao: o download funciona dentro do Orion com sessao ativa.",
  ],
  [
    "'Se você abriu este arquivo direto (file://), abra pela página publicada ou por um ' +\n          'servidor local (ex.: Live Server) que o download funciona.'",
    "'Atualize a página no Orion e tente de novo.'",
  ],
];

async function walk(dir, acc = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, acc);
    else if (/\.(html|md|js)$/i.test(e.name)) acc.push(full);
  }
  return acc;
}

function apply(content) {
  let out = content;
  for (const [from, to] of REPLACEMENTS) {
    out = out.replace(from, to);
  }

  // Botões que apontam para / após troca do login externo.
  out = out.replace(
    /<a([^>]*?)href="\/"([^>]*?)rel="noopener"/g,
    '<a$1href="/" target="_top"$2rel="noopener"',
  );
  out = out.replace(
    /<a([^>]*?)href="\/"([^>]*?)class="btn/g,
    '<a$1href="/" target="_top"$2class="btn',
  );

  return out;
}

const files = await walk(ROOT);
let changed = 0;

for (const file of files) {
  const before = await fs.readFile(file, "utf8");
  const after = apply(before);
  if (after !== before) {
    await fs.writeFile(file, after, "utf8");
    changed++;
    console.log("updated", path.relative(ROOT, file));
  }
}

console.log("done", changed, "files");
