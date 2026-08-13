"use client";

// F034 — board do funil: arrastar OU escolher no seletor.
// Spec: /specs/02-features/F034-funil-kanban.md
//
// Sem biblioteca de kanban (seria lib nova → ADR, e não se justifica): o
// arrastar usa o HTML5 nativo. Como drag & drop nativo não é acessível por
// teclado, o seletor "mover para" não é fallback opcional — é parte da
// entrega, e é por ele que teclado e mobile operam.

import { useState, useTransition } from "react";
import Link from "next/link";
import type { LeadStatus } from "@prisma/client";
import { corrigirStatus } from "@/actions/leads/corrigirStatus";
import { COLUNAS_FUNIL, statusAoMover } from "@/lib/funil";
import { scoreBadge } from "@/lib/leads/faixa";

export type CardFunil = {
  id: string;
  nome: string;
  categoria: string;
  score: number;
  /** F025 — score ainda vem da Triagem. Muda o estilo do badge, não o número. */
  scoreEstimado: boolean;
  status: LeadStatus;
  waLink: string | null;
  /** Coluna de origem, vinda do servidor. */
  coluna: string;
};

export type ColunaComTotal = {
  id: string;
  total: number;
  /** `true` quando a coluna tem mais Leads do que os carregados. */
  truncada: boolean;
  href: string;
};

export function Board({
  cards,
  colunas,
}: {
  cards: CardFunil[];
  colunas: ColunaComTotal[];
}) {
  // Otimista: o card muda de coluna na hora e volta se a action falhar.
  const [mudancas, setMudancas] = useState<Record<string, string>>({});
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function mover(leadId: string, destino: string, origem: string) {
    if (destino === origem) return;
    const status = statusAoMover(destino);
    if (!status) return;

    setErro(null);
    setMudancas((m) => ({ ...m, [leadId]: destino }));

    startTransition(async () => {
      const fd = new FormData();
      fd.set("lead_id", leadId);
      fd.set("status", status);
      const r = await corrigirStatus({ kind: "idle" }, fd);
      if (r.kind === "erro") {
        // Rollback: card nenhum pode ficar preso na coluna errada.
        setMudancas((m) => {
          const proximo = { ...m };
          delete proximo[leadId];
          return proximo;
        });
        setErro(r.mensagem);
      }
    });
  }

  const colunaDe = (card: CardFunil) => mudancas[card.id] ?? card.coluna;

  return (
    <div>
      {erro && <p className="mb-3 text-xs text-red-400">{erro}</p>}

      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUNAS_FUNIL.map((def) => {
          const meta = colunas.find((c) => c.id === def.id);
          const daColuna = cards.filter((card) => colunaDe(card) === def.id);

          return (
            <section
              key={def.id}
              onDragOver={(e) => {
                e.preventDefault();
                setSobre(def.id);
              }}
              onDragLeave={() => setSobre((s) => (s === def.id ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                setSobre(null);
                const [leadId, origem] = e.dataTransfer
                  .getData("text/plain")
                  .split("|");
                if (leadId && origem) mover(leadId, def.id, origem);
              }}
              className={`w-64 shrink-0 rounded-xl border p-3 transition-colors ${
                sobre === def.id
                  ? "border-primary bg-primary/5"
                  : "border-border bg-zinc-900/30"
              }`}
            >
              <header className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: def.cor }}
                    aria-hidden
                  />
                  {def.titulo}
                </span>
                <span className="font-mono text-xs text-muted">
                  {meta?.total ?? 0}
                </span>
              </header>

              <ul className="mt-3 space-y-2">
                {daColuna.map((card) => (
                  <li
                    key={card.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        "text/plain",
                        `${card.id}|${def.id}`,
                      );
                      setArrastando(card.id);
                    }}
                    onDragEnd={() => setArrastando(null)}
                    className={`cursor-grab rounded-lg border border-border bg-card p-3 ${
                      arrastando === card.id ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/leads/${card.id}`}
                        className="text-sm font-medium text-zinc-100 hover:text-primary hover:underline"
                      >
                        {card.nome}
                      </Link>
                      <span
                        className={`badge shrink-0 font-mono ${scoreBadge(
                          card.score,
                          card.scoreEstimado,
                        )}`}
                      >
                        {card.score}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {card.categoria}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      {card.waLink && (
                        <a
                          href={card.waLink}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-ghost"
                        >
                          WhatsApp
                        </a>
                      )}
                      {/* Caminho acessível: teclado e mobile movem por aqui. */}
                      <select
                        aria-label={`Mover ${card.nome} para outra coluna`}
                        value={def.id}
                        onChange={(e) => mover(card.id, e.target.value, def.id)}
                        className="rounded-md border border-border bg-zinc-900/70 px-1.5 py-1 text-xs text-zinc-300"
                      >
                        {COLUNAS_FUNIL.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.titulo}
                          </option>
                        ))}
                      </select>
                    </div>
                  </li>
                ))}
              </ul>

              {meta?.truncada && (
                <Link
                  href={meta.href}
                  className="mt-3 block text-center text-xs text-primary hover:underline"
                >
                  ver todos ({meta.total})
                </Link>
              )}
              {daColuna.length === 0 && (
                <p className="mt-3 text-center text-xs text-muted">vazio</p>
              )}
            </section>
          );
        })}
      </div>

      <p className="mt-2 text-xs text-muted">
        Arraste um card ou use o seletor dentro dele. Mover corrige o status —
        Diagnóstico, Dores e Abordagens continuam salvos.
      </p>
    </div>
  );
}
