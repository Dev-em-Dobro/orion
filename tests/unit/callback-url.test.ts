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

  it("descarta UTM com colchetes percent-encoded (ActiveCampaign / Better Auth decode)", () => {
    expect(
      sanitizarCallbackUrl(
        "/?utm_source=ActiveCampaign&utm_medium=email&utm_content=Seu+acesso+ao+Builders+Club+e+ao+Orion&utm_campaign=%5BLI28%5D+%5BALUNOS%5D+%5BACESSO+BUILDERS+CLUB%5D+%5B01%5D",
      ),
    ).toBe("/");
  });

  it("descarta UTM com colchetes já decodificados", () => {
    expect(sanitizarCallbackUrl("/?utm_campaign=[LI28]+[ALUNOS]")).toBe("/");
  });
});
