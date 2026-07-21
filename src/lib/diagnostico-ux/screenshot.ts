// F008 — captura de screenshots (desktop + mobile) do site de um Lead.
// Provider: ScreenshotOne (chave do aluno) em serverless; Playwright local
// sem chave. Decisão: ADR-006. Contrato: /specs/03-contracts/screenshotone.md

import type { Browser } from "playwright";

export class ScreenshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScreenshotError";
  }
}

/** Screenshots JPEG em base64. */
export type Screenshots = { desktopB64: string; mobileB64: string };

const DESKTOP = { width: 1280, height: 800 };
const MOBILE = { width: 390, height: 844 };
const TIMEOUT_PAGINA_MS = 30_000;

/**
 * Captura screenshots. `accessKey` = ScreenshotOne do aluno (BYOK).
 * Sem chave: Playwright em local; em serverless (VERCEL) falha com orientação.
 */
export async function capturarScreenshots(
  url: string,
  accessKey?: string | null,
): Promise<Screenshots> {
  if (accessKey) {
    return viaScreenshotOne(url, accessKey);
  }

  if (process.env.VERCEL) {
    throw new ScreenshotError(
      "ScreenshotOne não configurada — configure em /configuracao (necessária em produção serverless)",
    );
  }

  return viaPlaywright(url);
}

async function viaPlaywright(url: string): Promise<Screenshots> {
  const { chromium, devices } = await import("playwright");

  let browser: Browser;
  try {
    browser = await chromium.launch();
  } catch {
    throw new ScreenshotError(
      "Chromium do Playwright não instalado — rode: npx playwright install chromium. Ou configure ScreenshotOne em /configuracao",
    );
  }

  try {
    const [desktopB64, mobileB64] = await Promise.all([
      capturarPagina(browser, url, { viewport: DESKTOP }),
      capturarPagina(browser, url, devices["iPhone 13"]),
    ]);
    return { desktopB64, mobileB64 };
  } finally {
    await browser.close();
  }
}

async function capturarPagina(
  browser: Browser,
  url: string,
  contextOptions: Parameters<Browser["newContext"]>[0],
): Promise<string> {
  const context = await browser.newContext(contextOptions);
  try {
    const page = await context.newPage();
    try {
      await page.goto(url, { waitUntil: "load", timeout: TIMEOUT_PAGINA_MS });
    } catch {
      throw new ScreenshotError(
        "Site fora do ar ou demorou demais pra carregar",
      );
    }
    await page.waitForTimeout(1500);
    const buf = await page.screenshot({ type: "jpeg", quality: 80 });
    return buf.toString("base64");
  } finally {
    await context.close();
  }
}

async function viaScreenshotOne(
  url: string,
  accessKey: string,
): Promise<Screenshots> {
  const [desktopB64, mobileB64] = await Promise.all([
    fetchScreenshotOne(url, DESKTOP, "desktop", accessKey),
    fetchScreenshotOne(url, MOBILE, "mobile", accessKey),
  ]);
  return { desktopB64, mobileB64 };
}

async function fetchScreenshotOne(
  url: string,
  viewport: { width: number; height: number },
  rotulo: string,
  accessKey: string,
): Promise<string> {
  const params = new URLSearchParams({
    access_key: accessKey,
    url,
    viewport_width: String(viewport.width),
    viewport_height: String(viewport.height),
    format: "jpg",
    image_quality: "80",
    block_cookie_banners: "true",
    block_ads: "true",
    timeout: "30",
  });

  let res: Response;
  try {
    res = await fetch(`https://api.screenshotone.com/take?${params}`, {
      signal: AbortSignal.timeout(TIMEOUT_PAGINA_MS + 10_000),
    });
  } catch {
    throw new ScreenshotError(
      `Falha ao capturar screenshot (${rotulo}) — site fora do ar ou timeout`,
    );
  }

  if (!res.ok) {
    throw new ScreenshotError(
      `ScreenshotOne retornou ${res.status} pro screenshot ${rotulo}`,
    );
  }

  return Buffer.from(await res.arrayBuffer()).toString("base64");
}
