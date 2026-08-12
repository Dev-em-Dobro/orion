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

    const out = await textSearch("barbearia em Curitiba", "key");
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

    await textSearch("x", "key");
    expect(fetchMock).toHaveBeenCalledTimes(PLACES_MAX_PAGES);
  });

  it("falha sem apiKey", async () => {
    await expect(textSearch("x", "")).rejects.toBeInstanceOf(PlacesError);
  });
});
