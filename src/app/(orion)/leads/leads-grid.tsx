"use client";

// F032 — grade de cards + seleção em massa.
// Spec: /specs/02-features/F032-interface-do-orion.md

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import {
  descartarEmLote,
  type DescarteLoteState,
} from "@/actions/leads/descartar";
import { exportarLeadsCsv } from "@/actions/leads/exportarCsv";
import { LeadCard, type LeadCardProps } from "./lead-card";

const initial: DescarteLoteState = { kind: "idle" };

export function LeadsGrid({
  leads,
  comSelecao = true,
  podeExportar = false,
}: {
  leads: LeadCardProps[];
  /** F025 — a Fila do dia mostra os mesmos cards sem ação em massa. */
  comSelecao?: boolean;
  /** F035 — vem do servidor. Sem o recurso, o botão fica visível com cadeado:
   *  ver é o que dá vontade de assinar; sumir não vende nada. */
  podeExportar?: boolean;
}) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [state, action, pending] = useActionState(descartarEmLote, initial);
  const [erroCsv, setErroCsv] = useState<string | null>(null);

  // O CSV é montado no servidor (F035 AC9): aqui só disparamos o download.
  async function exportar(ids: string[]) {
    setErroCsv(null);
    const r = await exportarLeadsCsv(ids);
    if (r.kind !== "ok") {
      setErroCsv(r.kind === "erro" ? r.mensagem : "Falha ao exportar");
      return;
    }
    const url = URL.createObjectURL(
      new Blob([r.csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads-orion.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const idsSelecionados = useMemo(
    () => leads.filter((l) => selecionados.has(l.id)),
    [leads, selecionados],
  );

  const todosMarcados =
    leads.length > 0 && idsSelecionados.length === leads.length;

  function alternar(id: string, marcado: boolean) {
    setSelecionados((atual) => {
      const proximo = new Set(atual);
      if (marcado) proximo.add(id);
      else proximo.delete(id);
      return proximo;
    });
  }

  function alternarTodos() {
    setSelecionados(todosMarcados ? new Set() : new Set(leads.map((l) => l.id)));
  }

  return (
    <div>
      {comSelecao && (
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={todosMarcados}
            onChange={alternarTodos}
            className="h-4 w-4 accent-emerald-500"
          />
          Selecionar todos (desta página)
        </label>

        {idsSelecionados.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-400">
              {idsSelecionados.length} selecionado(s)
            </span>
            {podeExportar ? (
              <button
                type="button"
                onClick={() => void exportar(idsSelecionados.map((l) => l.id))}
                className="btn-ghost"
              >
                Exportar CSV
              </button>
            ) : (
              <Link href="/planos?recurso=exportar_csv" className="btn-ghost">
                🔒 Exportar CSV
              </Link>
            )}
            <form
              action={action}
              onSubmit={(e) => {
                if (
                  !confirm(
                    `Descartar ${idsSelecionados.length} Lead(s)? Dá pra restaurar depois.`,
                  )
                ) {
                  e.preventDefault();
                  return;
                }
                setSelecionados(new Set());
              }}
            >
              <input
                type="hidden"
                name="lead_ids"
                value={idsSelecionados.map((l) => l.id).join(",")}
              />
              <button type="submit" disabled={pending} className="btn-ghost">
                {pending ? "Descartando…" : "Descartar selecionados"}
              </button>
            </form>
          </div>
        )}
      </div>
      )}

      {state.kind === "erro" && (
        <p className="mb-3 text-xs text-red-400">{state.mensagem}</p>
      )}
      {erroCsv && <p className="mb-3 text-xs text-red-400">{erroCsv}</p>}
      {state.kind === "ok" && (
        <p className="mb-3 text-xs text-zinc-400">
          {state.descartados} Lead(s) descartado(s).
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            selecionado={selecionados.has(lead.id)}
            onSelecionar={comSelecao ? alternar : undefined}
          />
        ))}
      </div>
    </div>
  );
}
