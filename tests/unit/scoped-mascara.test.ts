import { describe, expect, it } from "vitest";
import { mensagemEscopo, TenantNotFoundError } from "@/lib/db/scoped";
import { AuthError } from "@/lib/auth/errors";
import { ChaveAusenteError } from "@/lib/chaves/erros";
import { CifraError } from "@/lib/seguranca/cifra";
import { LlmError } from "@/lib/llm/erros";
import { formatarMascara, ultimos4 } from "@/lib/chaves/mascara";

describe("mensagemEscopo", () => {
  it("mapeia erros de domínio para a mensagem", () => {
    expect(mensagemEscopo(new AuthError("sem sessão"))).toBe("sem sessão");
    expect(mensagemEscopo(new TenantNotFoundError("Lead"))).toBe(
      "Lead não encontrado",
    );
    expect(mensagemEscopo(new ChaveAusenteError("google"))).toMatch(
      /não configurada/,
    );
    expect(mensagemEscopo(new CifraError("cifra falhou"))).toBe("cifra falhou");
    expect(mensagemEscopo(new LlmError(429, "quota"))).toBe("quota");
  });

  it("erros genéricos → null (action decide)", () => {
    expect(mensagemEscopo(new Error("boom"))).toBeNull();
    expect(mensagemEscopo("string")).toBeNull();
  });
});

describe("máscara de chave", () => {
  it("ultimos4 e formatarMascara", () => {
    expect(ultimos4("sk-abcdefgh")).toBe("efgh");
    expect(ultimos4("ab")).toBe("ab");
    expect(ultimos4("   ")).toBe("????");
    expect(formatarMascara("efgh")).toBe("••••efgh");
    expect(formatarMascara(null)).toBeNull();
  });
});
