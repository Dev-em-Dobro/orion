// F033 — leitura do formulário de busca estruturada.
//
// Existe por causa de um bug real: o schema virou o da F033 (`nicho`, `uf`,
// `municipio`, …) e a leitura continuou a da F001 (`termo`, `localizacao`).
// Todo campo chegava vazio, o Zod devolvia o literal "Required" e era isso que
// o aluno via. A busca ficou quebrada sem ninguém perceber, porque nada
// verificava que os dois lados usavam o mesmo vocabulário.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CAMPOS_BUSCA, lerBusca, primeiroErro } from "@/lib/leads/busca";
import { QUANTIDADES } from "@/lib/leads/aprofundamento";

const FORM = path.join(
  process.cwd(),
  "src",
  "app",
  "(orion)",
  "leads",
  "coletar-form.tsx",
);

/** Simula o `FormData` que o navegador manda. */
function campos(dados: Record<string, string>) {
  return { get: (nome: string) => dados[nome] ?? null };
}

const VALIDO = {
  nicho: "dentista",
  uf: "PR",
  municipio: "Curitiba",
  quantidade: String(QUANTIDADES[0]),
};

describe("F033 — lerBusca", () => {
  it("o formulário e a action falam a mesma língua", () => {
    // O teste que teria pego o bug: os `name=` do formulário precisam ser
    // exatamente os campos que `lerBusca` procura.
    const jsx = readFileSync(FORM, "utf8");
    const nomesNoForm = [...jsx.matchAll(/name="([^"]+)"/g)].map((m) => m[1]);

    for (const campo of CAMPOS_BUSCA) {
      expect(nomesNoForm, `campo "${campo}" sumiu do formulário`).toContain(
        campo,
      );
    }
  });

  it("aceita o mínimo: nicho, UF, município e quantidade", () => {
    const r = lerBusca(campos(VALIDO));
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.nicho).toBe("dentista");
      expect(r.data.uf).toBe("PR");
      expect(r.data.municipio).toBe("Curitiba");
      expect(r.data.bairro).toBeUndefined();
    }
  });

  it("bairro e termo livre são opcionais — ausentes viram undefined, não erro", () => {
    const r = lerBusca(campos({ ...VALIDO, bairro: "Batel" }));
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.bairro).toBe("Batel");
  });

  it("quantidade chega como string do form e vira número", () => {
    const r = lerBusca(campos(VALIDO));
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.quantidade).toBe(QUANTIDADES[0]);
  });

  it("campo faltando dá mensagem em português, nunca o 'Required' do Zod", () => {
    for (const ausente of ["nicho", "uf", "municipio"]) {
      const dados = { ...VALIDO };
      delete (dados as Record<string, string>)[ausente];

      const msg = primeiroErro(lerBusca(campos(dados)));
      expect(msg, `faltando "${ausente}"`).not.toBe("Required");
      expect(msg).toMatch(/Escolha/);
    }
  });

  it("quantidade fora do catálogo é recusada", () => {
    const r = lerBusca(campos({ ...VALIDO, quantidade: "9999" }));
    expect(r.success).toBe(false);
    expect(primeiroErro(r)).toBe("Quantidade inválida");
  });

  it("UF com tamanho errado é recusada", () => {
    expect(lerBusca(campos({ ...VALIDO, uf: "PARANA" })).success).toBe(false);
    expect(primeiroErro(lerBusca(campos({ ...VALIDO, uf: "P" })))).toBe(
      "Escolha o estado",
    );
  });

  it("espaço em branco não passa por município", () => {
    const r = lerBusca(campos({ ...VALIDO, municipio: "   " }));
    expect(r.success).toBe(false);
  });
});
