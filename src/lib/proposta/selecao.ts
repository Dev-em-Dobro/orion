// F012 (emenda de precificação 2026-08-16) — o que o cliente vai comprar.
// Spec: /specs/02-features/F012-gerador-de-proposta.md
//
// Substitui `pacotes.ts`, dos três pacotes: a proposta é UMA, com os serviços
// marcados e o valor fechado pelo aluno (revisão de 2026-08-16).
//
// Função pura, sem Next e sem Prisma. O preço NÃO é calculado aqui: ele é
// digitado. O que esta camada faz é sugerir um valor inicial, somar o que foi
// marcado e dizer o que impede a proposta de existir.

import { item, type ItemId } from "./catalogo";

/** O que o aluno marcou e digitou. */
export type Selecao = {
  itens: ItemId[];
  /** Valor fechado à vista, em BRL. Digitado. */
  valor: number;
  /** Valor mensal, em BRL. Digitado. `0` quando não há recorrência. */
  mensal: number;
  /**
   * Prazo de entrega, em linguagem de gente ("3 a 4 semanas"). Digitado.
   *
   * Saiu da IA em 2026-08-16: era o único número que ela ainda inventava, e
   * prazo é compromisso contratual, não prosa.
   */
  prazo: string;
};

export function selecaoVazia(): Selecao {
  return { itens: [], valor: 0, mensal: 0, prazo: "" };
}

/** Meio da faixa, arredondado pra R$50 — número "redondo" de proposta. */
function meioDaFaixa(id: ItemId): number {
  const { faixa } = item(id);
  // "R$ 5.000 +" não tem topo: o meio de uma faixa aberta é o piso dela.
  const bruto = faixa.max === null ? faixa.min : (faixa.min + faixa.max) / 2;
  return Math.round(bruto / 50) * 50;
}

/**
 * Valor inicial do campo à vista: soma dos meios das faixas dos itens de
 * **projeto** marcados. Sugestão, não preço — ver AC22.
 */
export function sugerirValor(itens: ItemId[]): number {
  return itens
    .filter((id) => item(id).tipo === "projeto")
    .reduce((total, id) => total + meioDaFaixa(id), 0);
}

/** O mesmo, para os itens de **recorrência**. */
export function sugerirMensal(itens: ItemId[]): number {
  return itens
    .filter((id) => item(id).tipo === "recorrencia")
    .reduce((total, id) => total + meioDaFaixa(id), 0);
}

/**
 * Prazo sugerido a partir do catálogo. Os projetos correm **em paralelo**, não
 * em fila: quem faz site e bot na mesma semana não soma os dois prazos. Por
 * isso a conta é o maior de cada ponta, não a soma.
 */
export function sugerirPrazo(itens: ItemId[]): string {
  const janelas = itens
    .map((id) => item(id).semanas)
    .filter((j): j is { min: number; max: number } => j !== null);

  // Só recorrência: não há entrega a prazo, há início de serviço.
  if (janelas.length === 0) {
    return itens.length > 0 ? "Início em até 1 semana" : "";
  }

  const min = Math.max(...janelas.map((j) => j.min));
  const max = Math.max(...janelas.map((j) => j.max));
  return min === max ? `${max} semanas` : `${min} a ${max} semanas`;
}

export function temRecorrencia(s: Selecao): boolean {
  return s.itens.some((i) => item(i).tipo === "recorrencia");
}

/** Itens na ordem do catálogo, não na de marcação: a proposta lê igual sempre. */
export function itensOrdenados(s: Selecao): ItemId[] {
  return [...s.itens].sort((a, b) => ORDEM.indexOf(a) - ORDEM.indexOf(b));
}

const ORDEM: ItemId[] = [
  "landing",
  "site_institucional",
  "site_admin",
  "sistema",
  "bot_whatsapp",
  "manutencao_site",
  "manutencao_bot",
  "hospedagem",
];

/**
 * O que impede a proposta de existir. Devolve lista (não lança): a tela mostra
 * tudo de uma vez em vez de o aluno descobrir um erro por clique.
 */
export function validar(s: Selecao): string[] {
  const problemas: string[] = [];

  if (s.itens.length === 0) {
    problemas.push("Marque pelo menos um serviço para gerar a proposta.");
    return problemas;
  }

  if (s.valor <= 0 && s.mensal <= 0) {
    problemas.push("Defina o valor antes de gerar.");
  }
  if (temRecorrencia(s) && s.mensal <= 0) {
    problemas.push(
      "Há serviço mensal marcado, mas o valor da recorrência está zerado.",
    );
  }
  if (!temRecorrencia(s) && s.mensal > 0) {
    problemas.push("Há valor mensal sem nenhum serviço de recorrência marcado.");
  }
  if (!s.prazo.trim()) {
    problemas.push("Informe o prazo antes de gerar.");
  }

  return problemas;
}

/** "R$ 2.400" — sempre fechado. Faixa não chega no cliente (AC23). */
export function brl(valor: number): string {
  return `R$ ${valor.toLocaleString("pt-BR")}`;
}
