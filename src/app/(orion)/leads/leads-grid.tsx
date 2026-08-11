"use client";

// F032 — grade de cards + seleção em massa.
// Spec: /specs/02-features/F032-interface-do-orion.md

import { useActionState, useMemo, useState } from "react";
import {
  descartarEmLote,
  type DescarteLoteState,
} from "@/actions/leads/descartar";
import { LeadCard, type LeadCardProps } from "./lead-card";

const initial: DescarteLoteState = { kind: "idle" };

function paraCsv(leads: LeadCardProps[]): string {
  const escapar = (v: string | number | null) => {
    const s = v === null ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const cabecalho = [
    "nome",
    "categoria",
    "status",
    "score",
    "telefone",
    "website",
    "endereco",
    "dor_principal",
  ];
  const linhas = leads.map((l) =>
    [
      l.nome,
      l.categoria,
      l.status,
      l.score,
      l.telefone,
      l.website,
      l.endereco,
      l.dorPrincipal,
    ]
      .map(escapar)
      .join(";"),
  );
  // Ponto e vírgula + BOM: é o que o Excel em pt-BR abre sem virar uma coluna só.
  return `﻿${cabecalho.join(";")}\n${linhas.join("\n")}`;
}

function baixarCsv(leads: LeadCardProps[]) {
  const blob = new Blob([paraCsv(leads)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "leads-orion.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function LeadsGrid({
  leads,
  comSelecao = true,
}: {
  leads: LeadCardProps[];
  /** F025 — a Fila do dia mostra os mesmos cards sem ação em massa. */
  comSelecao?: boolean;
}) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [state, action, pending] = useActionState(descartarEmLote, initial);

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
            <button
              type="button"
              onClick={() => baixarCsv(idsSelecionados)}
              className="btn-ghost"
            >
              Exportar CSV
            </button>
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
