import { describe, expect, it } from "vitest";
import {
  faixaBRL,
  formatarPropostaTexto,
  milhar,
} from "@/lib/proposta/formatar";
import type { Precificacao } from "@/lib/proposta/precos";
import type { PropostaTexto } from "@/lib/proposta/gerarProposta";
import { cenarioSchema, entradaSchema } from "@/lib/simulador/validacao";
import { colunasDe, lerEnvelope, lerLast4, lerStatus } from "@/lib/chaves/campos";
import { mensagemChaveAusente } from "@/lib/chaves/tipos";
import type { UserApiKeys } from "@prisma/client";

describe("formatar proposta", () => {
  const prec: Precificacao = {
    servicos: ["CRIACAO_SITE"],
    tier: "MEDIO",
    faixa_min: 1500,
    faixa_max: 3000,
    moeda: "BRL",
  };

  it("milhar e faixaBRL", () => {
    expect(milhar(2400)).toBe("2.400");
    expect(faixaBRL(prec)).toBe("R$ 1.500 – R$ 3.000");
  });

  it("monta texto colável com observações", () => {
    const proposta: PropostaTexto = {
      resumo: "Site institucional",
      escopo: [{ item: "Home", descricao: "Página inicial" }],
      entregaveis: ["Deploy"],
      prazo_estimado: "2 semanas",
      observacoes: "  sem entrada  ",
    };
    const t = formatarPropostaTexto(proposta, prec);
    expect(t).toContain("Proposta — Site institucional");
    expect(t).toContain("- Home: Página inicial");
    expect(t).toContain("Investimento sugerido: R$ 1.500 – R$ 3.000");
    expect(t).toContain("sem entrada");
  });

  it("omite observações vazias", () => {
    const proposta: PropostaTexto = {
      resumo: "X",
      escopo: [],
      entregaveis: [],
      prazo_estimado: "1 semana",
      observacoes: "   ",
    };
    expect(formatarPropostaTexto(proposta, prec)).not.toMatch(/\n\n\s*$/);
  });
});

describe("simulador validacao", () => {
  it("aceita cenário válido", () => {
    const r = cenarioSchema.safeParse({
      categoria: "dentist",
      dores: ["sem site"],
      dificuldade: "medio",
    });
    expect(r.success).toBe(true);
  });

  it("rejeita histórico vazio", () => {
    const r = entradaSchema.safeParse({
      cenario: {
        categoria: "cafe",
        dores: [],
        dificuldade: "facil",
      },
      historico: [],
    });
    expect(r.success).toBe(false);
  });
});

describe("chaves campos/tipos", () => {
  it("mensagemChaveAusente", () => {
    expect(mensagemChaveAusente("google")).toMatch(/Google/);
  });

  it("colunasDe por tipo", () => {
    expect(colunasDe("google").ciphertext).toBe("google_ciphertext");
    expect(colunasDe("anthropic").iv).toBe("anthropic_iv");
    expect(colunasDe("openai").authTag).toBe("openai_auth_tag");
    expect(colunasDe("gemini").ciphertext).toBe("gemini_ciphertext");
    expect(colunasDe("screenshotone").last4).toBe("screenshotone_last4");
  });

  it("lerStatus/Last4/Envelope com row nula ou incompleta", () => {
    expect(lerStatus(null, "openai")).toBe("faltando");
    expect(lerLast4(null, "openai")).toBeNull();

    const row = {
      openai_ciphertext: Buffer.from("c"),
      openai_iv: Buffer.from("i"),
      openai_auth_tag: Buffer.from("a"),
      openai_key_version: 1,
      openai_last4: "abcd",
      openai_status: "configurada",
    } as unknown as UserApiKeys;

    expect(lerStatus(row, "openai")).toBe("configurada");
    expect(lerLast4(row, "openai")).toBe("abcd");
    expect(lerEnvelope(row, "openai")).toMatchObject({ keyVersion: 1 });

    const incompleto = { ...row, openai_iv: null } as unknown as UserApiKeys;
    expect(lerEnvelope(incompleto, "openai")).toBeNull();
  });
});
