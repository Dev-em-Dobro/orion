const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";

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

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: "pt-BR",
      regionCode: "BR",
      maxResultCount: 20,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new PlacesError(res.status, body || res.statusText);
  }

  const data = (await res.json()) as { places?: RawPlace[] };
  const places = data.places ?? [];

  return places.map((p) => {
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
  });
}
