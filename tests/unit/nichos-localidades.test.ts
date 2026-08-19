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

  // F033 AC15 (emenda de 2026-08-19) — a guarda acima só via coerência interna
  // do catálogo. `psychologist` passava por ela e o Google respondia 400,
  // derrubando toda busca de Psicólogo desde que o nicho entrou no dropdown.
  // Coerente com a gente não basta: o valor tem que existir na Table A.
  it("todo includedType existe na Table A do contrato", () => {
    const contrato = readFileSync(
      "specs/03-contracts/google-places.md",
      "utf8",
    );
    const bloco = contrato.match(
      /<!-- TIPOS-VALIDOS:INICIO -->\s*```([\s\S]*?)```\s*<!-- TIPOS-VALIDOS:FIM -->/,
    );
    // Sem o bloco não há guarda nenhuma — falhar aqui é melhor que passar vazio.
    const lista = bloco?.[1] ?? "";
    expect(lista, "bloco TIPOS-VALIDOS não encontrado no contrato").not.toBe("");

    const validos = new Set(
      lista
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
    );

    const forbidos = NICHOS.filter(
      (n) => n.includedType && !validos.has(n.includedType),
    ).map((n) => `${n.slug} → ${n.includedType}`);
    expect(forbidos).toEqual([]);
  });

  it("nichos sem tipo na Table A buscam sem includedType", () => {
    // Psicólogo e Nutricionista não têm equivalente na Table A. O certo é ficar
    // sem filtro (o termo em português no textQuery dá conta), não inventar um
    // tipo aproximado que dá 400 ou filtra fora o que o aluno queria.
    expect(NICHOS_POR_SLUG.get("psicologo")?.includedType).toBeUndefined();
    expect(NICHOS_POR_SLUG.get("nutricionista")?.includedType).toBeUndefined();
  });

  // Medido contra a API em 2026-08-19 (20 resultados × GO/PR/SP): psicólogo
  // volta como `medical_clinic` e nutricionista como `consultant` — não como
  // `psychologist`/`nutritionist`, que era dedução. Sem esse mapa os dois
  // nichos caem em BAIXO sendo ALTO no playbook: o erro silencioso que a F033
  // existe pra evitar.
  it("psicólogo e nutricionista resolvem o Tier do playbook", () => {
    expect(NICHOS_POR_SLUG.get("psicologo")?.primaryTypes).toContain(
      "medical_clinic",
    );
    expect(tierDoNicho("medical_clinic")).toBe("ALTO");

    expect(NICHOS_POR_SLUG.get("nutricionista")?.primaryTypes).toContain(
      "consultant",
    );
    expect(tierDoNicho("consultant")).toBe("ALTO");
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
