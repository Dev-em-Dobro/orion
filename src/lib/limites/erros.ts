import { byokDisponivel } from "@/lib/chaves/byok-flag";
import { PLANOS_NA_UI } from "@/lib/planos/exibicao";
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
        // Duas saídas que a mensagem oferecia e que hoje podem não existir. Cada
        // uma some com a sua própria feature: BYOK encerrado em 2026-08-17
        // (F016), planos pausados no mesmo dia (F035). Sobra "volte amanhã", que
        // é sempre verdade — a cota é diária.
        (byokDisponivel()
          ? "Volte amanhã ou ative o modo BYOK em Configuração."
          : "Volte amanhã: a cota é diária e zera na virada do dia.") +
        (PLANOS_NA_UI
          ? " Em breve, planos pagos poderão remover esse limite."
          : ""),
    );
    this.name = "QuotaExcedidaError";
  }
}
