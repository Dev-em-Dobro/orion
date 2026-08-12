// F018 — operações com cota diária no modo Orion.

import type { QuotaOperacao as PrismaQuotaOperacao } from "@prisma/client";

export const OPERACOES_COTA = [
  "coleta",
  "proposta",
  "outreach",
  "simulador_msg",
] as const;

export type OperacaoCota = (typeof OPERACOES_COTA)[number];

export const LIMITES_DIARIOS: Record<OperacaoCota, number> = {
  coleta: 5,
  proposta: 5,
  outreach: 5,
  simulador_msg: 20,
};

export const LABEL_OPERACAO: Record<OperacaoCota, string> = {
  coleta: "coletas",
  proposta: "propostas",
  outreach: "outreaches",
  simulador_msg: "mensagens no simulador",
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
