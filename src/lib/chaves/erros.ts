import type { TipoChave } from "./tipos";
import { mensagemChaveAusente } from "./tipos";

export class ChaveAusenteError extends Error {
  constructor(public tipo: TipoChave) {
    super(mensagemChaveAusente(tipo));
    this.name = "ChaveAusenteError";
  }
}

export class ChaveOperacaoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChaveOperacaoError";
  }
}
