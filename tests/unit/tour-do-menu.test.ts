import { describe, expect, it } from "vitest";
import { PLANOS, temRecurso } from "@/lib/planos/catalogo";
import {
  LARGURA_BALAO,
  MARGEM_BALAO,
  PASSOS_DO_TOUR,
  passosDoTour,
  posicionarBalao,
  type Retangulo,
} from "@/lib/tutorial/tour";

// F040 — o cadeado do plano e a aritmética do balão.
// Spec: /specs/02-features/F040-tour-do-menu.md (AC3, AC5 e AC6)

/** Um item de menu na sidebar do desktop: coluna de 240px, borda esquerda. */
const ITEM_SIDEBAR: Retangulo = { top: 200, left: 12, largura: 216, altura: 34 };

/**
 * O mesmo item no drawer, que abre pela borda **direita**. O drawer é
 * `min(20rem, 100%)`: no tablet sobra tela à esquerda dele, no celular não.
 */
const ITEM_DRAWER: Retangulo = { top: 200, left: 508, largura: 296, altura: 34 };
const ITEM_DRAWER_CELULAR: Retangulo = {
  top: 200,
  left: 108,
  largura: 296,
  altura: 34,
};

const BALAO = { largura: LARGURA_BALAO, altura: 200 };
const DESKTOP = { largura: 1440, altura: 900 };
const TABLET = { largura: 820, altura: 1180 };
const CELULAR = { largura: 412, altura: 780 };

describe("catálogo do tour", () => {
  it("abre com um passo sem alvo e o resto ancorado", () => {
    expect(PASSOS_DO_TOUR[0]?.alvo).toBeNull();
    expect(PASSOS_DO_TOUR.slice(1).every((p) => p.alvo !== null)).toBe(true);
  });

  it("não repete id nem alvo", () => {
    const ids = PASSOS_DO_TOUR.map((p) => p.id);
    const alvos = PASSOS_DO_TOUR.map((p) => p.alvo).filter(Boolean);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(alvos).size).toBe(alvos.length);
  });

  // AC3 — o descarte por alvo ausente é do componente (é ele que vê o DOM),
  // mas a lista não pode ter regra própria pra "às vezes existe": o passo de
  // Skills é igual a todos os outros, e some porque o item some.
  it("trata Skills como qualquer outro passo", () => {
    const skills = PASSOS_DO_TOUR.find((p) => p.alvo === "skills");
    expect(skills).toBeDefined();
    expect(skills?.recurso).toBeUndefined();
  });
});

describe("passosDoTour — cadeado do plano (AC5)", () => {
  // O aviso do balão é o **espelho** do cadeado do menu, não uma segunda
  // opinião sobre o que é pago: a condição é a mesma `temRecurso`. É esta
  // asserção que continua valendo no dia em que um plano fechar um recurso.
  it("bloqueia exatamente o que o menu bloquearia, em todos os planos", () => {
    for (const plano of PLANOS) {
      for (const passo of passosDoTour(plano)) {
        expect(passo.bloqueado).toBe(
          passo.recurso ? !temRecurso(plano, passo.recurso) : false,
        );
      }
    }
  });

  // F035 v2 revogou o gate por recurso: os três planos liberam tudo, e o que
  // separa plano de plano é cota. Um tour dizendo "recurso pago" ao lado de um
  // item sem cadeado mentiria pro aluno.
  it("hoje não bloqueia nada, nem no Free", () => {
    expect(passosDoTour("free").some((p) => p.bloqueado)).toBe(false);
  });

  it("nenhum passo some por causa do plano", () => {
    for (const plano of PLANOS) {
      expect(passosDoTour(plano)).toHaveLength(PASSOS_DO_TOUR.length);
    }
  });
});

describe("posicionarBalao (AC6)", () => {
  it("sem alvo, centraliza", () => {
    const p = posicionarBalao(null, BALAO, DESKTOP);
    expect(p.lado).toBe("centro");
    expect(p.left).toBe((DESKTOP.largura - BALAO.largura) / 2);
    expect(p.top).toBe((DESKTOP.altura - BALAO.altura) / 2);
  });

  it("alvo na borda esquerda abre à direita dele", () => {
    const p = posicionarBalao(ITEM_SIDEBAR, BALAO, DESKTOP);
    expect(p.lado).toBe("direita");
    expect(p.left).toBe(
      ITEM_SIDEBAR.left + ITEM_SIDEBAR.largura + MARGEM_BALAO,
    );
  });

  it("alvo na borda direita abre à esquerda dele", () => {
    const p = posicionarBalao(ITEM_DRAWER, BALAO, TABLET);
    expect(p.lado).toBe("esquerda");
    expect(p.left).toBe(ITEM_DRAWER.left - MARGEM_BALAO - BALAO.largura);
    expect(p.left).toBeGreaterThanOrEqual(MARGEM_BALAO);
  });

  // No celular o drawer come quase a tela toda: não há 320px nem à direita nem
  // à esquerda do item, e o balão desce. É o caminho normal no mobile, não uma
  // borda — por isso ele é testado com as medidas reais do drawer.
  it("no celular, o item do drawer manda o balão para baixo", () => {
    const p = posicionarBalao(ITEM_DRAWER_CELULAR, BALAO, CELULAR);
    expect(p.lado).toBe("abaixo");
    expect(p.left).toBeGreaterThanOrEqual(MARGEM_BALAO);
    expect(p.left + BALAO.largura).toBeLessThanOrEqual(CELULAR.largura);
  });

  it("centraliza no alvo pelo eixo cruzado", () => {
    const p = posicionarBalao(ITEM_SIDEBAR, BALAO, DESKTOP);
    const meioDoAlvo = ITEM_SIDEBAR.top + ITEM_SIDEBAR.altura / 2;
    expect(p.top + BALAO.altura / 2).toBe(meioDoAlvo);
  });

  it("prende o balão dentro da tela quando o alvo está no topo do menu", () => {
    const noTopo: Retangulo = { ...ITEM_SIDEBAR, top: 4 };
    const p = posicionarBalao(noTopo, BALAO, DESKTOP);
    expect(p.top).toBe(MARGEM_BALAO);
  });

  it("prende o balão dentro da tela quando o alvo está no rodapé do menu", () => {
    const noRodape: Retangulo = { ...ITEM_SIDEBAR, top: DESKTOP.altura - 40 };
    const p = posicionarBalao(noRodape, BALAO, DESKTOP);
    expect(p.top + BALAO.altura + MARGEM_BALAO).toBeLessThanOrEqual(
      DESKTOP.altura,
    );
  });

  // Um alvo largo o bastante pra matar direita e esquerda: sobra o eixo
  // vertical. É o caso do drawer ocupando quase a tela toda.
  it("sem espaço na horizontal, cai para abaixo", () => {
    const largo: Retangulo = { top: 60, left: 8, largura: 396, altura: 34 };
    const p = posicionarBalao(largo, BALAO, CELULAR);
    expect(p.lado).toBe("abaixo");
    expect(p.top).toBe(largo.top + largo.altura + MARGEM_BALAO);
  });

  it("sem espaço embaixo, sobe para acima", () => {
    const largoEmbaixo: Retangulo = {
      top: CELULAR.altura - 80,
      left: 8,
      largura: 396,
      altura: 34,
    };
    const p = posicionarBalao(largoEmbaixo, BALAO, CELULAR);
    expect(p.lado).toBe("acima");
    expect(p.top).toBe(largoEmbaixo.top - MARGEM_BALAO - BALAO.altura);
  });

  it("em tela menor que o balão nos quatro lados, volta ao centro", () => {
    const apertado = { largura: 320, altura: 240 };
    const alvo: Retangulo = { top: 100, left: 8, largura: 300, altura: 34 };
    expect(posicionarBalao(alvo, BALAO, apertado).lado).toBe("centro");
  });

  it("nunca devolve posição negativa", () => {
    const alvos: Retangulo[] = [
      ITEM_SIDEBAR,
      ITEM_DRAWER,
      { top: 0, left: 0, largura: 10, altura: 10 },
      { top: 860, left: 1400, largura: 30, altura: 30 },
    ];
    for (const alvo of alvos) {
      for (const viewport of [DESKTOP, CELULAR]) {
        const p = posicionarBalao(alvo, BALAO, viewport);
        expect(p.top).toBeGreaterThanOrEqual(0);
        expect(p.left).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
