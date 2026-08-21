// F037 — ordenação, empate e privacidade do Ranking de Builders.
// Spec: /specs/02-features/F037-ranking-de-builders.md

import { describe, expect, it } from "vitest";
import { calcularRanking, type VendasDoAluno } from "@/lib/ranking/calcular";
import { intervaloDaCompetencia } from "@/lib/ranking/consultar";
import { nomeExibicaoPadrao } from "@/lib/ranking/perfil";

const em = (iso: string) => new Date(iso);

function aluno(
  userId: string,
  vendas: number,
  ultimaEm: string,
  nomeExibicao: string | null = userId,
): VendasDoAluno {
  return { userId, vendas, ultimaEm: em(ultimaEm), nomeExibicao };
}

describe("F037 — ordenação e empate", () => {
  it("ordena por vendas, do maior pro menor", () => {
    const r = calcularRanking(
      [
        aluno("a", 2, "2026-08-10T12:00:00Z"),
        aluno("b", 5, "2026-08-11T12:00:00Z"),
        aluno("c", 3, "2026-08-12T12:00:00Z"),
      ],
      "z",
    );
    expect(r.top.map((l) => l.nomeExibicao)).toEqual(["b", "c", "a"]);
  });

  it("AC9 — empate: quem chegou ao número primeiro fica na frente", () => {
    const r = calcularRanking(
      [
        aluno("tarde", 3, "2026-08-20T12:00:00Z"),
        aluno("cedo", 3, "2026-08-05T12:00:00Z"),
      ],
      "z",
    );
    expect(r.top[0]?.nomeExibicao).toBe("cedo");
  });

  it("o desempate é estável entre execuções", () => {
    const linhas = [
      aluno("a", 3, "2026-08-05T12:00:00Z"),
      aluno("b", 3, "2026-08-06T12:00:00Z"),
      aluno("c", 3, "2026-08-07T12:00:00Z"),
    ];
    const uma = calcularRanking(linhas, "z").top.map((l) => l.nomeExibicao);
    const outra = calcularRanking([...linhas].reverse(), "z").top.map(
      (l) => l.nomeExibicao,
    );
    expect(uma).toEqual(outra);
  });

  it("quem não vendeu não entra no quadro", () => {
    const r = calcularRanking(
      [aluno("a", 0, "2026-08-01T12:00:00Z"), aluno("b", 1, "2026-08-02T12:00:00Z")],
      "z",
    );
    expect(r.top).toHaveLength(1);
    expect(r.participantes).toBe(1);
  });
});

describe("F037 — privacidade (AC5, AC6, AC8)", () => {
  it("AC5 — sem opt-in não aparece nomeado nem ocupa posição", () => {
    const r = calcularRanking(
      [
        aluno("secreto", 9, "2026-08-01T12:00:00Z", null),
        aluno("publico", 2, "2026-08-02T12:00:00Z", "Público"),
      ],
      "z",
    );
    expect(r.top).toHaveLength(1);
    expect(r.top[0]?.nomeExibicao).toBe("Público");
    // O 1º lugar público é 1, não 2 — nenhum buraco denuncia quem está fora.
    expect(r.top[0]?.posicao).toBe(1);
    expect(r.anonimos).toBe(1);
  });

  it("AC6 — quem está fora vê a própria posição", () => {
    const r = calcularRanking(
      [
        aluno("outro", 5, "2026-08-01T12:00:00Z", "Outro"),
        aluno("eu", 9, "2026-08-02T12:00:00Z", null),
      ],
      "eu",
    );
    expect(r.voce?.vendas).toBe(9);
    expect(r.voce?.posicao).toBe(1);
    expect(r.top.some((l) => l.ehVoce)).toBe(false);
  });

  it("AC10 — a própria posição aparece mesmo fora do top", () => {
    const linhas = Array.from({ length: 12 }, (_, i) =>
      aluno(`a${i}`, 20 - i, `2026-08-${String(i + 1).padStart(2, "0")}T12:00:00Z`),
    );
    linhas.push(aluno("eu", 1, "2026-08-28T12:00:00Z", "Eu"));
    const r = calcularRanking(linhas, "eu", 10);
    expect(r.top).toHaveLength(10);
    expect(r.top.some((l) => l.ehVoce)).toBe(false);
    expect(r.voce?.posicao).toBe(13);
  });

  it("AC8 — a linha exposta não carrega userId nem campo de Lead", () => {
    const r = calcularRanking([aluno("a", 1, "2026-08-01T12:00:00Z")], "z");
    expect(Object.keys(r.top[0] ?? {}).sort()).toEqual(
      ["ehVoce", "nomeExibicao", "posicao", "vendas"].sort(),
    );
  });
});

describe("F037 — nome de exibição", () => {
  it("sugere primeiro nome + inicial, nunca o nome inteiro", () => {
    expect(nomeExibicaoPadrao("Ricardo Dias")).toBe("Ricardo D.");
    expect(nomeExibicaoPadrao("Ana Paula Souza")).toBe("Ana S.");
    expect(nomeExibicaoPadrao("Madonna")).toBe("Madonna");
    expect(nomeExibicaoPadrao(null)).toBe("Builder");
  });
});

describe("F037 — competência e fuso (AC3, AC4)", () => {
  it("o mês vai do dia 1 ao dia 1 seguinte, no fuso de São Paulo", () => {
    const { inicio, fim } = intervaloDaCompetencia("2026-08");
    // 01/08 00:00 em SP = 03:00 UTC.
    expect(inicio.toISOString()).toBe("2026-08-01T03:00:00.000Z");
    expect(fim.toISOString()).toBe("2026-09-01T03:00:00.000Z");
  });

  it("AC4 — venda de 31/08 às 22h (SP) cai em agosto", () => {
    const { inicio, fim } = intervaloDaCompetencia("2026-08");
    const venda = new Date("2026-09-01T01:00:00Z"); // 31/08 22h em SP
    expect(venda >= inicio && venda < fim).toBe(true);
  });

  it("dezembro vira janeiro do ano seguinte", () => {
    const { fim } = intervaloDaCompetencia("2026-12");
    expect(fim.toISOString()).toBe("2027-01-01T03:00:00.000Z");
  });
});
