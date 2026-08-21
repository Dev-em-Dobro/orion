// F032 — CSV da lista. Puro e testável: a action da F035 só chama isto.

export type LinhaCsv = {
  nome: string;
  categoria: string | null;
  status: string;
  score: number;
  telefone: string | null;
  website: string | null;
  endereco: string | null;
  dor_principal: string | null;
};

const COLUNAS = [
  "nome",
  "categoria",
  "status",
  "score",
  "telefone",
  "website",
  "endereco",
  "dor_principal",
] as const satisfies readonly (keyof LinhaCsv)[];

function escapar(v: string | number | null): string {
  const s = v === null ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Ponto e vírgula + BOM: é o que o Excel em pt-BR abre sem virar uma coluna
 * só. Vale o byte a mais.
 */
export function montarCsv(linhas: readonly LinhaCsv[]): string {
  const corpo = linhas.map((l) =>
    COLUNAS.map((c) => escapar(l[c])).join(";"),
  );
  return `﻿${COLUNAS.join(";")}\n${corpo.join("\n")}`;
}
