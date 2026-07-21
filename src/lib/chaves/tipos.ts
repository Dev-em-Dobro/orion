import type { ChaveApiStatus } from "@prisma/client";

/** Slots de chave suportados na UI (F016). */
export const TIPOS_CHAVE = [
  "google",
  "anthropic",
  "openai",
  "gemini",
  "screenshotone",
] as const;

export type TipoChave = (typeof TIPOS_CHAVE)[number];

export const LABEL_CHAVE: Record<TipoChave, string> = {
  google: "Google (Places + PageSpeed)",
  anthropic: "Anthropic (IA)",
  openai: "OpenAI (IA)",
  gemini: "Gemini (IA)",
  screenshotone: "ScreenshotOne",
};

/** Essenciais pro fluxos atuais (sem elas a feature aborta antes do provedor). */
export type TipoChaveEssencial = "google" | "anthropic";

export type VisaoChave = {
  tipo: TipoChave;
  label: string;
  status: ChaveApiStatus;
  /** Máscara pra UI — nunca o valor em claro. */
  mascara: string | null;
};

export function mensagemChaveAusente(tipo: TipoChave): string {
  return `${LABEL_CHAVE[tipo]} não configurada — configure em /configuracao`;
}
