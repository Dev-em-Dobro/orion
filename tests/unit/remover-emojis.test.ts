import { describe, expect, it } from "vitest";
import { removerEmojis } from "@/lib/outreach/removerEmojis";

describe("removerEmojis", () => {
  it("remove emoji e limpa espaços", () => {
    expect(removerEmojis("Oi! 👋 Percebi que…")).toBe("Oi! Percebi que…");
  });

  it("mantém texto sem emoji", () => {
    expect(removerEmojis("Oi, pessoal da Barbearia!")).toBe(
      "Oi, pessoal da Barbearia!",
    );
  });
});
