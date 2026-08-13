import { describe, expect, it } from "vitest";
import {
  parseFiltroLista,
  queryDoFiltro,
  SCORE_CHIP,
  temFiltro,
  whereFiltroLista,
  hrefDoEstagio,
} from "@/lib/leads/filtros";
import { ESTAGIOS_FUNIL } from "@/lib/funil";
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
      estagio: null,
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

// Filtro por estágio: nasce do clique no funil do Dashboard e vira `?estagio=`.
describe("filtro por estágio do funil", () => {
  it("aceita um estágio válido e ignora lixo", () => {
    expect(parseFiltroLista({ estagio: "contatado" }).estagio).toBe("contatado");
    expect(parseFiltroLista({ estagio: "inventado" }).estagio).toBeNull();
    expect(parseFiltroLista({ estagio: "" }).estagio).toBeNull();
  });

  it("não aceita `descartado` por aqui — esse caminho é o `status=descartados`", () => {
    expect(parseFiltroLista({ estagio: "descartado" }).estagio).toBeNull();
  });

  it("o estágio escolhido vence a visão padrão de 'tudo menos descartado'", () => {
    const where = whereFiltroLista(parseFiltroLista({ estagio: "ganho" }));
    expect(where.status).toBe("ganho");
  });

  it("sem estágio, segue escondendo descartado", () => {
    const where = whereFiltroLista(parseFiltroLista({}));
    expect(where.status).toEqual({ not: "descartado" });
  });

  it("conta como filtro ativo e sobrevive na querystring", () => {
    const f = parseFiltroLista({ estagio: "proposta" });
    expect(temFiltro(f)).toBe(true);
    expect(queryDoFiltro(f)).toContain("estagio=proposta");
  });
});

// O funil do Dashboard apontava pra `?status=`, que nesta lista significa
// "descartados" — o clique navegava e não filtrava nada. O link agora sai
// daqui, e este teste é o que impede o par link/parser de divergir de novo.
describe("hrefDoEstagio — o link do funil casa com o parser", () => {
  it("volta pelo parse como o mesmo estágio", () => {
    for (const estagio of ESTAGIOS_FUNIL) {
      const href = hrefDoEstagio(estagio);
      const params = Object.fromEntries(
        new URLSearchParams(href.split("?")[1] ?? ""),
      );
      expect(parseFiltroLista(params).estagio, estagio).toBe(estagio);
    }
  });

  it("não usa `status`, que já significa descartados", () => {
    expect(hrefDoEstagio("ganho")).not.toContain("status=");
    expect(parseFiltroLista({ status: "ganho" }).estagio).toBeNull();
  });
});
