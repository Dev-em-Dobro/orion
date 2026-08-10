"use client";

// F032 — card de Lead. Substitui a linha da tabela (`lead-row.tsx`) e é o
// mesmo componente usado na lista, no resultado da busca e (a partir da F025)
// na Fila do dia.
// Spec: /specs/02-features/F032-interface-do-orion.md

import Link from "next/link";
import type { LeadStatus } from "@prisma/client";
import { faixaDeScore, scoreBadge, STATUS_BADGE } from "./ui";
import { DescartarButton, RestaurarButton } from "./descarte-buttons";
import { DiagnosticarButton } from "./diagnosticar-button";
import { PriorizarButton } from "./priorizar-button";
import { GerarOutreachButton } from "./gerar-outreach-button";

export type LeadCardProps = {
  id: string;
  nome: string;
  categoria: string;
  endereco: string;
  telefone: string | null;
  website: string | null;
  nota: number | null;
  numAvaliacoes: number | null;
  status: LeadStatus;
  score: number;
  tier: string;
  ehAgregador: boolean;
  agregadorTipo: "agregador" | "social" | null;
  temDiagnostico: boolean;
  dorPrincipal: string | null;
  temOutreach: boolean;
  outreachEnviado: boolean;
  waLink: string | null;
  motivoDescarte: string | null;
  /** Link do detalhe já com o contexto de filtro (F032 AC8). */
  href: string;
};

function SiteBadge({
  website,
  ehAgregador,
  agregadorTipo,
}: Pick<LeadCardProps, "website" | "ehAgregador" | "agregadorTipo">) {
  if (!website)
    return <span className="badge bg-red-500/15 text-red-300">sem site</span>;
  if (ehAgregador)
    return (
      <span className="badge bg-amber-500/15 text-amber-300">
        {agregadorTipo === "social" ? "rede social" : "link-in-bio"}
      </span>
    );
  return <span className="badge bg-zinc-500/15 text-zinc-300">site</span>;
}

function Avaliacoes({
  nota,
  numAvaliacoes,
}: Pick<LeadCardProps, "nota" | "numAvaliacoes">) {
  if (numAvaliacoes === null) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        className="h-3.5 w-3.5 text-amber-400"
      >
        <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
      </svg>
      {nota !== null && <span className="font-mono">{nota.toFixed(1)}</span>}
      <span className="font-mono text-zinc-500">({numAvaliacoes})</span>
    </span>
  );
}

/**
 * Ação primária do card: o próximo passo do Lead, não um menu de tudo que dá
 * pra fazer. O resto vive no detalhe.
 */
function AcaoPrimaria(p: LeadCardProps) {
  if (p.status === "descartado") return <RestaurarButton leadId={p.id} />;
  if (!p.temDiagnostico) return <DiagnosticarButton leadId={p.id} />;
  if (p.score === 0) return <PriorizarButton leadId={p.id} />;
  if (!p.temOutreach) return <GerarOutreachButton leadId={p.id} />;
  if (!p.outreachEnviado && p.waLink) {
    return (
      <a
        href={p.waLink}
        target="_blank"
        rel="noreferrer"
        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
      >
        Abrir no WhatsApp
      </a>
    );
  }
  return (
    <Link href={p.href} className="btn-ghost">
      Registrar desfecho
    </Link>
  );
}

export function LeadCard({
  lead,
  selecionado,
  onSelecionar,
}: {
  lead: LeadCardProps;
  selecionado: boolean;
  onSelecionar: (id: string, marcado: boolean) => void;
}) {
  return (
    <article
      className={`flex flex-col gap-3 rounded-xl border bg-card p-4 transition-colors ${
        selecionado
          ? "border-primary/60 bg-primary/5"
          : "border-border hover:border-zinc-700"
      }`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={lead.href}
            className="font-medium text-zinc-100 hover:text-primary hover:underline"
          >
            {lead.nome}
          </Link>
          <p className="mt-0.5 truncate text-xs text-muted">
            {lead.categoria}
            <span className="text-zinc-600"> · {lead.tier}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`badge font-mono ${scoreBadge(lead.score)}`}
            title={`Score ${lead.score} — faixa ${faixaDeScore(lead.score)}`}
          >
            {lead.score} {faixaDeScore(lead.score)}
          </span>
          <input
            type="checkbox"
            checked={selecionado}
            onChange={(e) => onSelecionar(lead.id, e.target.checked)}
            aria-label={`Selecionar ${lead.nome}`}
            className="h-4 w-4 accent-emerald-500"
          />
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {lead.telefone ? (
          <span className="text-zinc-300">{lead.telefone}</span>
        ) : (
          <span className="text-zinc-600">sem telefone</span>
        )}
        <SiteBadge
          website={lead.website}
          ehAgregador={lead.ehAgregador}
          agregadorTipo={lead.agregadorTipo}
        />
        <span className={`badge ${STATUS_BADGE[lead.status]}`}>
          {lead.status}
        </span>
        <Avaliacoes nota={lead.nota} numAvaliacoes={lead.numAvaliacoes} />
      </div>

      {lead.dorPrincipal && (
        <p className="text-xs text-amber-300/90">⚡ {lead.dorPrincipal}</p>
      )}
      {lead.motivoDescarte && (
        <p className="text-xs text-zinc-500">Descartado: {lead.motivoDescarte}</p>
      )}

      <p className="truncate text-xs text-zinc-500" title={lead.endereco}>
        {lead.endereco}
      </p>

      <footer className="mt-auto flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <AcaoPrimaria {...lead} />
        <Link href={lead.href} className="btn-ghost">
          Abrir
        </Link>
        {lead.status !== "descartado" && <DescartarButton leadId={lead.id} />}
      </footer>
    </article>
  );
}
