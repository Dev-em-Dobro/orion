// F035 — período de teste do Pro (2026-08-18 → 2026-11-16).
// Spec: /specs/02-features/F035-planos-e-limites.md ("Período de teste do Pro")
//
// Sem Prisma de propósito: Client Component lê a data/copy; o servidor decide
// se o aviso cabe com `trialProAtivoNoAmbiente()` + plano do aluno.

/** Fim do teste (inclusive), America/Sao_Paulo — alinhado ao script e à spec. */
export const TRIAL_PRO_FIM_ISO = "2026-11-16";

/** Meses anunciados no aviso (não recalcular a partir da data: o copy é fixo). */
export const TRIAL_PRO_MESES = 3;

/**
 * O ambiente está no modo "teste do Pro" quando a var aponta pro product_id
 * sintético (`trial-pro-…`). Product id real da Hubla não liga o aviso.
 */
export function trialProAtivoNoAmbiente(
  productId: string | undefined = process.env.HUBLA_PRODUCT_ID_PRO,
): boolean {
  return (productId ?? "").startsWith("trial-pro");
}

/** "16/11/2026" — o que o banner mostra. */
export function rotuloFimTrialPro(iso: string = TRIAL_PRO_FIM_ISO): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}
