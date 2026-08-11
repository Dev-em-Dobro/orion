import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NICHOS, NICHOS_POR_SLUG } from "@/lib/nichos/catalogo";
import { tierDoNicho } from "@/lib/score/nichos";
import {
  municipioPertence,
  municipiosDaUf,
  ufValida,
  UFS,
} from "@/lib/localidades";

// F033 AC7 — o catálogo é a fonte do dropdown E do Tier. Se ele divergir do
// playbook, a estratégia de priorização silenciosamente muda.
describe("catálogo de nichos", () => {
  const playbook = readFileSync(
    "specs/05-playbook/nichos-alto-valor.md",
    "utf8",
  );

  it("todo primaryType do catálogo aparece no playbook", () => {
    const faltando = NICHOS.flatMap((n) => n.primaryTypes).filter(
      (tipo) => !playbook.includes(tipo),
    );
    expect(faltando).toEqual([]);
  });

  it("slugs são únicos", () => {
    expect(NICHOS_POR_SLUG.size).toBe(NICHOS.length);
  });

  it("todo includedType também está declarado em primaryTypes", () => {
    // Senão a busca filtraria por um tipo que o Tier não reconhece.
    for (const n of NICHOS) {
      if (n.includedType) {
        expect(n.primaryTypes).toContain(n.includedType);
      }
    }
  });

  it("o Tier deriva do catálogo", () => {
    expect(tierDoNicho("dentist")).toBe("ALTO");
    expect(tierDoNicho("barber_shop")).toBe("MEDIO");
    expect(tierDoNicho("inventado_xyz")).toBe("BAIXO");
  });

  it("tipo compartilhado fica com o Tier mais alto", () => {
    // "doctor" aparece em dermatologista, clínica médica e nutricionista.
    expect(tierDoNicho("doctor")).toBe("ALTO");
  });
});

describe("localidades", () => {
  it("27 UFs", () => {
    expect(UFS).toHaveLength(27);
  });

  it("valida e normaliza a sigla", () => {
    expect(ufValida("pr")).toBe("PR");
    expect(ufValida(" SP ")).toBe("SP");
    expect(ufValida("XX")).toBeNull();
    expect(ufValida(null)).toBeNull();
  });

  it("municípios vêm ordenados e a UF certa", () => {
    const pr = municipiosDaUf("PR");
    expect(pr.length).toBeGreaterThan(300);
    expect(pr).toContain("Curitiba");
    expect([...pr]).toEqual(pr);
  });

  it("rejeita município que não pertence à UF", () => {
    // Evita busca com par inventado ("Curitiba SP").
    expect(municipioPertence("PR", "Curitiba")).toBe(true);
    expect(municipioPertence("PR", "curitiba")).toBe(true);
    expect(municipioPertence("SP", "Curitiba")).toBe(false);
  });
});
