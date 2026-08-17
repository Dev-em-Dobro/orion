import { describe, expect, it } from "vitest";
import {
  CATALOGO,
  faixaDeReferencia,
  item,
  type ItemId,
} from "@/lib/proposta/catalogo";
import {
  brl,
  selecaoVazia,
  sugerirMensal,
  sugerirPrazo,
  sugerirValor,
  temRecorrencia,
  validar,
  type Selecao,
} from "@/lib/proposta/selecao";

// F012 (emenda de precificação 2026-08-16) — AC21 a AC23.
// Spec: /specs/02-features/F012-gerador-de-proposta.md

function sel(patch: Partial<Selecao>): Selecao {
  return { ...selecaoVazia(), ...patch };
}

describe("catálogo (tabela do Arsenal)", () => {
  it("tem os 5 projetos e as 3 recorrências", () => {
    expect(CATALOGO.filter((i) => i.tipo === "projeto")).toHaveLength(5);
    expect(CATALOGO.filter((i) => i.tipo === "recorrencia")).toHaveLength(3);
  });

  it("não repete id", () => {
    const ids = CATALOGO.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("faixa sempre crescente, e só o sistema é aberta", () => {
    for (const i of CATALOGO) {
      if (i.faixa.max !== null) expect(i.faixa.max).toBeGreaterThan(i.faixa.min);
    }
    const abertas = CATALOGO.filter((i) => i.faixa.max === null).map((i) => i.id);
    expect(abertas).toEqual(["sistema"]);
  });

  it("formata a faixa para o aluno, incluindo a aberta", () => {
    expect(faixaDeReferencia("site_institucional")).toBe("R$ 800 a R$ 2.500");
    expect(faixaDeReferencia("sistema")).toBe("a partir de R$ 5.000");
  });

  it("item fora do catálogo falha alto, não devolve undefined", () => {
    expect(() => item("inexistente" as ItemId)).toThrow(/fora do catálogo/);
  });
});

describe("sugestão de valor (AC22)", () => {
  it("soma o meio da faixa dos projetos marcados", () => {
    // landing 300–800 → 550 ; site_institucional 800–2500 → 1650
    expect(sugerirValor(["landing"])).toBe(550);
    expect(sugerirValor(["landing", "site_institucional"])).toBe(2200);
  });

  it("faixa aberta sugere o piso, não o infinito", () => {
    expect(sugerirValor(["sistema"])).toBe(5000);
  });

  it("recorrência não entra no valor à vista, e vice-versa", () => {
    expect(sugerirValor(["manutencao_site"])).toBe(0);
    expect(sugerirMensal(["site_institucional"])).toBe(0);
    // manutencao_site 50–200 → 125 → arredonda pra 150
    expect(sugerirMensal(["manutencao_site"])).toBe(150);
  });

  it("sem nada marcado, sugere zero — nunca um preço inventado", () => {
    expect(sugerirValor([])).toBe(0);
    expect(sugerirMensal([])).toBe(0);
  });
});

describe("validação (AC21)", () => {
  it("nada marcado é erro, e é o único erro mostrado", () => {
    expect(validar(selecaoVazia())).toEqual([
      "Marque pelo menos um serviço para gerar a proposta.",
    ]);
  });

  it("serviço marcado sem valor é erro", () => {
    const s = sel({ itens: ["site_institucional"] });
    expect(validar(s).some((m) => /Defina o valor/.test(m))).toBe(true);
  });

  it("recorrência marcada sem mensal é erro", () => {
    const s = sel({
      itens: ["site_institucional", "manutencao_site"],
      valor: 2400,
    });
    expect(validar(s).some((m) => /recorrência está zerado/.test(m))).toBe(true);
  });

  it("mensal sem serviço de recorrência é erro", () => {
    const s = sel({ itens: ["site_institucional"], valor: 2400, mensal: 150 });
    expect(validar(s).some((m) => /sem nenhum serviço de recorrência/.test(m))).toBe(
      true,
    );
  });

  it("seleção coerente passa limpo", () => {
    const s = sel({
      itens: ["site_institucional", "manutencao_site"],
      valor: 2400,
      mensal: 150,
      prazo: "3 a 4 semanas",
    });
    expect(validar(s)).toEqual([]);
    expect(temRecorrencia(s)).toBe(true);
  });

  it("só recorrência, sem projeto, é proposta válida", () => {
    const s = sel({
      itens: ["manutencao_site"],
      mensal: 150,
      prazo: "Início em até 1 semana",
    });
    expect(validar(s)).toEqual([]);
  });

  it("sem prazo é erro — prazo é compromisso, não detalhe (AC28)", () => {
    const s = sel({ itens: ["landing"], valor: 700, prazo: "   " });
    expect(validar(s)).toContain("Informe o prazo antes de gerar.");
  });
});

describe("prazo sugerido pelo catálogo (AC28)", () => {
  it("usa a janela do projeto marcado", () => {
    expect(sugerirPrazo(["landing"])).toBe("1 a 2 semanas");
    expect(sugerirPrazo(["sistema"])).toBe("8 a 12 semanas");
  });

  it("projetos correm em paralelo: pega o maior, não a soma", () => {
    // landing 1–2 + site_admin 4–8 → 4 a 8, nunca 5 a 10.
    expect(sugerirPrazo(["landing", "site_admin"])).toBe("4 a 8 semanas");
  });

  it("só recorrência não tem prazo de entrega, tem início", () => {
    expect(sugerirPrazo(["manutencao_site"])).toBe("Início em até 1 semana");
  });

  it("nada marcado, nada sugerido — nunca um prazo inventado", () => {
    expect(sugerirPrazo([])).toBe("");
  });

  it("a sugestão sempre passa na validação de prazo", () => {
    for (const itens of [["landing"], ["manutencao_site"], ["sistema", "bot_whatsapp"]] as const) {
      expect(sugerirPrazo([...itens]).trim()).not.toBe("");
    }
  });
});

describe("formatação para o cliente (AC23)", () => {
  it("é sempre um número fechado, nunca faixa", () => {
    expect(brl(2400)).toBe("R$ 2.400");
    expect(brl(150)).toBe("R$ 150");
    expect(brl(2400)).not.toMatch(/[–-]/);
  });
});
