const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";

/** Places (New) devolve no máx. 20 por página; paginamos com pageToken. */
export const PLACES_PAGE_SIZE = 20;

/**
 * Teto de páginas por coleta (custo Enterprise + latência síncrona).
 * 5 × 20 = até 100 estabelecimentos por busca.
 */
export const PLACES_MAX_PAGES = 5;

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.primaryType",
  "places.types",
  "places.rating",
  "places.userRatingCount",
  "nextPageToken",
].join(",");

export type PlacesResult = {
  id: string;
  nome: string;
  endereco: string;
  telefone: string | null;
  website: string | null;
  categoria: string;
  nota: number | null;
  num_avaliacoes: number | null;
};

export class PlacesError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "PlacesError";
  }
}

type RawPlace = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  primaryType?: string;
  types?: string[];
  rating?: number;
  userRatingCount?: number;
};

type SearchTextResponse = {
  places?: RawPlace[];
  nextPageToken?: string;
};

function mapPlace(p: RawPlace): PlacesResult {
  const primeiroTipo = p.types?.[0];
  return {
    id: p.id,
    nome: p.displayName?.text ?? "(sem nome)",
    endereco: p.formattedAddress ?? "",
    telefone: p.nationalPhoneNumber ?? null,
    website: p.websiteUri ?? null,
    categoria: p.primaryType ?? primeiroTipo ?? "desconhecido",
    nota: p.rating ?? null,
    num_avaliacoes: p.userRatingCount ?? null,
  };
}

async function fetchPage(
  query: string,
  apiKey: string,
  pageToken?: string,
): Promise<SearchTextResponse> {
  const body: Record<string, unknown> = {
    textQuery: query,
    languageCode: "pt-BR",
    regionCode: "BR",
    maxResultCount: PLACES_PAGE_SIZE,
  };
  if (pageToken) body.pageToken = pageToken;

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new PlacesError(res.status, errBody || res.statusText);
  }

  return (await res.json()) as SearchTextResponse;
}

/**
 * Text Search com paginação (`nextPageToken`) até esgotar ou
 * `PLACES_MAX_PAGES`. Deduplica por `id` entre páginas.
 */
export async function textSearch(
  query: string,
  apiKey: string,
): Promise<PlacesResult[]> {
  if (!apiKey) {
    throw new PlacesError(
      0,
      "Google (Places + PageSpeed) não configurada — configure em /configuracao",
    );
  }

  const porId = new Map<string, PlacesResult>();
  let pageToken: string | undefined;

  for (let page = 0; page < PLACES_MAX_PAGES; page++) {
    const data = await fetchPage(query, apiKey, pageToken);
    for (const raw of data.places ?? []) {
      if (!raw.id || porId.has(raw.id)) continue;
      porId.set(raw.id, mapPlace(raw));
    }
    const next = data.nextPageToken?.trim();
    if (!next) break;
    pageToken = next;
  }

  return [...porId.values()];
}
