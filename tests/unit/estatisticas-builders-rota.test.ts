// F044 — rota: segredo, validação e resposta.
// Spec: /specs/02-features/F044-estatisticas-builders.md

import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const buscar = vi.fn();
vi.mock("@/lib/integracoes/builders-repositorio", () => ({ buscarEstatisticas: buscar }));

const { POST } = await import("@/app/api/integracoes/builders/estatisticas/route");

function req(body: unknown, auth?: string) {
  return new NextRequest("http://orion.test/api/integracoes/builders/estatisticas", {
    method: "POST",
    headers: { "content-type": "application/json", ...(auth ? { authorization: auth } : {}) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
const corpo = { emails: ["Ana@X.dev"], desde: "2026-12-01", ate: "2026-12-07" };

afterEach(() => {
  delete process.env.BUILDERS_INTEGRATION_SECRET;
  buscar.mockReset();
});

describe("POST /api/integracoes/builders/estatisticas", () => {
  it("503 sem segredo configurado", async () => {
    expect((await POST(req(corpo, "Bearer x"))).status).toBe(503);
  });

  it("401 sem header ou com segredo errado, sem consultar o banco", async () => {
    process.env.BUILDERS_INTEGRATION_SECRET = "segredo-forte-de-teste";
    expect((await POST(req(corpo))).status).toBe(401);
    expect((await POST(req(corpo, "Bearer errado"))).status).toBe(401);
    expect(buscar).not.toHaveBeenCalled();
  });

  it("400 para JSON inválido ou corpo fora do contrato", async () => {
    process.env.BUILDERS_INTEGRATION_SECRET = "segredo-forte-de-teste";
    expect((await POST(req("{", "Bearer segredo-forte-de-teste"))).status).toBe(400);
    expect((await POST(req({ ...corpo, desde: "2026-12-09" }, "Bearer segredo-forte-de-teste"))).status).toBe(400);
  });

  it("200 com e-mails normalizados", async () => {
    process.env.BUILDERS_INTEGRATION_SECRET = "segredo-forte-de-teste";
    buscar.mockResolvedValue([{ email: "ana@x.dev", encontrado: false, dias: [], funil: { respondeu: 0, qualificado: 0, proposta: 0, ganho: 0 } }]);
    const res = await POST(req(corpo, "Bearer segredo-forte-de-teste"));
    expect(res.status).toBe(200);
    expect(buscar).toHaveBeenCalledWith({ emails: ["ana@x.dev"], desde: "2026-12-01", ate: "2026-12-07" });
    expect((await res.json()).resultados[0].email).toBe("ana@x.dev");
  });
});
