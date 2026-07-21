import { describe, expect, it } from "vitest";
import {
  parseFiltroSite,
  whereFiltroSite,
} from "@/lib/leads/filtroSite";

describe("parseFiltroSite", () => {
  it("aceita valores da coluna Site", () => {
    expect(parseFiltroSite("sem_site")).toBe("sem_site");
    expect(parseFiltroSite("rede_social")).toBe("rede_social");
  });

  it("rejeita inválidos", () => {
    expect(parseFiltroSite("")).toBeNull();
    expect(parseFiltroSite("xyz")).toBeNull();
  });
});

describe("whereFiltroSite", () => {
  it("sem_site → website null ou vazio", () => {
    expect(whereFiltroSite("sem_site")).toEqual({
      OR: [{ website: null }, { website: "" }],
    });
  });

  it("site → website presente e fora dos hosts F009", () => {
    const w = whereFiltroSite("site");
    expect(w).toMatchObject({
      AND: expect.arrayContaining([
        { website: { not: null } },
        { NOT: { website: "" } },
      ]),
    });
  });
});
