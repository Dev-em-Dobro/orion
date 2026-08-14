// F004 — detecção pura de Dor a partir do Diagnóstico (+ website).
// Spec: /specs/02-features/F004-deteccao-de-dor.md

import type {
  AtendimentoAutomatizado,
  Severidade,
  TipoDor,
} from "@prisma/client";

export type DiagnosticoParaDeteccao = {
  tem_site: boolean;
  site_e_agregador: boolean;
  tem_https: boolean | null;
  performance_mobile: number | null;
  /**
   * Tempo que o corpo do site levou pra baixar, medido pela própria F002.
   * Opcional porque Diagnósticos antigos podem não ter (e porque site fora do
   * ar não tem tempo nenhum).
   */
  tempo_carregamento_ms?: number | null;
  /** F026 — ausente em Diagnósticos anteriores à feature. */
  atendimento_automatizado?: AtendimentoAutomatizado;
};

/** F004 (emenda 2026-08-14) — limiares do fallback de tempo de carregamento. */
const LENTO_MS = 3000;
const MUITO_LENTO_MS = 5000;

/**
 * Dor de site lento.
 *
 * Duas fontes, nesta ordem de preferência:
 *
 * 1. **PageSpeed**, quando ele respondeu. Mede num mobile emulado com rede
 *    emulada, que é o que o cliente vive.
 * 2. **O tempo que a própria F002 mediu**, quando o PSI não respondeu. Ele
 *    desiste justamente nos piores sites — roda um Lighthouse de verdade e
 *    estoura o tempo quando a página não carrega —, e o efeito era perverso:
 *    quanto pior o site, menos Dor o Orion enxergava. A Agência COW levava
 *    6 s pra abrir e saía do Diagnóstico com ZERO Dores.
 *
 * Fallback, não segunda opinião: com nota do PSI na mão, o tempo do nosso
 * servidor não tem por que discordar dela.
 */
function dorDeLentidao(diag: DiagnosticoParaDeteccao): DorDetectada | null {
  const perf = diag.performance_mobile;

  if (perf !== null) {
    if (perf >= 50) return null;
    return {
      tipo: "SITE_LENTO",
      severidade: perf < 30 ? "ALTA" : "MEDIA",
      detalhes: `site muito lento no celular (nota ${perf}/100 no Google PageSpeed)`,
    };
  }

  const ms = diag.tempo_carregamento_ms;
  // `null` aqui é ignorância, não velocidade: sem medição não há Dor.
  if (ms === null || ms === undefined || ms < LENTO_MS) return null;

  const segundos = (ms / 1000).toFixed(1).replace(".", ",");
  return {
    tipo: "SITE_LENTO",
    severidade: ms >= MUITO_LENTO_MS ? "ALTA" : "MEDIA",
    detalhes: `site levou ${segundos}s pra carregar (o PageSpeed nem conseguiu medir)`,
  };
}

export type DorDetectada = {
  tipo: TipoDor;
  severidade: Severidade;
  detalhes: string;
};

/**
 * F026 — sem telefone não há WhatsApp pra automatizar, então não há o que
 * vender. A Dor só existe quando olhamos o site e não achamos sinal
 * (`nao_detectado`); `nao_avaliado` significa que não deu pra olhar.
 */
function dorDeAtendimento(
  diag: DiagnosticoParaDeteccao,
  telefone: string | null | undefined,
): DorDetectada | null {
  if (diag.atendimento_automatizado !== "nao_detectado") return null;
  if (!telefone || telefone.trim().length === 0) return null;
  return {
    tipo: "SEM_ATENDIMENTO_AUTOMATIZADO",
    severidade: "MEDIA",
    detalhes:
      "nenhum sinal de atendimento automatizado no site — o WhatsApp provavelmente é respondido no braço",
  };
}

/** Detecta Dores candidatas. Sem rede / sem Prisma. */
export function detectarDores(
  diag: DiagnosticoParaDeteccao,
  website: string | null,
  telefone?: string | null,
): DorDetectada[] {
  if (!website || !diag.tem_site) {
    return [
      {
        tipo: "SEM_SITE",
        severidade: "ALTA",
        detalhes: "não tem site / presença digital própria",
      },
    ];
  }

  if (diag.site_e_agregador) {
    return [
      {
        tipo: "SITE_AGREGADOR",
        severidade: "ALTA",
        detalhes: "só tem link-in-bio / rede social, sem site próprio",
      },
    ];
  }

  const dores: DorDetectada[] = [];
  const lentidao = dorDeLentidao(diag);
  if (lentidao) dores.push(lentidao);
  if (diag.tem_https === false) {
    dores.push({
      tipo: "SEM_HTTPS",
      severidade: "MEDIA",
      detalhes: "site sem HTTPS (sem cadeado de segurança)",
    });
  }
  const atendimento = dorDeAtendimento(diag, telefone);
  if (atendimento) dores.push(atendimento);
  return dores;
}
