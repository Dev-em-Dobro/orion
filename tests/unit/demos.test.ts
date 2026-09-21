import { afterEach, describe, expect, it } from "vitest";
import { demoUrlFor } from "@/lib/demos";

// Um place_id que tem demo no mapa, e um que não tem.
const COM_DEMO = "ChIJzVxe3jB3GZURZ7vWSj-8S1Q";
const SEM_DEMO = "ChIJ_place_id_qualquer_sem_demo";

describe("demos/demoUrlFor", () => {
  const original = process.env.DEMOS_BASE_URL;

  afterEach(() => {
    if (original === undefined) delete process.env.DEMOS_BASE_URL;
    else process.env.DEMOS_BASE_URL = original;
  });

  it("sem DEMOS_BASE_URL não inventa base — nem localhost", () => {
    delete process.env.DEMOS_BASE_URL;
    expect(demoUrlFor(COM_DEMO)).toBeNull();
  });

  it("env vazia ou só espaços conta como ausente", () => {
    process.env.DEMOS_BASE_URL = "   ";
    expect(demoUrlFor(COM_DEMO)).toBeNull();
  });

  it("com base definida, monta a URL do slug", () => {
    process.env.DEMOS_BASE_URL = "https://demos.exemplo.com";
    expect(demoUrlFor(COM_DEMO)).toBe("https://demos.exemplo.com/ono-clinica");
  });

  it("barra final na env não vira barra dupla na URL", () => {
    process.env.DEMOS_BASE_URL = "https://demos.exemplo.com/";
    expect(demoUrlFor(COM_DEMO)).toBe("https://demos.exemplo.com/ono-clinica");
  });

  it("place_id sem demo é null mesmo com base definida", () => {
    process.env.DEMOS_BASE_URL = "https://demos.exemplo.com";
    expect(demoUrlFor(SEM_DEMO)).toBeNull();
  });
});
