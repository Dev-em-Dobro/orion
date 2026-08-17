// F012 — Formatação de exibição da Proposta. Puro, sem dependência de Next
// (importado por lib, Server Action e UI).
//
// `faixaBRL` saiu na emenda de precificação (2026-08-16): faixa não chega ao
// cliente. O que sai daqui são números fechados (AC23).

import { item, MESES_MINIMOS_RECORRENCIA } from "./catalogo";
import { brl, itensOrdenados, temRecorrencia, type Selecao } from "./selecao";
import type { PropostaTexto } from "./gerarProposta";

/** 2400 → "2.400" (separador de milhar pt-BR, sem depender de ICU). */
export function milhar(v: number): string {
  return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** "R$ 2.400" ou "R$ 2.400 + R$ 150/mês" — sempre fechado. */
export function precoFechado(valor: number, mensal: number): string {
  if (valor > 0 && mensal > 0) return `${brl(valor)} + ${brl(mensal)}/mês`;
  if (mensal > 0) return `${brl(mensal)}/mês`;
  return brl(valor);
}

/** Texto plano pra colar no WhatsApp: a prosa da IA + o valor fechado. */
export function formatarPropostaTexto(
  proposta: PropostaTexto,
  selecao: Selecao,
): string {
  const linhas = [
    `Proposta — ${proposta.resumo}`,
    "",
    "O que está incluído:",
    ...proposta.escopo.map((e) => `- ${e.item}: ${e.descricao}`),
  ];

  if (proposta.entregaveis.length > 0) {
    linhas.push("", "Você recebe:");
    linhas.push(...proposta.entregaveis.map((e) => `- ${e}`));
  }

  linhas.push("", "Serviços:");
  linhas.push(...itensOrdenados(selecao).map((i) => `- ${item(i).titulo}`));

  linhas.push(
    "",
    `Prazo estimado: ${selecao.prazo}`,
    `Investimento: ${precoFechado(selecao.valor, selecao.mensal)}`,
  );

  if (temRecorrencia(selecao)) {
    linhas.push(
      `Os serviços mensais têm compromisso mínimo de ${MESES_MINIMOS_RECORRENCIA} meses.`,
    );
  }

  if (proposta.observacoes.trim()) {
    linhas.push("", proposta.observacoes.trim());
  }

  return linhas.join("\n");
}
