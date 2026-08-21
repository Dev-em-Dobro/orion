// F032 — toda rota do app avisa que está carregando.
//
// São três mecanismos, e a escolha entre eles não é gosto:
//
// - `loading.tsx` no segmento (ou num grupo de rota acima dele) — o padrão.
// - `<Suspense>` DENTRO da página — obrigatório onde `loading.tsx` é proibido,
//   que são as rotas com `notFound()`: um boundary de rota faz o Next commitar
//   200 antes do 404 chegar (ver `notfound-sem-boundary.test.ts`).
// - um esqueleto próprio, pra página que não faz E/S nenhuma no servidor e
//   ainda assim espera por algo no cliente. Hoje é uma só: o `/entregaveis/
//   [slug]`, cuja espera está no `<iframe>`.
//
// Sem nenhum dos três, clicar no menu deixa a tela anterior parada até o
// servidor responder — o usuário não sabe se o clique pegou.
//
// Este teste falha quando alguém cria uma página nova e esquece os três.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const APP = path.join(process.cwd(), "src", "app");
const ORION = path.join(APP, "(orion)");

/** Diretórios de segmento de todas as `page.tsx` abaixo de `src/app/(orion)`. */
function paginas(dir: string): string[] {
  const achadas: string[] = [];
  for (const entrada of readdirSync(dir)) {
    const completo = path.join(dir, entrada);
    if (statSync(completo).isDirectory()) {
      achadas.push(...paginas(completo));
    } else if (entrada === "page.tsx") {
      achadas.push(dir);
    }
  }
  return achadas;
}

/**
 * `loading.tsx` vale pro próprio segmento e pros descendentes, então a busca
 * sobe até `src/app/(orion)` — mas não além, porque um boundary acima disso
 * cobriria rotas de outros grupos.
 */
function temBoundaryDeRota(dirDaPagina: string): boolean {
  let atual = dirDaPagina;
  for (;;) {
    if (existsSync(path.join(atual, "loading.tsx"))) return true;
    if (atual === ORION) return false;
    const pai = path.dirname(atual);
    if (pai === atual) return false;
    atual = pai;
  }
}

/** `<Suspense>` na própria página, ou um componente de esqueleto na árvore. */
function temEsqueletoNaPagina(dirDaPagina: string): boolean {
  const fonte = readFileSync(path.join(dirDaPagina, "page.tsx"), "utf8");
  if (fonte.includes("<Suspense")) return true;
  // `<Visor>` e afins: componente de cliente que desenha o próprio esqueleto
  // enquanto espera. Reconhecido pelo import do `page-skeleton` na pasta.
  return readdirSync(dirDaPagina).some(
    (arquivo) =>
      arquivo.endsWith(".tsx") &&
      arquivo !== "page.tsx" &&
      readFileSync(path.join(dirDaPagina, arquivo), "utf8").includes(
        "components/page-skeleton",
      ),
  );
}

const rotas = paginas(ORION);

describe("F032 — feedback de carregamento em toda rota do Orion", () => {
  it("achou as páginas do grupo (orion)", () => {
    // Guarda contra a varredura quebrar e o teste passar vazio.
    expect(rotas.length).toBeGreaterThanOrEqual(12);
  });

  for (const dir of rotas) {
    const rotulo = path.relative(APP, dir).replace(/\\/g, "/") || ".";
    it(`${rotulo} tem loading.tsx, <Suspense> ou esqueleto próprio`, () => {
      const boundary = temBoundaryDeRota(dir);
      const esqueleto = temEsqueletoNaPagina(dir);
      expect(
        boundary || esqueleto,
        `${rotulo} não dá feedback nenhum ao navegar: sem loading.tsx acima, sem <Suspense> e sem esqueleto próprio.`,
      ).toBe(true);
    });
  }
});
