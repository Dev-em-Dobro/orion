import type { OperacaoCota } from "./tipos";
import { LABEL_OPERACAO } from "./tipos";

export class QuotaExcedidaError extends Error {
  constructor(
    public operacao: OperacaoCota,
    public usado: number,
    public limite: number,
  ) {
    super(
      `Limite diário de ${LABEL_OPERACAO[operacao]} atingido (${usado}/${limite}). ` +
        "Volte amanhã ou ative o modo BYOK em Configuração. " +
        "Em breve, planos pagos poderão remover esse limite.",
    );
    this.name = "QuotaExcedidaError";
  }
}
