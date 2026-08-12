import { describe, expect, it } from "vitest";
import { sanitizarCallbackUrl } from "@/lib/auth/callback-url";

describe("sanitizarCallbackUrl", () => {
  it("aceita path e query simples (caso leads com filtro)", () => {
    expect(sanitizarCallbackUrl("/leads?categoria=&site=sem_site")).toBe(
      "/leads?categoria=&site=sem_site",
    );
  });

  it("rejeita errorCallback aninhado com segundo ?", () => {
    expect(
      sanitizarCallbackUrl(
        "/login?callbackUrl=/leads?categoria=&site=sem_site",
      ),
    ).toBe("/login");
  });

  it("fallback para /", () => {
    expect(sanitizarCallbackUrl(null)).toBe("/");
    expect(sanitizarCallbackUrl("https://evil.com/phish")).toBe("/phish");
    expect(sanitizarCallbackUrl("//evil.com")).toBe("/");
  });
});
