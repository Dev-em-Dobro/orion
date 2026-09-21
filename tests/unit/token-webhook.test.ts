import { describe, expect, it } from "vitest";
import { tokenValido } from "@/lib/seguranca/token";

describe("seguranca/tokenValido", () => {
  it("aceita token idêntico", () => {
    expect(tokenValido("abc123", "abc123")).toBe(true);
  });

  it("recusa token diferente do mesmo tamanho", () => {
    expect(tokenValido("abc123", "abc124")).toBe(false);
  });

  it("recusa token de tamanho diferente sem estourar", () => {
    // timingSafeEqual lança se os buffers têm tamanhos diferentes — o
    // pré-checque existe pra isso, e o retorno tem que ser `false`, não exceção.
    expect(() => tokenValido("curto", "muito-mais-longo")).not.toThrow();
    expect(tokenValido("curto", "muito-mais-longo")).toBe(false);
  });

  it("recusa string vazia contra token real", () => {
    expect(tokenValido("", "abc123")).toBe(false);
  });

  it("compara bytes, não caracteres: acento não confunde tamanho", () => {
    expect(tokenValido("ação", "ação")).toBe(true);
    expect(tokenValido("acao", "ação")).toBe(false);
  });
});
