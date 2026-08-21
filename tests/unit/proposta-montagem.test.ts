import { describe, expect, it } from "vitest";
import { OPERACOES_MENSAIS } from "@/lib/planos/catalogo";
import { CATALOGO, item, type ItemId } from "@/lib/proposta/catalogo";
import {
  montarProposta,
  type ContextoProposta,
  type DorDoLead,
} from "@/lib/proposta/montar";

// F012 — "Emenda 2026-08-16 (fim do dia) — a Proposta sai da IA".
// Spec: /specs/02-features/F012-gerador-de-proposta.md

const DOR_LENTO: DorDoLead = {
  tipo: "SITE_LENTO",
  severidade: "MEDIA",
  detalhes: "site muito lento no celular (nota 31/100)",
};

function ctx(over: Partial<ContextoProposta> = {}): ContextoProposta {
  return {
    nome: "Padaria do Bairro",
    categoria: "bakery",
    dores: [DOR_LENTO],
    itens: ["site_institucional", "manutencao_site"],
    ...over,
  };
}

// AC36 — a Proposta não tem teto de plano. Custa R$0 (montada em código) e é a
// última etapa antes do `ganho`: pôr teto ali limita a capacidade de fechar.
// Com o teto antigo de 3/mês no Free, seguir a recomendação da própria F012
// ("se quiser três opções, gera três propostas") gastava o mês num cliente só.
describe("Proposta é ilimitada (AC36 / F035)", () => {
  it("não é operação com teto mensal", () => {
    expect(OPERACOES_MENSAIS).not.toContain("proposta");
  });

  // A régua da F035: só tem teto o que custa dinheiro. Abordagem saiu junto,
  // pelo mesmo motivo — 150/mês contra os 300 Leads que o Pro compra.
  it("as operações que sobraram no teto são exatamente as que custam algo", () => {
    expect([...OPERACOES_MENSAIS].sort()).toEqual([
      "agente_msg",
      "lead_novo",
      "objecoes",
      "simulador_msg",
    ]);
  });
});

describe("montarProposta", () => {
  // AC31 — o aluno reabre a aba e vê o documento que já mostrou pro cliente.
  it("é determinístico", () => {
    expect(montarProposta(ctx())).toEqual(montarProposta(ctx()));
  });

  // AC32
  it("um item de escopo por serviço, na ordem, com o título do catálogo", () => {
    const p = montarProposta(ctx());
    expect(p.escopo.map((e) => e.item)).toEqual([
      item("site_institucional").titulo,
      item("manutencao_site").titulo,
    ]);
  });

  it("a descrição responde o quê e o porquê", () => {
    const p = montarProposta(ctx({ itens: ["landing"] }));
    expect(p.escopo[0]!.descricao).toContain(item("landing").inclui);
    expect(p.escopo[0]!.descricao).toContain(item("landing").porque);
  });

  // AC33
  it("o resumo abre pela Dor de maior severidade", () => {
    const p = montarProposta(
      ctx({
        dores: [
          DOR_LENTO,
          { tipo: "SEM_SITE", severidade: "ALTA", detalhes: "sem site" },
        ],
      }),
    );
    expect(p.resumo).toContain("não encontra um site próprio");
    expect(p.resumo).toContain("Padaria do Bairro");
  });

  it("sem Dor detectada, não inventa problema", () => {
    const p = montarProposta(ctx({ dores: [] }));
    expect(p.resumo).toContain("já tem uma base digital funcionando");
  });

  // AC35 — "Layout que funciona bem no celular" está na landing e no site
  // institucional; a folha não pode listar duas vezes.
  it("entregáveis são a união dos itens, sem repetir", () => {
    const p = montarProposta(ctx({ itens: ["landing", "site_institucional"] }));
    expect(new Set(p.entregaveis).size).toBe(p.entregaveis.length);
    expect(p.entregaveis).toContain("Layout que funciona bem no celular");
  });

  // Mesma regressão guardada na Abordagem: "o Padaria do Bairro" não pode
  // voltar. Aqui o teste vai pela saída, com um nome feminino de propósito.
  it("não cola artigo no nome do negócio", () => {
    const p = montarProposta(ctx({ nome: "Padaria do Bairro" }));
    expect(p.resumo).not.toMatch(/\b(o|do|no|ao)\s+Padaria/i);
    expect(p.resumo).toContain("Padaria do Bairro");
  });

  it("todo item do catálogo tem porquê e entregáveis próprios", () => {
    for (const i of CATALOGO) {
      expect(i.porque.length, i.id).toBeGreaterThan(0);
      expect(i.entregaveis.length, i.id).toBeGreaterThan(0);
    }
  });
});

// AC34 — o invariante mais importante da F012. Antes era instrução de prompt
// ("NUNCA cite preço"); agora o montador sequer recebe `valor`, `mensal` ou
// `prazo`, então não há como vazar. Este teste guarda o texto do catálogo, que
// é a única porta por onde um número poderia entrar.
describe("nenhum dinheiro e nenhum prazo no texto (AC34)", () => {
  const DINHEIRO = /R\$|\breais\b|\bcentavos?\b/i;
  const PRAZO = /\b(prazo|semanas?|dias?|m[êe]s|meses|entrega em)\b/i;

  const TODOS = CATALOGO.map((i) => i.id) as ItemId[];

  it("cobre todos os itens do catálogo de uma vez", () => {
    const p = montarProposta(ctx({ itens: TODOS }));
    const texto = [
      p.resumo,
      ...p.escopo.map((e) => `${e.item} ${e.descricao}`),
      ...p.entregaveis,
      p.observacoes,
    ].join(" ");

    expect(texto).not.toMatch(DINHEIRO);
    expect(texto).not.toMatch(PRAZO);
    expect(texto).not.toMatch(/\d/); // nenhum número, ponto final
  });

  it("vale para cada Dor possível, porque o resumo muda com ela", () => {
    const tipos = [
      "SEM_SITE",
      "SITE_AGREGADOR",
      "SITE_LENTO",
      "SEM_HTTPS",
      "SEM_RESPOSTA_REVIEWS",
      "SEM_ATENDIMENTO_AUTOMATIZADO",
    ] as const;

    for (const tipo of tipos) {
      const p = montarProposta(
        ctx({
          dores: [{ tipo, severidade: "ALTA", detalhes: "x" }],
          itens: TODOS,
        }),
      );
      expect(p.resumo, tipo).not.toMatch(DINHEIRO);
      expect(p.resumo, tipo).not.toMatch(PRAZO);
    }
  });
});
