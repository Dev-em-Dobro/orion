"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { LeadStatus } from "@prisma/client";
import { STATUS_BADGE, scoreBadge, SimNao } from "./ui";
import { AjudaScore } from "./ajuda-score";
import { DiagnosticarButton } from "./diagnosticar-button";
import { PriorizarButton } from "./priorizar-button";
import { GerarOutreachButton } from "./gerar-outreach-button";
import { ResponderObjecaoPanel } from "./responder-objecao-panel";
import { GerarPropostaButton } from "./gerar-proposta-button";
import { DesfechoButtons } from "./desfecho-buttons";

export type LeadRowProps = {
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
  valor: number;
  tier: string;
  ehAgregador: boolean;
  agregadorTipo: "agregador" | "social" | null;
  diag: {
    temSite: boolean;
    siteEhAgregador: boolean;
    temHttps: boolean | null;
    performanceMobile: number | null;
  } | null;
  diagnosticadoEm: string | null;
  outreachConteudo: string | null;
  outreachEnviado: boolean;
  outreachCount: number;
  waLink: string | null;
  emAberto: boolean;
  demoUrl: string | null;
};

function SiteBadge({
  website,
  ehAgregador,
  agregadorTipo,
}: Pick<LeadRowProps, "website" | "ehAgregador" | "agregadorTipo">) {
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
}: Pick<LeadRowProps, "nota" | "numAvaliacoes">) {
  if (numAvaliacoes === null) return <span className="text-zinc-600">—</span>;
  return (
    <span className="inline-flex items-center gap-1">
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        className="h-3.5 w-3.5 text-amber-400"
      >
        <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
      </svg>
      {nota !== null && <span className="font-mono">{nota.toFixed(1)}</span>}
      <span className="font-mono text-xs text-zinc-500">({numAvaliacoes})</span>
    </span>
  );
}

export function LeadRow(p: LeadRowProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const modal =
    open && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-label={`Detalhes de ${p.nome}`}
            onClick={() => setOpen(false)}
          >
            <div
              className="my-8 w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b border-border p-5">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-zinc-100">
                    {p.nome}
                  </h2>
                  <p className="mt-0.5 text-sm text-muted">{p.categoria}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`badge ${STATUS_BADGE[p.status]}`}>
                    {p.status}
                  </span>
                  <span
                    className={`badge font-mono ${scoreBadge(p.score)}`}
                    title="Score (0 até Priorizar)"
                  >
                    {p.score}
                  </span>
                  <AjudaScore foco="score" colocacao="abaixo-direita" />
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Fechar"
                    className="rounded-md px-2 py-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="max-h-[70vh] overflow-y-auto p-5">
                {/* Infos do lead */}
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <dt className="inline-flex items-center gap-1.5 text-xs tracking-wide text-zinc-500 uppercase">
                      Valor
                      <AjudaScore foco="valor" colocacao="abaixo-esquerda" />
                    </dt>
                    <dd className="mt-0.5 font-mono text-zinc-200">
                      {p.valor}{" "}
                      <span className="text-xs text-zinc-500">{p.tier}</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs tracking-wide text-zinc-500 uppercase">
                      Avaliações
                    </dt>
                    <dd className="mt-0.5">
                      <Avaliacoes
                        nota={p.nota}
                        numAvaliacoes={p.numAvaliacoes}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs tracking-wide text-zinc-500 uppercase">
                      Telefone
                    </dt>
                    <dd className="mt-0.5 text-zinc-200">
                      {p.telefone ?? <span className="text-zinc-600">—</span>}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs tracking-wide text-zinc-500 uppercase">
                      Website
                    </dt>
                    <dd className="mt-0.5">
                      {p.website ? (
                        <a
                          href={p.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:text-primary-hover hover:underline"
                        >
                          abrir ↗
                        </a>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs tracking-wide text-zinc-500 uppercase">
                      Endereço
                    </dt>
                    <dd className="mt-0.5 text-zinc-300">{p.endereco}</dd>
                  </div>
                </dl>

                {/* Site de amostra (demo) */}
                {p.demoUrl && (
                  <a
                    href={p.demoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-4 w-4"
                      aria-hidden="true"
                    >
                      <rect x="3" y="4" width="18" height="13" rx="2" />
                      <path d="M8 21h8M12 17v4" />
                    </svg>
                    Ver site de amostra ↗
                  </a>
                )}

                {/* Diagnóstico */}
                <div className="mt-5 rounded-xl border border-border bg-zinc-900/40 p-4">
                  <p className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                    Diagnóstico
                  </p>
                  {p.diag ? (
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Site próprio</span>
                        {p.diag.siteEhAgregador ? (
                          <span
                            className="text-red-400"
                            title="Só agregador/rede social"
                          >
                            ✗
                          </span>
                        ) : (
                          <SimNao valor={p.diag.temSite} />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">HTTPS</span>
                        <SimNao valor={p.diag.temHttps} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Perf. mobile</span>
                        <span className="font-mono text-zinc-200">
                          {p.diag.performanceMobile ?? (
                            <span className="font-sans text-zinc-600">—</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Diagnóstico em</span>
                        <span className="text-zinc-300">
                          {p.diagnosticadoEm ?? "—"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted">
                      Ainda não diagnosticado.
                    </p>
                  )}
                </div>

                {/* Outreach salvo */}
                <div className="mt-4 rounded-xl border border-border bg-zinc-900/40 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                      Outreach salvo
                    </p>
                    {p.outreachConteudo && (
                      <span
                        className={`badge ${p.outreachEnviado ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-500/15 text-zinc-400"}`}
                      >
                        {p.outreachEnviado ? "enviado" : "não enviado"}
                        {p.outreachCount > 1 ? ` · ${p.outreachCount}` : ""}
                      </span>
                    )}
                  </div>
                  {p.outreachConteudo ? (
                    <>
                      <textarea
                        readOnly
                        value={p.outreachConteudo}
                        rows={5}
                        className="mt-2 w-full rounded-lg border border-border bg-zinc-900/70 p-2 text-xs text-zinc-200"
                      />
                      {p.waLink && (
                        <a
                          href={p.waLink}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary-hover"
                        >
                          Abrir no WhatsApp
                        </a>
                      )}
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-muted">
                      Nenhuma mensagem gerada ainda.
                    </p>
                  )}
                </div>

                {/* Ações */}
                <div className="mt-4">
                  <p className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                    Ações
                  </p>
                  <div className="mt-2 flex flex-wrap items-start gap-2">
                    <DiagnosticarButton leadId={p.id} />
                    <PriorizarButton leadId={p.id} />
                    <GerarOutreachButton leadId={p.id} />
                    {["contatado", "respondeu", "qualificado"].includes(
                      p.status,
                    ) && <ResponderObjecaoPanel leadId={p.id} />}
                    {["respondeu", "qualificado", "proposta"].includes(
                      p.status,
                    ) &&
                      p.diag && <GerarPropostaButton leadId={p.id} />}
                    {p.emAberto && <DesfechoButtons leadId={p.id} />}
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <tr className="border-b border-border/60 transition-colors duration-200 last:border-0 hover:bg-zinc-800/30">
        <td className="px-3 py-2.5">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-left font-medium text-zinc-100 transition-colors hover:text-primary hover:underline"
          >
            {p.nome}
          </button>
        </td>
        <td className="px-3 py-2.5 text-muted">{p.categoria}</td>
        <td className="px-3 py-2.5">
          <span className={`badge ${STATUS_BADGE[p.status]}`}>{p.status}</span>
        </td>
        <td className="px-3 py-2.5 whitespace-nowrap">
          <span className={`badge font-mono ${scoreBadge(p.score)}`}>
            {p.score}
          </span>
          <span className="ml-1 text-xs text-zinc-500">{p.tier}</span>
        </td>
        <td className="px-3 py-2.5 whitespace-nowrap">
          <Avaliacoes nota={p.nota} numAvaliacoes={p.numAvaliacoes} />
        </td>
        <td className="px-3 py-2.5">
          <SiteBadge
            website={p.website}
            ehAgregador={p.ehAgregador}
            agregadorTipo={p.agregadorTipo}
          />
        </td>
        <td className="px-3 py-2.5 text-right">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="btn-ghost whitespace-nowrap"
          >
            Detalhes
            {p.demoUrl ? " · 🖥" : ""}
            {p.outreachConteudo ? " · ✉" : ""}
          </button>
        </td>
      </tr>
      {modal}
    </>
  );
}
