// Helpers de UI compartilhados entre a página de Leads (server) e a LeadRow
// (client). Sem hooks nem "use client" → usável dos dois lados.
import type { LeadStatus } from "@prisma/client";

export { linkWhatsapp } from "@/lib/outreach/whatsappLink";

export const STATUS_BADGE: Record<LeadStatus, string> = {
  novo: "bg-zinc-500/15 text-zinc-300",
  enriquecido: "bg-sky-500/15 text-sky-300",
  priorizado: "bg-violet-500/15 text-violet-300",
  contatado: "bg-amber-500/15 text-amber-300",
  respondeu: "bg-cyan-500/15 text-cyan-300",
  qualificado: "bg-teal-500/15 text-teal-300",
  proposta: "bg-indigo-500/15 text-indigo-300",
  ganho: "bg-emerald-500/15 text-emerald-300",
  perdido: "bg-red-500/15 text-red-300",
};

export function scoreBadge(score: number) {
  if (score >= 60) return "bg-emerald-500/15 text-emerald-300";
  if (score >= 30) return "bg-amber-500/15 text-amber-300";
  return "bg-zinc-500/15 text-zinc-400";
}

export function SimNao({ valor }: { valor: boolean | null | undefined }) {
  if (valor === null || valor === undefined) {
    return <span className="text-zinc-600">—</span>;
  }
  return valor ? (
    <span className="text-emerald-400">✓</span>
  ) : (
    <span className="text-red-400">✗</span>
  );
}
