"use client";

// F024 — descartar / restaurar Lead.
// Spec: /specs/02-features/F024-estado-do-lead-reversivel.md

import { useActionState, useState } from "react";
import {
  descartarLead,
  restaurarLead,
  type DescarteState,
} from "@/actions/leads/descartar";

const initial: DescarteState = { kind: "idle" };

/**
 * Descartar em dois tempos: o primeiro clique abre o motivo (opcional), o
 * segundo confirma. Evita descarte acidental sem custar um modal.
 */
export function DescartarButton({ leadId }: { leadId: string }) {
  const [state, action, pending] = useActionState(descartarLead, initial);
  const [aberto, setAberto] = useState(false);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="btn-ghost"
        title="Tira o Lead da lista, do funil e das cobranças. Dá pra restaurar depois."
      >
        Descartar
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="lead_id" value={leadId} />
      <input
        name="motivo"
        maxLength={140}
        placeholder="Motivo (opcional) — ex.: já tem site ótimo"
        className="min-w-[16rem] flex-1 rounded-lg border border-border bg-zinc-900/70 px-3 py-1.5 text-xs text-zinc-100"
      />
      <button type="submit" disabled={pending} className="btn-ghost">
        {pending ? "Descartando…" : "Confirmar descarte"}
      </button>
      <button
        type="button"
        onClick={() => setAberto(false)}
        className="btn-ghost"
      >
        Cancelar
      </button>
      {state.kind === "erro" && (
        <p className="w-full text-xs text-red-400">{state.mensagem}</p>
      )}
    </form>
  );
}

export function RestaurarButton({ leadId }: { leadId: string }) {
  const [state, action, pending] = useActionState(restaurarLead, initial);

  return (
    <form action={action} className="inline">
      <input type="hidden" name="lead_id" value={leadId} />
      <button type="submit" disabled={pending} className="btn-ghost">
        {pending ? "Restaurando…" : "Restaurar"}
      </button>
      {state.kind === "erro" && (
        <span className="ml-2 text-xs text-red-400">{state.mensagem}</span>
      )}
    </form>
  );
}
