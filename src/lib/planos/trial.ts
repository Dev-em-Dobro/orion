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

/** Duração da cortesia em grants novos. Default 90; env só vale pra frente. */
export const CORTESIA_PRO_DIAS_PADRAO = 90;

export function diasCortesiaPro(
  raw: string | undefined = process.env.CORTESIA_PRO_DIAS,
): number {
  const n = Number(raw);
  if (Number.isInteger(n) && n > 0) return n;
  return CORTESIA_PRO_DIAS_PADRAO;
}

/**
 * Product id sintético da cortesia (`trial-pro-…`). Vazio / id Hubla real →
 * não há cortesia automática no grant Elite.
 */
export function idProdutoCortesiaPro(
  raw: string | undefined = process.env.HUBLA_PRODUCT_ID_PRO,
): string | null {
  const primeiro = (raw ?? "").split(",")[0]?.trim() ?? "";
  if (!primeiro.startsWith("trial-pro")) return null;
  return primeiro;
}

export function isoDateEmSaoPaulo(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function fimDoDiaSaoPaulo(iso: string): Date {
  return new Date(`${iso}T23:59:59.999-03:00`);
}

export function somarDiasIso(iso: string, dias: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const utc = new Date(Date.UTC(y, m - 1, d + dias));
  return utc.toISOString().slice(0, 10);
}

/** Fim inclusive: granted_at (dia em SP) + N dias, 23:59:59.999 em SP. */
export function dataExpiracaoCortesia(
  from: Date,
  dias: number = diasCortesiaPro(),
): Date {
  return fimDoDiaSaoPaulo(somarDiasIso(isoDateEmSaoPaulo(from), dias));
}

export function entitlementPlanoVigente(
  row: { product_id: string; expires_at: Date | null },
  agora: Date = new Date(),
): boolean {
  if (row.expires_at) return row.expires_at.getTime() >= agora.getTime();
  if (row.product_id.startsWith("trial-pro")) {
    return agora.getTime() <= fimDoDiaSaoPaulo(TRIAL_PRO_FIM_ISO).getTime();
  }
  return true;
}

/** "3 meses" se N ÷ 30; senão "90 dias". */
export function rotuloDuracaoCortesia(dias: number = diasCortesiaPro()): string {
  if (dias % 30 === 0) {
    const meses = dias / 30;
    return meses === 1 ? "1 mês" : `${meses} meses`;
  }
  return `${dias} dias`;
}
