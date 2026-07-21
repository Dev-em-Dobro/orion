// Contrato em /specs/03-contracts/pagespeed-insights.md.
// Lança PagespeedError em qualquer falha — quem decide degradar pra
// performance_mobile = null é a Server Action (F002).

const ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

const TIMEOUT_MS = 30_000;

export class PagespeedError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "PagespeedError";
  }
}

type RawPagespeed = {
  lighthouseResult?: {
    categories?: {
      performance?: { score?: number };
    };
  };
};

/** Roda o PSI mobile e retorna o score 0–100. */
export async function performanceMobile(
  url: string,
  apiKey: string,
): Promise<number> {
  if (!apiKey) {
    throw new PagespeedError(
      0,
      "Google (Places + PageSpeed) não configurada — configure em /configuracao",
    );
  }

  const params = new URLSearchParams({
    url,
    strategy: "MOBILE",
    category: "PERFORMANCE",
    key: apiKey,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${ENDPOINT}?${params}`, {
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text();
      throw new PagespeedError(res.status, body || res.statusText);
    }

    const data = (await res.json()) as RawPagespeed;
    const score = data.lighthouseResult?.categories?.performance?.score;

    if (typeof score !== "number") {
      throw new PagespeedError(
        200,
        "Resposta sem lighthouseResult.categories.performance.score",
      );
    }

    return Math.round(score * 100);
  } finally {
    clearTimeout(timer);
  }
}
