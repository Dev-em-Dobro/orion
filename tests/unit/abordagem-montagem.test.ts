import { describe, expect, it } from "vitest";
import type { TipoDor } from "@prisma/client";
import { OPERACOES_MENSAIS } from "@/lib/planos/catalogo";
import {
  ABERTURAS,
  CTAS,
  FECHOS_FOLLOWUP,
  GANCHOS_FOLLOWUP,
  PONTES,
  RETOMADAS,
  type ChaveAbertura,
} from "@/lib/abordagem/frases";
import {
  contarPalavras,
  type ContextoLead,
} from "@/lib/abordagem/montar";
import { gerarAbordagem } from "@/lib/abordagem/gerarAbordagem";
import { removerEmojis } from "@/lib/abordagem/removerEmojis";

// F005 — "Emenda 2026-08-16 — a Abordagem sai da IA".
// Spec: /specs/02-features/F005-abordagem-whatsapp.md
//
// O ponto destes testes: as táticas da F005 eram instruções de prompt, e a
// única verificação possível era ler o prompt. Agora são propriedades do pool,
// e dá pra checar TODAS as combinações — não uma amostra.

/** Nome longo de propósito: é o pior caso do limite de palavras. */
const NEGOCIO = "Clínica Veterinária Amigo";

const CHAVES = Object.keys(ABERTURAS) as ChaveAbertura[];

function ctx(over: Partial<ContextoLead> = {}): ContextoLead {
  return {
    nome: NEGOCIO,
    categoria: "veterinary_care",
    endereco: "Rua X, 100",
    dores: [
      { tipo: "SITE_LENTO", severidade: "ALTA", detalhes: "site lento" },
    ],
    seed: "clh1x2y3z4a5b6c7d8e9f0",
    ...over,
  };
}

describe("pools da Abordagem — propriedades de TODAS as combinações", () => {
  // AC13. O teto vem da tática 5 (≤~70 palavras). Medido sobre o produto
  // cartesiano inteiro, com o BRAND padrão: `propostaDeValor` e
  // `ofertaDeEntrada` entram na conta, então marca editada por aluno muito
  // verborrágica pode estourar — é o preço de a marca ser configurável.
  it("primeira mensagem: nenhuma das 36 combinações por Dor passa de 70 palavras", () => {
    for (const chave of CHAVES) {
      for (const abertura of ABERTURAS[chave]) {
        for (const ponte of PONTES) {
          for (const cta of CTAS) {
            const texto = [
              abertura.replaceAll("{negocio}", NEGOCIO),
              ponte,
              cta,
            ].join(" ");
            expect(
              contarPalavras(texto),
              `${chave}: ${texto}`,
            ).toBeLessThanOrEqual(70);
          }
        }
      }
    }
  });

  it("follow-up: nenhuma combinação passa de 45 palavras", () => {
    for (const chave of CHAVES) {
      for (const retomada of RETOMADAS) {
        for (const fecho of FECHOS_FOLLOWUP) {
          const texto = [
            retomada.replaceAll("{negocio}", NEGOCIO),
            GANCHOS_FOLLOWUP[chave],
            fecho,
          ].join(" ");
          expect(
            contarPalavras(texto),
            `${chave}: ${texto}`,
          ).toBeLessThanOrEqual(45);
        }
      }
    }
  });

  // AC14 — tática 6. No desenho antigo isto era regra de prompt E um
  // `removerEmojis` de reforço, porque o modelo desobedecia.
  it("nenhuma frase do pool tem emoji", () => {
    const todas = [
      ...CHAVES.flatMap((c) => ABERTURAS[c]),
      ...PONTES,
      ...CTAS,
      ...RETOMADAS,
      ...Object.values(GANCHOS_FOLLOWUP),
      ...FECHOS_FOLLOWUP,
    ];
    for (const frase of todas) {
      expect(removerEmojis(frase)).toBe(frase);
    }
  });

  // Tática 3: um CTA só. Duas perguntas na mesma mensagem é o erro que a F005
  // nomeia — e agora ele é impossível, porque só um slot é interrogativo.
  it("a mensagem tem uma pergunta só", () => {
    for (const chave of CHAVES) {
      const { mensagem } = gerarAbordagem(
        ctx({ dores: chave === "SEM_DOR" ? [] : dorDe(chave) }),
      );
      expect(mensagem.split("?").length - 1, mensagem).toBe(1);
    }
  });

  // Regressão de um bug que a primeira amostra gerada mostrou: o pool dizia
  // "o {negocio}" e saía "o Padaria do Bairro". Nome de negócio tem gênero
  // imprevisível, então artigo fixo erra em metade dos Leads — e concordância
  // errada é a assinatura de texto de máquina, logo na linha que deveria
  // provar que alguém olhou o negócio.
  it("nenhum artigo colado em {negocio}", () => {
    const ARTIGO = /\b(o|a|os|as|do|da|no|na|ao|à|pelo|pela)\s+\{negocio\}/i;
    const todas = [
      ...CHAVES.flatMap((c) => ABERTURAS[c]),
      ...RETOMADAS,
    ];
    for (const frase of todas) {
      expect(frase, frase).not.toMatch(ARTIGO);
    }
  });

  it("toda Dor tem abertura e gancho de follow-up próprios", () => {
    for (const chave of CHAVES) {
      expect(ABERTURAS[chave].length).toBeGreaterThanOrEqual(4);
      expect(GANCHOS_FOLLOWUP[chave]).toBeTruthy();
    }
  });
});

// AC17 — a Abordagem não tem teto de plano. O follow-up consumia a mesma cota,
// então 150/mês davam 75 Leads trabalhados dos 300 que o Pro compra.
describe("Abordagem é ilimitada (AC17 / F035)", () => {
  it("não é operação com teto mensal", () => {
    expect(OPERACOES_MENSAIS).not.toContain("abordagem");
  });
});

describe("rotação determinística", () => {
  // AC11 — a metade "mesmo Lead, mesmo texto". É o que deixa o aluno reabrir a
  // aba sem medo de a mensagem que ele já copiou ter virado outra.
  it("o mesmo Lead gera sempre a mesma mensagem", () => {
    expect(gerarAbordagem(ctx()).mensagem).toBe(gerarAbordagem(ctx()).mensagem);
  });

  // AC11 — a outra metade. Sem isto, todo dentista com site lento receberia o
  // mesmo texto, que é exatamente o que a tática 6 existe pra evitar.
  it("Leads diferentes com a mesma Dor recebem textos diferentes", () => {
    const seeds = Array.from({ length: 40 }, (_, i) => `lead-seed-${i}`);
    const textos = new Set(
      seeds.map((seed) => gerarAbordagem(ctx({ seed })).mensagem),
    );
    // 36 combinações e 40 sorteios: colisão é esperada, monocultura não.
    expect(textos.size).toBeGreaterThan(10);
  });

  // AC12. Garantido por construção: o follow-up sorteia de pools separados
  // (RETOMADAS/FECHOS), então não existe seed que faça os dois coincidirem.
  it("o follow-up nunca repete a primeira mensagem do mesmo Lead", () => {
    for (const seed of Array.from({ length: 50 }, (_, i) => `s${i}`)) {
      const c = ctx({ seed });
      expect(gerarAbordagem(c, "followup").mensagem).not.toBe(
        gerarAbordagem(c, "primeira").mensagem,
      );
    }
  });
});

describe("sem Dor detectada (AC15)", () => {
  it("não inventa problema: cai na abertura neutra", () => {
    const { mensagem } = gerarAbordagem(ctx({ dores: [] }));
    const neutras = ABERTURAS.SEM_DOR.map((a) =>
      a.replaceAll("{negocio}", NEGOCIO),
    );
    expect(neutras.some((n) => mensagem.startsWith(n))).toBe(true);
  });

  it("a Dor de maior severidade é a que abre", () => {
    const { mensagem } = gerarAbordagem(
      ctx({
        dores: [
          { tipo: "SEM_HTTPS", severidade: "MEDIA", detalhes: "sem https" },
          { tipo: "SEM_SITE", severidade: "ALTA", detalhes: "sem site" },
        ],
      }),
    );
    const deSemSite = ABERTURAS.SEM_SITE.map((a) =>
      a.replaceAll("{negocio}", NEGOCIO),
    );
    expect(deSemSite.some((a) => mensagem.startsWith(a))).toBe(true);
  });
});

function dorDe(chave: ChaveAbertura) {
  return [
    {
      tipo: chave as TipoDor,
      severidade: "ALTA" as const,
      detalhes: "detalhe",
    },
  ];
}
