import { afterEach, describe, expect, it } from "vitest";
import {
  codesPermitidos,
  interpretarVendaTmb,
  productIdsAcessoCompra,
} from "@/lib/tmb/interpretar";
import {
  TMB_CODE_MENTORIA_PRO,
  TMB_ELITE_CODES_DEFAULT,
} from "@/lib/tmb/tipos";

function venda(code: string) {
  return {
    email: "aluno@email.com",
    code,
    pedido: "1001",
    status_pedido: "efetivado",
    status_financeiro: "adimplente",
  };
}

describe("tmb F041 — Elite e Mentoria abrem o Orion", () => {
  afterEach(() => {
    delete process.env.TMB_ELITE_CODES;
    delete process.env.TMB_PRODUCT_CODES;
    delete process.env.HUBLA_PRODUCT_ID;
    delete process.env.HUBLA_PRODUCT_ID_ELITE;
    delete process.env.HUBLA_PRODUCT_ID_CLUB_PRO;
  });

  it("boleto 3XB concede", () => {
    const acao = interpretarVendaTmb(venda(TMB_ELITE_CODES_DEFAULT[0]));
    expect(acao.acao).toBe("conceder");
  });

  it("boleto 9DW concede", () => {
    const acao = interpretarVendaTmb(venda(TMB_ELITE_CODES_DEFAULT[1]));
    expect(acao.acao).toBe("conceder");
  });

  it("Mentoria 1AS concede acesso Free", () => {
    const acao = interpretarVendaTmb(venda(TMB_CODE_MENTORIA_PRO));
    expect(acao.acao).toBe("conceder");
  });

  it("allowlist Elite padrão não inclui Mentoria (cortesia)", () => {
    expect(codesPermitidos().has(TMB_CODE_MENTORIA_PRO)).toBe(false);
    expect(codesPermitidos().has(TMB_ELITE_CODES_DEFAULT[0])).toBe(true);
    expect(codesPermitidos().has(TMB_ELITE_CODES_DEFAULT[1])).toBe(true);
  });

  it("TMB_PRODUCT_CODES com 1AS ainda não coloca Mentoria na cortesia Elite", () => {
    process.env.TMB_PRODUCT_CODES = `${TMB_CODE_MENTORIA_PRO},${TMB_ELITE_CODES_DEFAULT[0]}`;
    expect(codesPermitidos().has(TMB_CODE_MENTORIA_PRO)).toBe(false);
    expect(interpretarVendaTmb(venda(TMB_CODE_MENTORIA_PRO)).acao).toBe(
      "conceder",
    );
  });

  it("productIdsAcessoCompra junta Hubla, TMB Elite e Mentoria", () => {
    process.env.HUBLA_PRODUCT_ID = "legado";
    process.env.HUBLA_PRODUCT_ID_ELITE = "elite-hubla";
    process.env.HUBLA_PRODUCT_ID_CLUB_PRO = "pro-club";
    const ids = productIdsAcessoCompra();
    expect(ids).toEqual(
      expect.arrayContaining([
        "legado",
        "elite-hubla",
        "pro-club",
        TMB_CODE_MENTORIA_PRO,
        ...TMB_ELITE_CODES_DEFAULT,
      ]),
    );
  });
});
