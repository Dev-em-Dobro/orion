import { describe, expect, it } from "vitest";
import { parseEmailsBulk } from "@/lib/admin/grant";
import {
  dataExpiracaoCortesia,
  entitlementPlanoVigente,
  isoDateEmSaoPaulo,
  somarDiasIso,
} from "@/lib/planos/trial";

describe("parseEmailsBulk", () => {
  it("aceita linhas, vírgulas e deduplica", () => {
    expect(
      parseEmailsBulk("a@x.com\nb@x.com, a@x.com; c@x.com"),
    ).toEqual(["a@x.com", "b@x.com", "c@x.com"]);
  });

  it("ignora lixo sem @", () => {
    expect(parseEmailsBulk("nao-email\nok@ok.com")).toEqual(["ok@ok.com"]);
  });
});

describe("estender trial — regra de base", () => {
  it("não empurra cortesia vigente sem estender: ja_ativo se expires no futuro", () => {
    const agora = new Date("2026-10-29T15:00:00.000-03:00");
    const expires = new Date("2026-12-01T23:59:59.999-03:00");
    expect(
      entitlementPlanoVigente(
        { product_id: "trial-pro-2026-11", expires_at: expires },
        agora,
      ),
    ).toBe(true);
  });

  it("estender a partir do expires vigente soma dias no calendário SP", () => {
    const base = new Date("2026-11-16T23:59:59.999-03:00");
    const novo = dataExpiracaoCortesia(base, 90);
    expect(isoDateEmSaoPaulo(novo)).toBe(
      somarDiasIso(isoDateEmSaoPaulo(base), 90),
    );
  });
});
