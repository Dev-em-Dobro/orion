import { describe, expect, it } from "vitest";
import {
  parseFiltroLista,
  queryDoFiltro,
  SCORE_CHIP,
  temFiltro,
  whereFiltroLista,
} from "@/lib/leads/filtros";
import { dorPrincipal } from "@/lib/dores/principal";
import { faixaDeScore } from "@/lib/leads/faixa";
import {
  ORDEM_INVERSA,
  ORDEM_LISTA,
  whereAntes,
  whereDepois,
} from "@/lib/leads/vizinhos";

// F032 — o filtro vive na URL (AC5) e é o mesmo objeto usado pela lista e pela
// navegação ‹ › do detalhe (AC8).
describe("parseFiltroLista", () => {
  it("sem params, é a visão padrão (sem descartados)", () => {
    const f = parseFiltroLista({});
    expect(f).toEqual({
      categoria: null,
      site: null,
      scoreMin: null,
      comTelefone: false,
      semAtendimento: false,
      descartados: false,
    });
    expect(temFiltro(f)).toBe(false);
    expect(whereFiltroLista(f)).toMatchObject({
      status: { not: "descartado" },
    });
  });

  it("lê os chips da URL", () => {
    const f = parseFiltroLista({
      site: "sem_site",
      score: String(SCORE_CHIP),
      telefone: "1",
    });
    expect(f.site).toBe("sem_site");
    expect(f.scoreMin).toBe(SCORE_CHIP);
    expect(f.comTelefone).toBe(true);
    expect(temFiltro(f)).toBe(true);
  });

  it("ignora score fora da faixa e site inválido", () => {
    const f = parseFiltroLista({ score: "999", site: "inventado" });
    expect(f.scoreMin).toBeNull();
    expect(f.site).toBeNull();
  });

  it("descartados troca o status em vez de somar filtro", () => {
    const where = whereFiltroLista(parseFiltroLista({ status: "descartados" }));
    expect(where).toMatchObject({ status: "descartado" });
  });

  it("com telefone exige não-nulo e não-vazio", () => {
    // A base tem telefone vazio: o Places nem sempre devolve o campo.
    const where = whereFiltroLista(parseFiltroLista({ telefone: "1" }));
    expect(where.AND).toEqual([
      { telefone: { not: null } },
      { NOT: { telefone: "" } },
    ]);
  });

  it("querystring preserva o filtro e aceita extras", () => {
    const f = parseFiltroLista({ categoria: "dentist", telefone: "1" });
    const q = queryDoFiltro(f, { page: 3 });
    expect(new URLSearchParams(q).get("categoria")).toBe("dentist");
    expect(new URLSearchParams(q).get("telefone")).toBe("1");
    expect(new URLSearchParams(q).get("page")).toBe("3");
  });

  it("querystring omite extras vazios", () => {
    const q = queryDoFiltro(parseFiltroLista({}), { page: undefined });
    expect(q).toBe("");
  });
});

describe("vizinhos (navegação ‹ ›)", () => {
  const cursor = { score: 70, created_at: new Date("2026-08-01T00:00:00Z") };

  it("depois = score menor, ou mesmo score e mais antigo", () => {
    // Precisa casar com a ordem da lista: score desc, created_at desc.
    expect(whereDepois(cursor).OR).toEqual([
      { score: { lt: 70 } },
      { score: 70, created_at: { lt: cursor.created_at } },
    ]);
  });

  it("antes = score maior, ou mesmo score e mais novo", () => {
    expect(whereAntes(cursor).OR).toEqual([
      { score: { gt: 70 } },
      { score: 70, created_at: { gt: cursor.created_at } },
    ]);
  });

  it("a ordem inversa espelha a da lista", () => {
    expect(ORDEM_LISTA).toEqual([{ score: "desc" }, { created_at: "desc" }]);
    expect(ORDEM_INVERSA).toEqual([{ score: "asc" }, { created_at: "asc" }]);
  });
});

describe("dorPrincipal", () => {
  it("escolhe a de maior severidade", () => {
    const dor = dorPrincipal([
      { severidade: "BAIXA", detalhes: "b" },
      { severidade: "ALTA", detalhes: "a" },
      { severidade: "MEDIA", detalhes: "m" },
    ]);
    expect(dor?.detalhes).toBe("a");
  });

  it("sem Dor, devolve null (o card não inventa texto)", () => {
    expect(dorPrincipal([])).toBeNull();
  });
});

describe("faixaDeScore", () => {
  it("usa os mesmos cortes do scoreBadge", () => {
    expect(faixaDeScore(60)).toBe("Alto");
    expect(faixaDeScore(59)).toBe("Médio");
    expect(faixaDeScore(30)).toBe("Médio");
    expect(faixaDeScore(29)).toBe("Baixo");
  });
});
