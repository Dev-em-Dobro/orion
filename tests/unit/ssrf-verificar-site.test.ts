import { describe, expect, it } from "vitest";
import { urlPermitidaParaFetch } from "@/lib/diagnostico/verificarSite";

describe("SSRF — urlPermitidaParaFetch", () => {
  it("bloqueia localhost e IPs privados", async () => {
    await expect(urlPermitidaParaFetch("http://127.0.0.1/")).resolves.toBe(
      false,
    );
    await expect(urlPermitidaParaFetch("http://10.0.0.1/")).resolves.toBe(
      false,
    );
    await expect(urlPermitidaParaFetch("http://192.168.1.1/")).resolves.toBe(
      false,
    );
    await expect(urlPermitidaParaFetch("http://localhost/")).resolves.toBe(
      false,
    );
  });

  it("bloqueia protocolo e credenciais", async () => {
    await expect(urlPermitidaParaFetch("file:///etc/passwd")).resolves.toBe(
      false,
    );
    await expect(
      urlPermitidaParaFetch("https://user:pass@example.com/"),
    ).resolves.toBe(false);
  });

  it("aceita https público", async () => {
    await expect(
      urlPermitidaParaFetch("https://example.com/page"),
    ).resolves.toBe(true);
  });
});
