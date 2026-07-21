import { afterEach, describe, expect, it, vi } from "vitest";
import {
  capturarScreenshots,
  ScreenshotError,
} from "@/lib/diagnostico-ux/screenshot";

describe("capturarScreenshots (ScreenshotOne)", () => {
  const prevVercel = process.env.VERCEL;

  afterEach(() => {
    vi.unstubAllGlobals();
    if (prevVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = prevVercel;
  });

  it("sem chave em Vercel → ScreenshotError", async () => {
    process.env.VERCEL = "1";
    await expect(capturarScreenshots("https://x.com", null)).rejects.toThrow(
      ScreenshotError,
    );
  });

  it("com accessKey chama API 2× e devolve base64", async () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff]).buffer;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => jpeg,
      }),
    );

    const shots = await capturarScreenshots("https://x.com", "ak_test");
    expect(shots.desktopB64.length).toBeGreaterThan(0);
    expect(shots.mobileB64.length).toBeGreaterThan(0);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("HTTP error da API → ScreenshotError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401 }),
    );
    await expect(
      capturarScreenshots("https://x.com", "bad"),
    ).rejects.toBeInstanceOf(ScreenshotError);
  });
});
