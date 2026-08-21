// F018 — operações com cota diária no modo Orion.

import type { QuotaOperacao as PrismaQuotaOperacao } from "@prisma/client";

/**
 * Só entra aqui a operação cujo **teto mensal do plano (F035) não limita o
 * consumo de API**. Coleta e Diagnóstico são esse caso: o mensal conta entrega
 * (Lead novo, primeiro Diagnóstico) e duplicata/re-diagnóstico gastam Places e
 * PageSpeed cobrando zero de cota — sem a diária, não há teto nenhum.
 *
 * `proposta` e `abordagem` saíram em 2026-08-16 (F018): as duas já têm teto
 * mensal por plano, e 5/dia contra 150 Abordagens/mês obrigava o Pro a 30 dias
 * no talo pra receber o que /planos vende. Os valores continuam no enum
 * `QuotaOperacao` do banco — ver a nota de "Sem migração" na F018.
 */
export const OPERACOES_COTA = [
  "coleta",
  // F025 — aprofundamento: 1 por Lead diagnosticado.
  "diagnostico",
  "simulador_msg",
  // F029 — uma por pergunta ao Agente (1 a 3 chamadas de LLM cada).
  "agente_msg",
] as const;

export type OperacaoCota = (typeof OPERACOES_COTA)[number];

export const LIMITES_DIARIOS: Record<OperacaoCota, number> = {
  coleta: 5,
  // 5 coletas × 10 aprofundados por coleta (APROFUNDAR_POR_COLETA) = 50.
  diagnostico: 50,
  simulador_msg: 20,
  agente_msg: 30,
};

export const LABEL_OPERACAO: Record<OperacaoCota, string> = {
  coleta: "coletas",
  diagnostico: "diagnósticos",
  simulador_msg: "mensagens no simulador",
  agente_msg: "perguntas ao Agente",
};

export type VisaoUso = {
  operacao: OperacaoCota;
  usado: number;
  limite: number;
  restante: number;
};

export function asOperacaoCota(raw: string): OperacaoCota | null {
  return OPERACOES_COTA.includes(raw as OperacaoCota)
    ? (raw as OperacaoCota)
    : null;
}

export function toPrismaOperacao(op: OperacaoCota): PrismaQuotaOperacao {
  return op;
}
