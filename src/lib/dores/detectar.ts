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
  /** F026 — ausente em Diagnósticos anteriores à feature. */
  atendimento_automatizado?: AtendimentoAutomatizado;
};

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
  const perf = diag.performance_mobile;
  if (perf !== null && perf < 50) {
    dores.push({
      tipo: "SITE_LENTO",
      severidade: perf < 30 ? "ALTA" : "MEDIA",
      detalhes: `site muito lento no celular (nota ${perf}/100 no Google PageSpeed)`,
    });
  }
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
