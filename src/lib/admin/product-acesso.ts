// F043 — product_id usado no grant manual de acesso (espelha o CLI).

import { productIdHubla } from "@/lib/compra/env";
import { idsChaveAcessoHubla } from "@/lib/hubla/produtos";

/** Product id preferido para upsert de acesso admin. */
export function productIdGrantAcesso(): string {
  const primario = productIdHubla();
  if (primario) return primario;
  const primeiro = idsChaveAcessoHubla()[0];
  if (primeiro) return primeiro;
  throw new Error(
    "Nenhum product id de acesso configurado (HUBLA_PRODUCT_ID / allowlist Hubla).",
  );
}
