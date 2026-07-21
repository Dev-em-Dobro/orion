import type { UserApiKeys } from "@prisma/client";
import type { TipoChave } from "./tipos";

/** Mapeia TipoChave → colunas do modelo UserApiKeys. */
export function colunasDe(tipo: TipoChave) {
  switch (tipo) {
    case "google":
      return {
        ciphertext: "google_ciphertext",
        iv: "google_iv",
        authTag: "google_auth_tag",
        keyVersion: "google_key_version",
        last4: "google_last4",
        status: "google_status",
      } as const;
    case "anthropic":
      return {
        ciphertext: "anthropic_ciphertext",
        iv: "anthropic_iv",
        authTag: "anthropic_auth_tag",
        keyVersion: "anthropic_key_version",
        last4: "anthropic_last4",
        status: "anthropic_status",
      } as const;
    case "openai":
      return {
        ciphertext: "openai_ciphertext",
        iv: "openai_iv",
        authTag: "openai_auth_tag",
        keyVersion: "openai_key_version",
        last4: "openai_last4",
        status: "openai_status",
      } as const;
    case "gemini":
      return {
        ciphertext: "gemini_ciphertext",
        iv: "gemini_iv",
        authTag: "gemini_auth_tag",
        keyVersion: "gemini_key_version",
        last4: "gemini_last4",
        status: "gemini_status",
      } as const;
    case "screenshotone":
      return {
        ciphertext: "screenshotone_ciphertext",
        iv: "screenshotone_iv",
        authTag: "screenshotone_auth_tag",
        keyVersion: "screenshotone_key_version",
        last4: "screenshotone_last4",
        status: "screenshotone_status",
      } as const;
  }
}

export function lerEnvelope(row: UserApiKeys, tipo: TipoChave) {
  const c = colunasDe(tipo);
  const ciphertext = row[c.ciphertext];
  const iv = row[c.iv];
  const authTag = row[c.authTag];
  if (!ciphertext || !iv || !authTag) return null;
  return { ciphertext, iv, authTag, keyVersion: row[c.keyVersion] };
}

export function lerStatus(row: UserApiKeys | null, tipo: TipoChave) {
  if (!row) return "faltando" as const;
  return row[colunasDe(tipo).status];
}

export function lerLast4(row: UserApiKeys | null, tipo: TipoChave) {
  if (!row) return null;
  return row[colunasDe(tipo).last4];
}
