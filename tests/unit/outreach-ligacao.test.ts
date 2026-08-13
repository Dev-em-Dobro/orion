import { describe, expect, it } from "vitest";
import { ehRoteiroFalado, ROTULO_CANAL } from "@/lib/outreach/canais";
import { montarContexto, systemPrompt } from "@/lib/outreach/prompt";
import { systemPromptLigacao } from "@/lib/outreach/prompt-ligacao";

// F038 — abordagem por voz. Spec: /specs/02-features/F038-abordagem-por-voz.md
const CTX = {
  nome: "Clínica Vet Amigo",
  categoria: "veterinary_care",
  endereco: "Rua X, 100",
  dores: ["site muito lento no celular (nota 31/100)"],
};

describe("canais", () => {
  it("só `ligacao` é roteiro falado — é o que tira o wa.me da UI (AC4)", () => {
    expect(ehRoteiroFalado("ligacao")).toBe(true);
    expect(ehRoteiroFalado("whatsapp")).toBe(false);
    expect(ehRoteiroFalado("email")).toBe(false);
  });

  it("todo canal do enum tem rótulo em PT — inclusive o legado `email`", () => {
    expect(ROTULO_CANAL.ligacao).toBe("Ligação ou áudio");
    expect(ROTULO_CANAL.whatsapp).toBe("WhatsApp");
    expect(ROTULO_CANAL.email).toBe("E-mail");
  });
});

describe("systemPromptLigacao", () => {
  it("proíbe URL na fala — ninguém soletra endereço de site (AC3)", () => {
    const p = systemPromptLigacao("primeira");
    expect(p).toContain("nunca dite a URL");
    expect(p).toContain("Qualquer URL");
  });

  it("proíbe rubrica de teatro: a saída é só o que se fala (AC3)", () => {
    const p = systemPromptLigacao("primeira");
    expect(p).toContain("[pausa]");
    expect(p).toContain("Rubrica");
  });

  it("o follow-up falado é mais curto que o primeiro contato", () => {
    expect(systemPromptLigacao("primeira")).toContain("~90 palavras");
    expect(systemPromptLigacao("followup")).toContain("~60 palavras");
  });

  it("é um prompt diferente do de texto — não é o mesmo tom", () => {
    expect(systemPromptLigacao("primeira")).not.toBe(systemPrompt("primeira"));
  });
});

describe("montarContexto — site de amostra (F038)", () => {
  it("sem demo, nenhuma linha de link: o modelo não pode inventar um", () => {
    const ctx = montarContexto(CTX);
    expect(ctx).not.toContain("Site de amostra");
    expect(ctx).toContain("Clínica Vet Amigo");
  });

  it("com demo, a URL entra crua pro modelo colar sem reescrever", () => {
    const url = "https://demos.exemplo.com/vet-amigo";
    const ctx = montarContexto({ ...CTX, demoUrl: url });
    expect(ctx).toContain(`Site de amostra`);
    expect(ctx).toContain(url);
  });

  it("demoUrl null é tratado como ausente", () => {
    expect(montarContexto({ ...CTX, demoUrl: null })).not.toContain(
      "Site de amostra",
    );
  });
});

describe("systemPrompt de texto — link do site de amostra", () => {
  it("manda colar a URL exatamente como veio, e não inventar sem ela", () => {
    for (const tipo of ["primeira", "followup"] as const) {
      const p = systemPrompt(tipo);
      expect(p).toContain("exatamente como veio");
      expect(p).toContain("não invente link nenhum");
    }
  });
});
