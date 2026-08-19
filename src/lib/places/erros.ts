// F033 (emenda de 2026-08-19) — o aluno para de ler o JSON de erro do Google.
// Contrato: /specs/03-contracts/google-places.md#erros-relevantes
//
// A régua: erro que o aluno pode resolver vira instrução; erro que só nós
// resolvemos vira aviso curto + relato no Sentry. O corpo cru do Google
// (`{"error":{"code":400,...}}`) não serve a nenhum dos dois — não diz ao aluno
// o que fazer, e não garante que o dev fique sabendo.

import type { KeyMode } from "@prisma/client";
import { PlacesError } from "./textSearch";

export type ErroTraduzido = {
  /** O que entra no card de erro da busca. */
  mensagem: string;
  /**
   * Bug nosso — o detalhe cru precisa chegar ao Sentry (ADR-013). Falha do
   * ambiente do aluno (chave errada, cota estourada) fica de fora: ele resolve
   * pela mensagem, e alerta previsível só ensina o time a ignorar alerta.
   */
  reportar: boolean;
};

/**
 * Traduz uma falha do Places para o que o aluno lê.
 *
 * `modo` decide de quem é a chave — a mesma 403 pede coisas opostas a quem usa
 * a chave própria (conferir no Google Cloud) e a quem usa a do Orion (esperar,
 * porque não há o que ele conserte).
 */
export function mensagemDeErroPlaces(
  erro: PlacesError,
  modo: KeyMode,
): ErroTraduzido {
  const byok = modo === "byok";

  // status 0 = a lib nem chegou a chamar o Google (chave ausente). A mensagem
  // já nasce endereçada ao aluno, com o caminho pra resolver.
  if (erro.status === 0) {
    return { mensagem: erro.message, reportar: false };
  }

  if (erro.status === 400) {
    return {
      mensagem:
        "O Google recusou esta consulta por um erro de configuração do Orion — " +
        "não é a sua chave nem o que você preencheu. Tentar de novo vai dar no " +
        "mesmo: escolha outro nicho por enquanto.",
      reportar: true,
    };
  }

  if (erro.status === 401 || erro.status === 403) {
    return {
      mensagem: byok
        ? "O Google recusou a sua chave. Em Configuração, confira se ela está " +
          "correta e se o projeto tem a Places API (New) ativada e o " +
          "faturamento vinculado."
        : "O Google recusou a chave do Orion. É problema nosso — tente de novo " +
          "daqui a pouco.",
      reportar: !byok,
    };
  }

  if (erro.status === 429) {
    return {
      mensagem: byok
        ? "A sua chave do Google bateu o limite de requisições. A cota reseta " +
          "sozinha — tente mais tarde, ou aumente o limite no Google Cloud."
        : "As chaves do Orion bateram o limite do Google agora há pouco. " +
          "Tente de novo mais tarde.",
      reportar: !byok,
    };
  }

  if (erro.status >= 500) {
    return {
      mensagem:
        "O Google está instável agora. Espere alguns minutos e tente de novo.",
      reportar: false,
    };
  }

  return {
    mensagem:
      `Não foi possível falar com o Google (erro ${erro.status}). ` +
      "Tente de novo em alguns minutos.",
    reportar: true,
  };
}
