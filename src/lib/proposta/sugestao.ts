// F012 (emenda de precificação 2026-08-16) — o Diagnóstico pré-marca os itens.
// Spec: /specs/02-features/F012-gerador-de-proposta.md
//
// Substitui `servicosRecomendados`, que devolvia serviços técnicos. Agora o
// que sai são itens do catálogo que se ensina, já marcados.
//
// A ressalva vale ser lida antes de mexer aqui: o Orion NÃO sabe se aquele
// cliente compra landing de R$ 500 ou sistema de R$ 5.000. Isto é chute
// educado sobre uma decisão de venda — por isso nada aqui é final, e nenhum
// valor sai sem o aluno digitar ou aceitar.

import type { ItemId } from "./catalogo";
import {
  sugerirMensal,
  sugerirPrazo,
  sugerirValor,
  type Selecao,
} from "./selecao";

export type DiagnosticoParaSugestao = {
  tem_site: boolean;
  site_e_agregador: boolean;
  tem_https: boolean | null;
  performance_mobile: number | null;
  atendimento_automatizado?: string | null;
};

/** Sem site próprio (ou só agregador): o projeto É o site. */
function precisaDeSite(d: DiagnosticoParaSugestao): boolean {
  return !d.tem_site || d.site_e_agregador;
}

/**
 * Os serviços pré-marcados. Sempre projeto + manutenção, porque "não cobrar
 * manutenção" é um dos quatro erros que a tabela do Arsenal lista — a
 * recorrência é o que transforma freela em negócio.
 *
 * Os valores nascem da soma do meio das faixas, como valor inicial de campo
 * editável — nunca como preço decidido.
 */
export function sugerirSelecao(d: DiagnosticoParaSugestao): Selecao {
  // Site no ar mas com Dor técnica: o trabalho é manutenção, não site novo.
  const siteComDorTecnica =
    !precisaDeSite(d) &&
    ((d.performance_mobile !== null && d.performance_mobile < 50) ||
      d.tem_https === false);

  const itens: ItemId[] = siteComDorTecnica
    ? ["manutencao_site", "hospedagem"]
    : [precisaDeSite(d) ? "site_institucional" : "landing", "manutencao_site"];

  return {
    itens,
    valor: sugerirValor(itens),
    mensal: sugerirMensal(itens),
    prazo: sugerirPrazo(itens),
  };
}
