import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PLACES_MAX_PAGES,
  PlacesError,
  textSearch,
} from "@/lib/places/textSearch";

function place(id: string) {
  return {
    id,
    displayName: { text: `Negócio ${id}` },
    formattedAddress: "Rua X",
    primaryType: "barber_shop",
    types: ["barber_shop"],
  };
}

describe("textSearch paginação", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("por padrão lê UMA página (F033: 20 resultados = 1 consulta)", async () => {
    // Antes toda coleta paginava até o teto, o aluno querendo ou não: 5
    // requisições Enterprise por busca em vez de 1.
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        places: [place("a")],
        nextPageToken: "tem-mais",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await textSearch("barbearia em Curitiba", "key");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("segue nextPageToken até esgotar", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          places: [place("a"), place("b")],
          nextPageToken: "tok-2",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          places: [place("c")],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const out = await textSearch("barbearia em Curitiba", "key", {
      paginas: 2,
    });
    expect(out.map((p) => p.id)).toEqual(["a", "b", "c"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondBody = JSON.parse(
      (fetchMock.mock.calls[1][1] as RequestInit).body as string,
    );
    expect(secondBody.pageToken).toBe("tok-2");
  });

  it("respeita teto PLACES_MAX_PAGES", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => ({
      ok: true,
      json: async () => ({
        places: [place(`p-${fetchMock.mock.calls.length}`)],
        nextPageToken: "sempre",
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    await textSearch("x", "key", { paginas: 99 });
    expect(fetchMock).toHaveBeenCalledTimes(PLACES_MAX_PAGES);
  });

  it("manda includedType quando o nicho tem tipo único (F033)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ places: [place("a")] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await textSearch("dentista Curitiba PR", "key", {
      includedType: "dentist",
    });
    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.includedType).toBe("dentist");
  });

  it("busca vazia com tipo é refeita UMA vez sem o filtro", async () => {
    // O filtro não pode deixar o aluno sem resposta.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ places: [] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ places: [place("a")] }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const out = await textSearch("x", "key", { includedType: "dentist" });
    expect(out.map((p) => p.id)).toEqual(["a"]);
    expect(out.ampliou).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const segundo = JSON.parse(
      (fetchMock.mock.calls[1][1] as RequestInit).body as string,
    );
    expect(segundo.includedType).toBeUndefined();
  });

  it("falha sem apiKey", async () => {
    await expect(textSearch("x", "")).rejects.toBeInstanceOf(PlacesError);
  });
});
