import { describe, expect, it } from "vitest";
import {
  parseFiltroLista,
  queryDoFiltro,
  SCORE_CHIP,
  temFiltro,
  whereFiltroLista,
  hrefDoEstagio,
} from "@/lib/leads/filtros";
import { COLUNAS_FUNIL, ESTAGIOS_FUNIL, ROTULO_ESTAGIO } from "@/lib/funil";
import { dorPrincipal } from "@/lib/dores/principal";
import { faixaDeScore, scoreBadge } from "@/lib/leads/faixa";
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
    expect(parseFiltroLista({ estagio: "contatado" }).estagio).toEqual({
      token: "contatado",
      status: ["contatado"],
      rotulo: "Contatado",
    });
    expect(parseFiltroLista({ estagio: "inventado" }).estagio).toBeNull();
    expect(parseFiltroLista({ estagio: "" }).estagio).toBeNull();
  });

  // F010 (revisão 2026-08-13) — o Dashboard passou a desenhar as colunas do
  // kanban, e "Prontos" é `priorizado` + `enriquecido`. Sem cobrir os dois, o
  // clique mostraria menos Leads do que o número na barra.
  it("aceita id de coluna do kanban e cobre todos os status dela", () => {
    expect(parseFiltroLista({ estagio: "prontos" }).estagio).toEqual({
      token: "prontos",
      status: ["priorizado", "enriquecido"],
      rotulo: "Prontos",
    });
  });

  it("URL antiga com status solto continua filtrando o que sempre filtrou", () => {
    // Favorito, histórico, link colado num grupo: `?estagio=priorizado` não
    // pode virar "Prontos" e passar a trazer os `enriquecido` junto.
    const f = parseFiltroLista({ estagio: "priorizado" });
    expect(f.estagio?.status).toEqual(["priorizado"]);
    expect(queryDoFiltro(f)).toContain("estagio=priorizado");
  });

  it("não aceita `descartado` por aqui — esse caminho é o `status=descartados`", () => {
    expect(parseFiltroLista({ estagio: "descartado" }).estagio).toBeNull();
  });

  it("o estágio escolhido vence a visão padrão de 'tudo menos descartado'", () => {
    const where = whereFiltroLista(parseFiltroLista({ estagio: "ganho" }));
    expect(where.status).toEqual({ in: ["ganho"] });
  });

  it("coluna vira `in` com os dois status", () => {
    const where = whereFiltroLista(parseFiltroLista({ estagio: "prontos" }));
    expect(where.status).toEqual({ in: ["priorizado", "enriquecido"] });
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
  it("volta pelo parse como o mesmo recorte — status solto e coluna", () => {
    const tokens = [
      ...ESTAGIOS_FUNIL,
      ...COLUNAS_FUNIL.map((c) => c.id),
    ] as string[];
    for (const token of tokens) {
      const href = hrefDoEstagio(token);
      const params = Object.fromEntries(
        new URLSearchParams(href.split("?")[1] ?? ""),
      );
      expect(parseFiltroLista(params).estagio?.token, token).toBe(token);
    }
  });

  // O número da barra é a soma dos status da coluna; o link tem que trazer
  // exatamente esses. Se um dia entrar coluna nova sem status no filtro, é
  // aqui que quebra — e não em produção, com o aluno vendo 10 e a lista 6.
  it("toda coluna do kanban tem link que cobre os status dela", () => {
    for (const coluna of COLUNAS_FUNIL) {
      const params = Object.fromEntries(
        new URLSearchParams(hrefDoEstagio(coluna.id).split("?")[1] ?? ""),
      );
      expect(parseFiltroLista(params).estagio?.status, coluna.id).toEqual(
        coluna.status,
      );
    }
  });

  it("não usa `status`, que já significa descartados", () => {
    expect(hrefDoEstagio("ganho")).not.toContain("status=");
    expect(parseFiltroLista({ status: "ganho" }).estagio).toBeNull();
  });
});

// O form GET de categoria/site manda SÓ os campos que tem. Enquanto ele
// conhecia apenas `categoria` e `site`, submeter apagava o resto do filtro em
// silêncio: clicar no chip "Score 60+", trocar a categoria e perder o score.
// Os campos que o form não controla viajam escondidos, e a lista deles sai
// daqui — filtro novo entra sozinho.
describe("campos escondidos do form de filtro", () => {
  const cheio = parseFiltroLista({
    categoria: "dentist",
    site: "sem_site",
    score: "60",
    telefone: "1",
    atendimento: "nao",
    estagio: "contatado",
  });

  it("preserva tudo que não é categoria nem site", () => {
    const escondidos = new URLSearchParams(
      queryDoFiltro({ ...cheio, categoria: null, site: null }),
    );
    expect(escondidos.get("score")).toBe("60");
    expect(escondidos.get("telefone")).toBe("1");
    expect(escondidos.get("atendimento")).toBe("nao");
    expect(escondidos.get("estagio")).toBe("contatado");
    // Esses dois o form controla — não podem ir escondidos também, senão
    // chegariam duplicados no submit.
    expect(escondidos.has("categoria")).toBe(false);
    expect(escondidos.has("site")).toBe(false);
  });

  it("submeter com os escondidos devolve o mesmo filtro", () => {
    const escondidos = new URLSearchParams(
      queryDoFiltro({ ...cheio, categoria: null, site: null }),
    );
    // O que o navegador enviaria: escondidos + os dois selects.
    const enviado = {
      ...Object.fromEntries(escondidos),
      categoria: "dentist",
      site: "sem_site",
    };
    expect(parseFiltroLista(enviado)).toEqual(cheio);
  });

  it("a visão de descartados também sobrevive ao Filtrar", () => {
    const desc = parseFiltroLista({ status: "descartados" });
    const escondidos = new URLSearchParams(
      queryDoFiltro({ ...desc, categoria: null, site: null }),
    );
    expect(escondidos.get("status")).toBe("descartados");
  });
});

// O badge de score comunica DUAS coisas: quanto (número) e quanto se pode
// confiar (estilo). Até 2026-08-13 comunicava só a primeira — um 92 estimado
// recebia o mesmo verde de um 90 confirmado.
describe("scoreBadge — estimado não usa a cor da faixa", () => {
  it("confirmado pinta pela faixa", () => {
    expect(scoreBadge(90)).toContain("emerald");
    expect(scoreBadge(45)).toContain("amber");
    expect(scoreBadge(10)).toContain("zinc");
  });

  it("estimado é contorno neutro, seja qual for o número", () => {
    for (const n of [10, 45, 90, 100]) {
      const classe = scoreBadge(n, true);
      expect(classe, `score ${n}`).toContain("border");
      // A cor é promessa de confiança: a Triagem não abre o site, então não
      // pode prometer nada.
      expect(classe, `score ${n}`).not.toContain("emerald");
      expect(classe, `score ${n}`).not.toContain("amber");
    }
  });

  it("o padrão continua sendo confirmado — chamada antiga não muda de cor", () => {
    expect(scoreBadge(90)).toBe(scoreBadge(90, false));
  });
});

// `ROTULO_ESTAGIO` é o único lugar autorizado a divergir do nome do estado
// (ver "Rótulo de exibição ≠ nome do estado" no domain model). A regra existe
// porque havia duas fontes: o badge do card mostrava "Pronto pra abordar"
// enquanto o dropdown de "Corrigir status" ainda dizia "Priorizado".
describe("ROTULO_ESTAGIO — fonte única do rótulo de estágio", () => {
  it("cobre todo estado do funil, sem buraco", () => {
    for (const e of ESTAGIOS_FUNIL) {
      expect(ROTULO_ESTAGIO[e], e).toBeTruthy();
    }
  });

  it("priorizado é o único que diverge do próprio nome", () => {
    expect(ROTULO_ESTAGIO.priorizado).toBe("Pronto pra abordar");
    // Os demais são a capitalização do nome — divergência nova exige passar
    // pelo domain model, não por um `label` solto numa tela.
    const divergentes = ESTAGIOS_FUNIL.filter((e) => {
      const capitalizado = e.charAt(0).toUpperCase() + e.slice(1);
      return ROTULO_ESTAGIO[e] !== capitalizado;
    });
    expect(divergentes).toEqual(["priorizado"]);
  });

  it("o estado continua `priorizado` no domínio — só o rótulo mudou", () => {
    expect(ESTAGIOS_FUNIL).toContain("priorizado");
  });
});
