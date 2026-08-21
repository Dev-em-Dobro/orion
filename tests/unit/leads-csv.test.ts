// F032/F035 — CSV da lista.

import { describe, expect, it } from "vitest";
import { montarCsv, type LinhaCsv } from "@/lib/leads/csv";

const base: LinhaCsv = {
  nome: "Barbearia do Zé",
  categoria: "barbershop",
  status: "priorizado",
  score: 92,
  telefone: "(41) 99999-0000",
  website: null,
  endereco: "R. XV, 100",
  dor_principal: "não tem site",
};

describe("F032 — montarCsv", () => {
  it("abre no Excel pt-BR: BOM + ponto e vírgula", () => {
    const csv = montarCsv([base]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv.split("\n")[0]).toContain("nome;categoria;status;score");
  });

  it("campo com ; ou aspas vira campo entre aspas, com aspas dobradas", () => {
    const csv = montarCsv([
      { ...base, nome: 'Bar "do" Zé; e cia', endereco: "R. A, 1" },
    ]);
    expect(csv).toContain('"Bar ""do"" Zé; e cia"');
    expect(csv).toContain('"R. A, 1"');
  });

  it("null vira campo vazio, não a string 'null'", () => {
    const csv = montarCsv([{ ...base, website: null, dor_principal: null }]);
    expect(csv).not.toContain("null");
    expect(csv.split("\n")[1]?.endsWith(";")).toBe(true);
  });

  it("uma linha por Lead, na ordem recebida", () => {
    const csv = montarCsv([base, { ...base, nome: "Segundo" }]);
    const linhas = csv.split("\n");
    expect(linhas).toHaveLength(3);
    expect(linhas[2]).toContain("Segundo");
  });
});
