// F002 + F026 — execução do Diagnóstico, fora da Server Action.
// Specs: F002-diagnostico-de-presenca-digital.md, F026-sinal-atendimento-automatizado.md
//
// Extraído da action porque a F025 precisa rodar isto **em lote e em
// paralelo** no aprofundamento. A action virou casca; a persistência continua
// de quem chama, que é dono da própria transação.

import type { AtendimentoAutomatizado } from "@prisma/client";
import { classificarWebsite } from "./agregador";
import { detectarAtendimento } from "./atendimento";
import { verificarSite } from "./verificarSite";
import { performanceMobile } from "@/lib/pagespeed/performanceMobile";

/** F027 — sai junto do Diagnóstico, mas mora no Lead, não no Diagnóstico. */
export type DadosDiagnostico = {
  tem_site: boolean;
  site_e_agregador: boolean;
  tem_https: boolean | null;
  tempo_carregamento_ms: number | null;
  performance_mobile: number | null;
  atendimento_automatizado: AtendimentoAutomatizado;
  atendimento_evidencia: string | null;
};

/** Diagnóstico + o que ele descobre sobre o Lead (F027). */
export type ResultadoExecucao = {
  dados: DadosDiagnostico;
  /** E-mail publicado no site, quando houver. */
  email: string | null;
};

const VAZIO: DadosDiagnostico = {
  tem_site: false,
  site_e_agregador: false,
  tem_https: null,
  tempo_carregamento_ms: null,
  performance_mobile: null,
  atendimento_automatizado: "nao_avaliado",
  atendimento_evidencia: null,
};

/**
 * Uma requisição ao site + uma ao PageSpeed — as mesmas de sempre. O sinal de
 * atendimento (F026) sai do HTML que a primeira já trazia.
 *
 * Nunca lança por falha do site ou do PSI: site fora do ar **é** diagnóstico
 * válido, e performance indisponível vira `null`. Só erro de chave/quota do
 * Google sobe (vem de `performanceMobile`, e é tratado como degradação aqui).
 */
export async function executarDiagnostico(
  website: string | null,
  googleKey: string,
): Promise<ResultadoExecucao> {
  if (!website) return { dados: VAZIO, email: null };

  const classif = classificarWebsite(website);
  if (classif.ehAgregador) {
    // Não seguimos link-in-bio / perfil social (F009): não é site próprio, e
    // ADR-016 limita a leitura à URL que o negócio publicou como site.
    return {
      dados: {
        ...VAZIO,
        tem_site: true,
        site_e_agregador: true,
        tem_https: classif.temHttps,
      },
      email: null,
    };
  }

  const site = await verificarSite(website);
  if (!site.temSite) return { dados: VAZIO, email: null };

  let performance: number | null = null;
  try {
    performance = await performanceMobile(site.urlFinal, googleKey);
  } catch {
    performance = null;
  }

  const atendimento = detectarAtendimento(site.html);

  return {
    dados: {
      tem_site: true,
      site_e_agregador: false,
      tem_https: site.temHttps,
      tempo_carregamento_ms: site.tempoMs,
      performance_mobile: performance,
      atendimento_automatizado: atendimento.classificacao,
      atendimento_evidencia: atendimento.evidencia,
    },
    // F027 saiu do produto em 2026-08-13 (F035): sem canal de e-mail, capturar
    // endereço de contato do Lead vira coleta de dado pessoal **sem
    // finalidade** — exatamente o que a LGPD não admite. A extração parou; o
    // helper (`lib/leads/extrairEmail.ts`) fica pra quando/se o canal voltar.
    email: null,
  };
}

/** Resumo curto pra UI. */
export function resumoDiagnostico(
  dados: DadosDiagnostico,
  website: string | null,
): string {
  if (!website) return "sem site";
  if (dados.site_e_agregador)
    return "presença só em agregador/rede social — sem site próprio";
  if (!dados.tem_site) return "site fora do ar";

  const partes = [
    "site ok",
    dados.tem_https ? "HTTPS ok" : "sem HTTPS",
    dados.performance_mobile === null
      ? "performance indisponível"
      : `performance mobile ${dados.performance_mobile}`,
  ];
  if (dados.atendimento_automatizado === "detectado") {
    partes.push("já tem atendimento automatizado");
  } else if (dados.atendimento_automatizado === "nao_detectado") {
    partes.push("sem sinal de atendimento automatizado");
  }
  return partes.join(" · ");
}
