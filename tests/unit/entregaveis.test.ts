import { describe, expect, it } from "vitest";
import { ENTREGAVEIS } from "@/lib/entregaveis";
import { montarKitZipPorSlug } from "@/lib/entregaveis/kit-zip";
import {
  lerArquivoEntregavel,
  sanitizarTextoEntregavel,
} from "@/lib/entregaveis/servir";
import { crc32, montarZip } from "@/lib/entregaveis/zip";

describe("entregaveis servir", () => {
  it("bloqueia path traversal", async () => {
    const res = await lerArquivoEntregavel(["..", "package.json"]);
    expect(res).toBeNull();
  });

  it("lê index do arsenal", async () => {
    const res = await lerArquivoEntregavel(["01-SITES-PRONTOS", "index.html"]);
    expect(res).not.toBeNull();
    expect(res?.contentType).toContain("text/html");
    expect(res?.body.length).toBeGreaterThan(1000);
  });

  it("remove URLs externas ao servir", () => {
    const out = sanitizarTextoEntregavel(
      'href="https://orion-lead-hunter.devemdobro.com/login" e https://entregaveis-psi.vercel.app/foo',
    );
    expect(out).not.toContain("orion-lead-hunter");
    expect(out).not.toContain("entregaveis-psi");
    expect(out).toContain('href="/"');
    expect(out).toContain("/entregaveis");
  });
});

describe("entregaveis zip kits", () => {
  it("catálogo marca portfolio, contrato e scripts com kitZip", () => {
    const comZip = ENTREGAVEIS.filter((e) => e.kitZip).map((e) => e.slug);
    expect(comZip).toEqual(["portfolio", "contrato", "scripts-venda"]);
  });

  it("montarZip gera assinatura PK", () => {
    const body = montarZip([
      { nome: "pasta/a.txt", conteudo: Buffer.from("ola") },
    ]);
    expect(body.subarray(0, 2).toString("utf8")).toBe("PK");
    expect(crc32(Buffer.from("ola"))).toBeGreaterThan(0);
  });

  it("monta kit portfolio com arquivos do content", async () => {
    const kit = await montarKitZipPorSlug("portfolio");
    expect(kit).not.toBeNull();
    expect(kit?.nomeArquivo).toBe("meu-portfolio.zip");
    expect(kit!.body.length).toBeGreaterThan(1000);
    expect(kit!.body.subarray(0, 2).toString("utf8")).toBe("PK");
  });
});
