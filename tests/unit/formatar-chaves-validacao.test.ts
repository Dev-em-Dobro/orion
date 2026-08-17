import { describe, expect, it } from "vitest";
import {
  formatarPropostaTexto,
  milhar,
  precoFechado,
} from "@/lib/proposta/formatar";
import { selecaoVazia, type Selecao } from "@/lib/proposta/selecao";
import type { PropostaTexto } from "@/lib/proposta/gerarProposta";
import { pedidoCenarioSchema, entradaSchema } from "@/lib/simulador/validacao";
import { colunasDe, lerEnvelope, lerLast4, lerStatus } from "@/lib/chaves/campos";
import { mensagemChaveAusente } from "@/lib/chaves/tipos";
import type { UserApiKeys } from "@prisma/client";

describe("formatar proposta", () => {
  // F012 (emenda 2026-08-16): o cliente vê preço FECHADO. `faixaBRL` saiu
  // junto com `precos.ts` — faixa é ferramenta de quem vende (AC23).
  const prec: Selecao = {
    ...selecaoVazia(),
    itens: ["site_institucional", "manutencao_site"],
    valor: 2400,
    mensal: 150,
    prazo: "3 a 4 semanas",
  };

  it("milhar e preço fechado", () => {
    expect(milhar(2400)).toBe("2.400");
    expect(precoFechado(2400, 150)).toBe("R$ 2.400 + R$ 150/mês");
    expect(precoFechado(2400, 0)).toBe("R$ 2.400");
    expect(precoFechado(0, 150)).toBe("R$ 150/mês");
  });

  it("nunca escreve faixa pro cliente (AC23)", () => {
    const proposta: PropostaTexto = {
      resumo: "X",
      escopo: [],
      entregaveis: [],
      observacoes: "",
    };
    // "R$ 1.500 – R$ 3.000" na mesma linha é o padrão de faixa que não pode
    // mais existir em nada que chegue ao cliente.
    const texto = formatarPropostaTexto(proposta, prec);
    expect(texto).not.toMatch(/R\$[^\n]*[–-]\s*R\$/);
  });

  it("monta texto colável com observações", () => {
    const proposta: PropostaTexto = {
      resumo: "Site institucional",
      escopo: [{ item: "Home", descricao: "Página inicial" }],
      entregaveis: ["Deploy"],
      observacoes: "  sem entrada  ",
    };
    const t = formatarPropostaTexto(proposta, prec);
    expect(t).toContain("Proposta — Site institucional");
    expect(t).toContain("- Home: Página inicial");
    expect(t).toContain("Prazo estimado: 3 a 4 semanas");
    expect(t).toContain("Investimento: R$ 2.400 + R$ 150/mês");
    expect(t).toContain("sem entrada");
  });

  it("omite observações vazias", () => {
    const proposta: PropostaTexto = {
      resumo: "X",
      escopo: [],
      entregaveis: [],
      observacoes: "   ",
    };
    expect(formatarPropostaTexto(proposta, prec)).not.toMatch(/\n\n\s*$/);
  });
});

describe("simulador validacao", () => {
  // Desde a emenda de 2026-08-14 o pedido diz **qual** cenário, não qual
  // conteúdo — quem monta o system prompt é o servidor.
  it("aceita pedido válido por Lead", () => {
    const r = pedidoCenarioSchema.safeParse({
      origem: "lead",
      lead_id: "clx123",
      dificuldade: "medio",
    });
    expect(r.success).toBe(true);
  });

  it("aceita pedido válido manual", () => {
    const r = pedidoCenarioSchema.safeParse({
      origem: "manual",
      categoria: "dentista",
      dificuldade: "medio",
    });
    expect(r.success).toBe(true);
  });

  it("rejeita histórico vazio", () => {
    const r = entradaSchema.safeParse({
      cenario: { origem: "manual", categoria: "cafe", dificuldade: "facil" },
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
