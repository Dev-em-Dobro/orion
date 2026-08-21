import { describe, expect, it } from "vitest";
import { detectarAtendimento } from "@/lib/diagnostico/atendimento";
import { detectarDores } from "@/lib/dores";

const BASE = {
  tem_site: true,
  site_e_agregador: false,
  tem_https: true,
  performance_mobile: 90,
};

describe("detectarAtendimento", () => {
  it("fingerprint de plataforma → detectado, com a marca na evidência", () => {
    const html = `<html><script src="https://widget.manychat.com/x.js"></script></html>`;
    expect(detectarAtendimento(html)).toEqual({
      classificacao: "detectado",
      evidencia: "widget ManyChat",
    });
  });

  it("wa.me com texto pré-preenchido → indícios", () => {
    const html = `<a href="https://wa.me/5541999999999?text=Ol%C3%A1">fale</a>`;
    const sinal = detectarAtendimento(html);
    expect(sinal.classificacao).toBe("indicios");
    expect(sinal.evidencia).toContain("pré-preenchida");
  });

  it("wa.me SEM texto não é indício (é só um link de contato)", () => {
    const html = `<a href="https://wa.me/5541999999999">fale</a>`;
    expect(detectarAtendimento(html).classificacao).toBe("nao_detectado");
  });

  it("site comum → nao_detectado, com evidência do que se procurou", () => {
    const html = `<html><body><h1>Barbearia</h1><p>Rua X, 100</p></body></html>`;
    expect(detectarAtendimento(html)).toEqual({
      classificacao: "nao_detectado",
      evidencia: "nenhum widget de chat encontrado no site",
    });
  });

  it("sem HTML → nao_avaliado (diferente de nao_detectado)", () => {
    // Um diz "não deu pra olhar"; o outro, "olhamos e não achamos".
    expect(detectarAtendimento(null).classificacao).toBe("nao_avaliado");
    expect(detectarAtendimento("").classificacao).toBe("nao_avaliado");
  });

  it("plataforma vence indício quando os dois aparecem", () => {
    const html = `<a href="https://wa.me/551?text=oi">x</a>
      <script src="https://code.jivosite.com/w.js"></script>`;
    expect(detectarAtendimento(html).classificacao).toBe("detectado");
  });
});

describe("Dor SEM_ATENDIMENTO_AUTOMATIZADO", () => {
  it("nasce com nao_detectado + telefone", () => {
    const dores = detectarDores(
      { ...BASE, atendimento_automatizado: "nao_detectado" },
      "https://site.com",
      "(41) 99999-0000",
    );
    const dor = dores.find((d) => d.tipo === "SEM_ATENDIMENTO_AUTOMATIZADO");
    expect(dor?.severidade).toBe("MEDIA");
  });

  it("não nasce sem telefone — não há WhatsApp pra automatizar", () => {
    const dores = detectarDores(
      { ...BASE, atendimento_automatizado: "nao_detectado" },
      "https://site.com",
      null,
    );
    expect(
      dores.some((d) => d.tipo === "SEM_ATENDIMENTO_AUTOMATIZADO"),
    ).toBe(false);
  });

  it("não nasce quando detectado nem quando não avaliado", () => {
    for (const at of ["detectado", "indicios", "nao_avaliado"] as const) {
      const dores = detectarDores(
        { ...BASE, atendimento_automatizado: at },
        "https://site.com",
        "(41) 99999-0000",
      );
      expect(
        dores.some((d) => d.tipo === "SEM_ATENDIMENTO_AUTOMATIZADO"),
      ).toBe(false);
    }
  });

  it("Diagnóstico antigo (sem o campo) não gera a Dor", () => {
    const dores = detectarDores(BASE, "https://site.com", "(41) 99999-0000");
    expect(
      dores.some((d) => d.tipo === "SEM_ATENDIMENTO_AUTOMATIZADO"),
    ).toBe(false);
  });
});
