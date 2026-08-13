// F035 — o medidor que a topbar mostra.
// Spec: /specs/02-features/F035-planos-e-limites.md
//
// Régua de 2026-08-13: conta **Lead novo criado pela coleta**, não Lead
// diagnosticado. O que custa é a requisição ao Places; diagnosticar usa
// PageSpeed, que é grátis, então limitar diagnóstico cobrava pelo que não
// custava — e ainda desincentivava justamente a parte que qualifica o Lead.
//
// A coluna `UsoMensal.leads_diagnosticados` ficou congelada no banco com o
// consumo já apurado pela régua velha. O contador novo vive em
// `UsoMensalOperacao`, junto com os outros cinco (ver `medidor-mensal.ts`).

import { limiteMensal, type Plano } from "./catalogo";
import { competenciaDe } from "./competencia";
import { usoDaOperacao } from "./medidor-mensal";
import { planoDoUsuario } from "./resolver";

export type UsoDoPlano = {
  plano: Plano;
  competencia: string;
  usado: number;
  limite: number;
  restante: number;
  /** Fração 0–1, saturada em 1. É o que a barra desenha. */
  fracao: number;
};

export async function usoDoPlano(
  userId: string,
  agora: Date = new Date(),
): Promise<UsoDoPlano> {
  const [plano, uso] = await Promise.all([
    planoDoUsuario(userId),
    usoDaOperacao(userId, "lead_novo", agora),
  ]);
  return {
    plano,
    competencia: competenciaDe(agora),
    usado: uso.usado,
    limite: limiteMensal(plano),
    restante: uso.restante,
    fracao: uso.fracao,
  };
}
