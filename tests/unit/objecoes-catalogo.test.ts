import { describe, expect, it } from "vitest";
import { BRAND } from "@/lib/brand";
import {
  OBJECAO_POR_ID,
  OBJECOES_COMUNS,
  personalizar,
} from "@/lib/objecoes/catalogo";

// F011 (emenda 2026-08-13) — catálogo curado.
// Spec: /specs/02-features/F011-assistente-de-objecoes.md
describe("catálogo de objeções", () => {
  it("abre em 'já tenho site' — a mais comum de quem vende site (AC11)", () => {
    expect(OBJECOES_COMUNS[0]?.id).toBe("ja-tenho-site");
  });

  it("a resposta de 'já tenho site' vai pra demanda e medição, não pro site", () => {
    const o = OBJECAO_POR_ID.get("ja-tenho-site");
    const tudo = [
      o?.perguntaChave ?? "",
      ...(o?.respostas.map((r) => r.texto) ?? []),
    ]
      .join(" ")
      .toLowerCase();

    expect(tudo).toContain("cliente");
    expect(tudo).toMatch(/quantos|medir|saber/);
    expect(tudo).toContain("demanda");
  });

  it("toda objeção traz o porquê, a pergunta-chave e ≥2 respostas (AC12)", () => {
    for (const o of OBJECOES_COMUNS) {
      expect(o.porQue.length, o.id).toBeGreaterThan(40);
      expect(o.perguntaChave.length, o.id).toBeGreaterThan(10);
      expect(o.respostas.length, o.id).toBeGreaterThanOrEqual(2);
      for (const r of o.respostas) {
        expect(r.tatica.length, o.id).toBeGreaterThan(3);
        expect(r.texto.length, o.id).toBeGreaterThan(40);
      }
    }
  });

  it("táticas não se repetem dentro da mesma objeção — ângulos diferentes", () => {
    for (const o of OBJECOES_COMUNS) {
      const taticas = o.respostas.map((r) => r.tatica);
      expect(new Set(taticas).size, o.id).toBe(taticas.length);
    }
  });

  it("ids são únicos e o índice cobre o catálogo inteiro", () => {
    expect(OBJECAO_POR_ID.size).toBe(OBJECOES_COMUNS.length);
  });

  it("nenhum emoji nas respostas — mesma disciplina da F005", () => {
    const emoji = /\p{Extended_Pictographic}/u;
    for (const o of OBJECOES_COMUNS) {
      for (const r of o.respostas) {
        expect(emoji.test(r.texto), `${o.id}: ${r.texto}`).toBe(false);
      }
    }
  });
});

describe("personalizar", () => {
  it("troca {negocio} pelo nome do Lead (AC13)", () => {
    expect(personalizar("Vi sim, {negocio}.", { negocio: "Vet Amigo" })).toBe(
      "Vi sim, Vet Amigo.",
    );
  });

  it("sem nome, cai num neutro — nunca vaza o marcador pro cliente", () => {
    for (const nome of [null, undefined, "   "]) {
      const saida = personalizar("Oi {negocio}", { negocio: nome });
      expect(saida).not.toContain("{negocio}");
      expect(saida).toBe("Oi vocês");
    }
  });

  it("{oferta} sai do brand.ts — a oferta é configurável, não hardcoded", () => {
    expect(personalizar("Faço {oferta}.", {})).toBe(
      `Faço ${BRAND.ofertaDeEntrada}.`,
    );
  });

  it("{categoria} entra minúscula, pra caber no meio da frase", () => {
    expect(
      personalizar("procura {categoria} perto de mim", {
        categoria: "Clínica veterinária",
      }),
    ).toBe("procura clínica veterinária perto de mim");
  });

  it("nenhum marcador sobrevive ao render do catálogo inteiro", () => {
    for (const o of OBJECOES_COMUNS) {
      const textos = [o.perguntaChave, ...o.respostas.map((r) => r.texto)];
      for (const t of textos) {
        const saida = personalizar(t, {
          negocio: "Vet Amigo",
          categoria: "Clínica veterinária",
        });
        expect(saida, `${o.id}: ${t}`).not.toMatch(/\{[a-zA-Z]+\}/);
      }
    }
  });
});
