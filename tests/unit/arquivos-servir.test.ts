import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  caminhoSeguro,
  lerArquivo,
  listarArquivos,
} from "@/lib/arquivos/servir";

// Raiz e "fora da raiz" em pasta temporária: o teste de symlink precisa criar
// link no disco, e isso não pode acontecer dentro de `content/`.
let tmp: string;
let raiz: string;
let fora: string;
/** Windows sem Developer Mode não deixa criar link — o caso é pulado, não falha. */
let linkCriado = false;

beforeAll(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "orion-servir-"));
  raiz = path.join(tmp, "raiz");
  fora = path.join(tmp, "fora");
  await fs.mkdir(raiz);
  await fs.mkdir(fora);
  await fs.writeFile(path.join(raiz, "dentro.txt"), "conteudo de dentro");
  await fs.writeFile(path.join(fora, "segredo.txt"), "isto nao pode sair");

  try {
    // "junction" funciona no Windows sem elevação; em POSIX o tipo é ignorado.
    await fs.symlink(fora, path.join(raiz, "atalho"), "junction");
    linkCriado = true;
  } catch {
    linkCriado = false;
  }
});

afterAll(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

describe("arquivos/servir — caminhoSeguro (conta léxica)", () => {
  it("rejeita segmento vazio", () => {
    expect(caminhoSeguro(raiz, [])).toBeNull();
  });

  it("rejeita `..`", () => {
    expect(caminhoSeguro(raiz, ["..", "package.json"])).toBeNull();
  });

  it("rejeita NUL no meio do nome", () => {
    expect(caminhoSeguro(raiz, ["dentro\0.txt"])).toBeNull();
  });

  it("aceita caminho dentro da raiz", () => {
    expect(caminhoSeguro(raiz, ["dentro.txt"])).toBe(
      path.join(raiz, "dentro.txt"),
    );
  });
});

describe("arquivos/servir — lerArquivo", () => {
  it("lê arquivo dentro da raiz", async () => {
    const res = await lerArquivo(raiz, ["dentro.txt"]);
    expect(res?.body.toString("utf8")).toBe("conteudo de dentro");
    expect(res?.contentType).toContain("text/plain");
  });

  it("arquivo inexistente é null, não exceção", async () => {
    await expect(lerArquivo(raiz, ["nao-existe.txt"])).resolves.toBeNull();
  });

  it("diretório não é arquivo", async () => {
    await expect(lerArquivo(tmp, ["raiz"])).resolves.toBeNull();
  });

  it("raiz que não existe devolve null", async () => {
    await expect(
      lerArquivo(path.join(tmp, "raiz-fantasma"), ["x.txt"]),
    ).resolves.toBeNull();
  });

  it("symlink que aponta pra fora da raiz não serve o arquivo", async () => {
    if (!linkCriado) return; // sem privilégio de link neste ambiente
    // `caminhoSeguro` aprova: lexicamente o caminho está sob a raiz.
    expect(caminhoSeguro(raiz, ["atalho", "segredo.txt"])).not.toBeNull();
    // Quem barra é a resolução real do caminho.
    await expect(
      lerArquivo(raiz, ["atalho", "segredo.txt"]),
    ).resolves.toBeNull();
  });
});

describe("arquivos/servir — listarArquivos", () => {
  it("lista o que está dentro da raiz", async () => {
    const lista = await listarArquivos(raiz, ["."]);
    expect(lista).toContain("dentro.txt");
  });

  it("não lista através de symlink pra fora", async () => {
    if (!linkCriado) return;
    expect(await listarArquivos(raiz, ["atalho"])).toEqual([]);
    // E a listagem da raiz não atravessa o link: `withFileTypes` não o
    // classifica como diretório, então a recursão nem entra.
    expect(await listarArquivos(raiz, ["."])).not.toContain(
      "atalho/segredo.txt",
    );
  });

  it("raiz inexistente devolve lista vazia", async () => {
    expect(await listarArquivos(path.join(tmp, "raiz-fantasma"), ["."])).toEqual(
      [],
    );
  });
});
