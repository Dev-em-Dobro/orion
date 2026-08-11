// F015 AC6 — guarda de regressão do 404 real.
//
// `notFound()` só vira status 404 se nada tiver sido enviado ainda. Um
// `loading.tsx` cria um boundary de Suspense na rota: o Next manda o shell,
// commita 200 e o `notFound()` que vem depois só troca a UI no cliente. O
// Lead de outro aluno continua não vazando, mas a resposta é 200 — e o AC6
// diz 404.
//
// Este teste falha se alguém recriar um `loading.tsx` acima de uma rota que
// depende de `notFound()`. O skeleton dessas telas vai num `<Suspense>`
// dentro da própria página (é o que `/leads/page.tsx` faz).

import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const APP = path.join(process.cwd(), "src", "app");

/** Rotas cujo `page.tsx` chama `notFound()`. */
const ROTAS_COM_NOTFOUND = [
  path.join("(orion)", "leads", "[id]"),
  path.join("(orion)", "skills", "[slug]"),
  path.join("(orion)", "entregaveis", "[slug]"),
];

/** Todos os segmentos entre `src/app` e a rota, inclusive a própria. */
function segmentosAcima(rota: string): string[] {
  const partes = rota.split(path.sep);
  return partes.map((_, i) => path.join(...partes.slice(0, i + 1)));
}

describe("F015 AC6 — nenhum loading.tsx acima de rota que usa notFound()", () => {
  it("src/app/loading.tsx não existe (cobriria o app inteiro)", () => {
    expect(existsSync(path.join(APP, "loading.tsx"))).toBe(false);
  });

  for (const rota of ROTAS_COM_NOTFOUND) {
    it(`sem boundary de rota acima de ${rota.replace(/\\/g, "/")}`, () => {
      const comBoundary = segmentosAcima(rota).filter((seg) =>
        existsSync(path.join(APP, seg, "loading.tsx")),
      );
      expect(comBoundary).toEqual([]);
    });
  }
});
