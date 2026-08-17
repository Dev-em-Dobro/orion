import { describe, expect, it } from "vitest";
import { item } from "@/lib/proposta/catalogo";
import {
  sugerirSelecao,
  type DiagnosticoParaSugestao,
} from "@/lib/proposta/sugestao";
import { validar } from "@/lib/proposta/selecao";

// F012 (emenda de precificação 2026-08-16) — AC20 e AC22.
// Substitui os testes de `servicosRecomendados` e `precificar`, removidos com
// os módulos: preço calculado e preço escolhido não convivem (AC27).

const SEM_SITE: DiagnosticoParaSugestao = {
  tem_site: false,
  site_e_agregador: false,
  tem_https: null,
  performance_mobile: null,
};

function diag(patch: Partial<DiagnosticoParaSugestao>): DiagnosticoParaSugestao {
  return { ...SEM_SITE, ...patch };
}

const CENARIOS = [
  SEM_SITE,
  diag({ tem_site: true, site_e_agregador: true }),
  diag({ tem_site: true, performance_mobile: 31, tem_https: true }),
  diag({ tem_site: true, tem_https: false, performance_mobile: 90 }),
  diag({ tem_site: true, tem_https: true, performance_mobile: 90 }),
];

describe("sugerirSelecao — o Diagnóstico pré-marca (AC20)", () => {
  it("sem site: propõe o site institucional", () => {
    expect(sugerirSelecao(SEM_SITE).itens).toContain("site_institucional");
  });

  it("só agregador conta como sem site — link-in-bio não é site próprio", () => {
    const s = sugerirSelecao(diag({ tem_site: true, site_e_agregador: true }));
    expect(s.itens).toContain("site_institucional");
  });

  it("site no ar e lento: o trabalho é manutenção, não site novo", () => {
    const s = sugerirSelecao(
      diag({ tem_site: true, performance_mobile: 31, tem_https: true }),
    );
    expect(s.itens).not.toContain("site_institucional");
    expect(s.itens).toContain("manutencao_site");
  });

  it("site sem HTTPS também cai em manutenção", () => {
    const s = sugerirSelecao(
      diag({ tem_site: true, tem_https: false, performance_mobile: 90 }),
    );
    expect(s.itens).toContain("manutencao_site");
  });

  it("site saudável: landing, não site institucional", () => {
    const s = sugerirSelecao(
      diag({ tem_site: true, tem_https: true, performance_mobile: 90 }),
    );
    expect(s.itens).toContain("landing");
  });

  it("sempre carrega recorrência — é o erro que a tabela mais cobra", () => {
    for (const d of CENARIOS) {
      const itens = sugerirSelecao(d).itens;
      expect(itens.some((i) => item(i).tipo === "recorrencia")).toBe(true);
    }
  });

  it("a sugestão nasce válida — o aluno não abre a tela com erro na cara", () => {
    for (const d of CENARIOS) {
      expect(validar(sugerirSelecao(d))).toEqual([]);
    }
  });

  it("o valor sugerido acompanha o que foi marcado, e não é zero", () => {
    for (const d of CENARIOS) {
      const s = sugerirSelecao(d);
      expect(s.valor + s.mensal).toBeGreaterThan(0);
    }
  });
});
