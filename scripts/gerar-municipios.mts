/**
 * F033 — gera a base estática de municípios a partir do IBGE.
 * Spec: /specs/02-features/F033-busca-estruturada.md
 *
 * Roda **uma vez** (não em build, não em runtime): o resultado é versionado em
 * `src/lib/localidades/municipios.json`. Rode de novo só quando o IBGE mudar a
 * malha municipal (raro — criação/fusão de município).
 *
 *   npx tsx scripts/gerar-municipios.mts
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ENDPOINT =
  "https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome";

const DESTINO = resolve(
  process.cwd(),
  "src/lib/localidades/municipios.json",
);

type MunicipioIbge = {
  id: number;
  nome: string;
  microrregiao?: { mesorregiao?: { UF?: { sigla?: string } } };
  "regiao-imediata"?: {
    "regiao-intermediaria"?: { UF?: { sigla?: string } };
  };
};

/** A UF vem por dois caminhos diferentes no payload do IBGE. */
function ufDe(m: MunicipioIbge): string | null {
  return (
    m.microrregiao?.mesorregiao?.UF?.sigla ??
    m["regiao-imediata"]?.["regiao-intermediaria"]?.UF?.sigla ??
    null
  );
}

async function main() {
  const res = await fetch(ENDPOINT);
  if (!res.ok) {
    throw new Error(`IBGE respondeu ${res.status}`);
  }
  const bruto = (await res.json()) as MunicipioIbge[];

  // Formato enxuto: { UF: [nome, ...] }. Só o que a busca precisa — nada de
  // código IBGE, microrregião ou região, que ninguém consulta.
  const porUf: Record<string, string[]> = {};
  let ignorados = 0;

  for (const m of bruto) {
    const uf = ufDe(m);
    if (!uf) {
      ignorados += 1;
      continue;
    }
    (porUf[uf] ??= []).push(m.nome);
  }

  for (const uf of Object.keys(porUf)) {
    porUf[uf]!.sort((a, b) => a.localeCompare(b, "pt-BR"));
  }

  const ordenado = Object.fromEntries(
    Object.keys(porUf)
      .sort()
      .map((uf) => [uf, porUf[uf]]),
  );

  writeFileSync(DESTINO, `${JSON.stringify(ordenado)}\n`, "utf8");

  const total = Object.values(porUf).reduce((s, l) => s + l.length, 0);
  console.log(
    `${total} municípios em ${Object.keys(porUf).length} UFs → ${DESTINO}` +
      (ignorados ? ` (${ignorados} sem UF, ignorados)` : ""),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
