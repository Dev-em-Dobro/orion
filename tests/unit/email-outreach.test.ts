import { describe, expect, it } from "vitest";
import { extrairEmail } from "@/lib/leads/extrairEmail";
import { mailtoLongo, montarMailto } from "@/lib/outreach/mailto";

// F027 — só endereço que o negócio publicou no site dele (ADR-016).
describe("extrairEmail", () => {
  it("pega o mailto: primeiro — é o que o negócio marcou como contato", () => {
    const html = `<a href="mailto:contato@barbearia.com.br">fale conosco</a>`;
    expect(extrairEmail(html)).toBe("contato@barbearia.com.br");
  });

  it("descarta noreply e nomes de arquivo", () => {
    const html = `
      <img src="foto@2x.png">
      <a href="mailto:noreply@sistema.com">x</a>
      <p>logo@3x.jpg</p>`;
    expect(extrairEmail(html)).toBeNull();
  });

  it("prefere o endereço do domínio do site", () => {
    const html = `
      <p>parceiro@outra.com</p>
      <p>contato@barbearia.com.br</p>`;
    expect(extrairEmail(html, "https://www.barbearia.com.br")).toBe(
      "contato@barbearia.com.br",
    );
  });

  it("aceita Gmail quando não há do domínio (comum no negócio local)", () => {
    const html = `<p>barbearia.do.ze@gmail.com</p>`;
    expect(extrairEmail(html, "https://barbearia.com.br")).toBe(
      "barbearia.do.ze@gmail.com",
    );
  });

  it("sem HTML ou sem e-mail → null", () => {
    expect(extrairEmail(null)).toBeNull();
    expect(extrairEmail("<p>sem contato aqui</p>")).toBeNull();
  });

  it("normaliza para minúsculas", () => {
    expect(extrairEmail(`<p>Contato@Site.COM.BR</p>`)).toBe(
      "contato@site.com.br",
    );
  });
});

describe("montarMailto", () => {
  it("encoda assunto e corpo com espaço como %20", () => {
    // "+" (padrão do URLSearchParams) aparece literal em vários clientes.
    const link = montarMailto("a@b.com", "Site lento", "Olá\nTudo bem?");
    expect(link.startsWith("mailto:a%40b.com?")).toBe(true);
    expect(link).toContain("subject=Site%20lento");
    expect(link).not.toContain("+");
  });

  it("preserva acento e quebra de linha", () => {
    const link = montarMailto("a@b.com", "Diagnóstico", "linha1\nlinha2");
    expect(decodeURIComponent(link.split("body=")[1]!)).toBe("linha1\nlinha2");
    expect(decodeURIComponent(link.split("subject=")[1]!.split("&")[0]!)).toBe(
      "Diagnóstico",
    );
  });

  it("avisa quando o corpo é longo demais pro mailto", () => {
    expect(mailtoLongo("a".repeat(100))).toBe(false);
    expect(mailtoLongo("a".repeat(2000))).toBe(true);
  });
});
