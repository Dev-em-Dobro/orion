# Contrato — Google Places API (New)

Versão usada: **Places API (New)** — endpoint v1, não a Places API legacy.

Doc oficial: https://developers.google.com/maps/documentation/places/web-service/text-search

## Autenticação
- Header `X-Goog-Api-Key: ${GOOGLE_PLACES_API_KEY}`
- A chave deve ter a **Places API (New)** habilitada no projeto Google Cloud
  (não a "Places API" antiga).

## Endpoint usado na F001 — Text Search
`POST https://places.googleapis.com/v1/places:searchText`

### Headers
```
Content-Type: application/json
X-Goog-Api-Key: <chave>
X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.primaryType,places.types,places.rating,places.userRatingCount,nextPageToken
```

> `places.rating` e `places.userRatingCount` (adicionados na F003 como sinal
> de porte/movimento) ficam no **mesmo SKU Enterprise** já disparado por
> `nationalPhoneNumber`/`websiteUri` — **sem custo incremental**. Confirmar na
> tabela de preços vigente do Google; se algum dia mudarem de tier, o uso do
> operador segue dentro do free tier Enterprise de qualquer forma.

> **Atenção:** sem `X-Goog-FieldMask` a request falha com **400**.
> A FieldMask determina o **SKU** cobrado. A cobrança é pelo SKU mais alto
> disparado pela request (não soma):
>
> | SKU         | Campos que disparam                                              | Free tier / mês | Preço      |
> |-------------|------------------------------------------------------------------|-----------------|------------|
> | IDs Only    | `id`, `name`, `attributions`                                     | ilimitado       | grátis     |
> | Pro         | + `displayName`, `formattedAddress`, `primaryType`, `types`      | 5.000           | $32 / 1k   |
> | Enterprise  | + `nationalPhoneNumber`, `websiteUri`                            | 1.000           | $35 / 1k   |
>
> A FieldMask escolhida aqui dispara o **Enterprise SKU**.

### Body
```json
{
  "textQuery": "dentista Curitiba PR",
  "languageCode": "pt-BR",
  "regionCode": "BR",
  "maxResultCount": 20,
  "includedType": "dentist",
  "pageToken": "<opcional — próxima página>"
}
```

`maxResultCount` máximo da API é **20** por request. Para trazer mais
estabelecimentos, a lib segue `nextPageToken` (até
`PLACES_MAX_PAGES` em `textSearch.ts`).

#### `includedType` (F033)
Restringe o resultado a um `primaryType` específico. Enviado pela
[F033](../02-features/F033-busca-estruturada.md) quando o nicho escolhido mapeia
um tipo único e confiável (`dentista` → `dentist`); **omitido** no modo "Outro
(digitar)" e nos nichos cujo tipo varia.

- Ganho: menos ruído no retorno e `primaryType` previsível — o **Tier de nicho**
  da [F003](../02-features/F003-score-e-priorizacao.md) deixa de cair em `BAIXO`
  por categoria não mapeada.
- **SKU**: não altera a cobrança. O SKU é determinado pela `X-Goog-FieldMask`,
  que não muda; `includedType` é filtro de request. **Confirmar contra a tabela
  de preços vigente antes de ligar em produção.**
- Vazio com filtro: a lib repete a busca **uma vez** sem `includedType` e
  sinaliza na UI (F033 AC6).
- Valor inválido → **400 `INVALID_ARGUMENT`**; tratado como bug nosso (o valor
  sai de constante, não de input do aluno).

### Resposta (sucesso 200)
```json
{
  "places": [
    {
      "id": "ChIJ...",
      "displayName": { "text": "Barbearia X", "languageCode": "pt-BR" },
      "formattedAddress": "Rua Y, 123 - Curitiba, PR",
      "nationalPhoneNumber": "(41) 9999-9999",
      "websiteUri": "https://exemplo.com",
      "primaryType": "barber_shop",
      "types": ["barber_shop", "point_of_interest", "establishment"],
      "rating": 4.7,
      "userRatingCount": 128
    }
  ],
  "nextPageToken": "..."
}
```

Incluir `nextPageToken` no `X-Goog-FieldMask` (campo de topo, não sob `places.`).

Campos `nationalPhoneNumber` e `websiteUri` podem estar **ausentes**
(não vêm como `null`, simplesmente não aparecem no objeto).

### Erros relevantes
| Status | Causa típica                           | Tratamento                              |
|--------|----------------------------------------|-----------------------------------------|
| 400    | FieldMask ausente ou inválida          | Bug nosso — propagar mensagem ao dev    |
| 401/403| Chave inválida ou API não habilitada   | Erro descritivo na UI                   |
| 429    | Quota excedida                         | Erro descritivo na UI, sugerir aguardar |
| 5xx    | Indisponibilidade Google               | Erro genérico na UI                     |

Corpo de erro:
```json
{ "error": { "code": 400, "message": "...", "status": "INVALID_ARGUMENT" } }
```

## Tipo TypeScript esperado em `src/lib/places/`
```ts
export type PlacesResult = {
  id: string;
  nome: string;
  endereco: string;
  telefone: string | null;
  website: string | null;
  categoria: string;
  nota: number | null;          // places.rating (0–5)
  num_avaliacoes: number | null; // places.userRatingCount
};

export async function textSearch(
  query: string,
  apiKey: string,
  opcoes?: { includedType?: string; paginas?: number }, // F033
): Promise<PlacesResult[]>;
```

A camada `lib/places` é responsável por:
1. Montar headers (incluindo a `FieldMask`).
2. Mapear a resposta crua → `PlacesResult` (já com a linguagem ubíqua do domínio).
3. Lançar erro tipado em falhas HTTP (com `status` e `message`).

A Server Action consome esse tipo, **não** o JSON cru do Google.

## Fora deste contrato
- **Place Details** (`places/{id}` GET) — descartado na Fase 1: o Text
  Search acima já retorna `nationalPhoneNumber` e `websiteUri` na mesma
  FieldMask, então a consulta seria redundante. Só agregaria frescor em
  re-diagnósticos de Leads antigos; se isso virar caso real, adicionar
  aqui por spec.
- **Nearby Search** (`places:searchNearby`) — não usado na F001.
- **Reviews** (`reviews` no Place Details) — possível insumo da Dor
  `SEM_RESPOSTA_REVIEWS`; exigirá atualização deste contrato (FieldMask
  e SKU próprios).

## Paginação
Usada na F001: `textSearch` itera `nextPageToken` até esgotar ou atingir
o teto `PLACES_MAX_PAGES` (custo/latência na coleta síncrona Orion).

A partir da [F033](../02-features/F033-busca-estruturada.md), o número de
páginas passa a ser **escolha do aluno** (20/40/60 → 1/2/3 páginas), com
`PLACES_MAX_PAGES = 5` como teto duro. Antes disso, toda coleta paginava até o
teto — o padrão novo (1 página) reduz o consumo do SKU Enterprise.
