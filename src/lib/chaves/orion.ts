// F018 — chaves compartilhadas da Orion (env do servidor).

import type { TipoChave } from "./tipos";
import { LABEL_CHAVE } from "./tipos";

export class ChaveOrionIndisponivelError extends Error {
  constructor(public tipo: TipoChave) {
    super(
      `Chave Orion (${LABEL_CHAVE[tipo]}) indisponível no servidor. Contate o suporte.`,
    );
    this.name = "ChaveOrionIndisponivelError";
  }
}

const ENV_ORION: Partial<Record<TipoChave, string>> = {
  google: "ORION_GOOGLE_API_KEY",
  openai: "ORION_OPENAI_API_KEY",
};

/** Chave Orion para o slot (só google e openai no MVP). */
export function obterChaveOrion(tipo: TipoChave): string | null {
  const envName = ENV_ORION[tipo];
  if (!envName) return null;
  const v = process.env[envName]?.trim();
  return v || null;
}

export function exigirChaveOrion(tipo: TipoChave): string {
  const chave = obterChaveOrion(tipo);
  if (!chave) {
    throw new ChaveOrionIndisponivelError(tipo);
  }
  return chave;
}
