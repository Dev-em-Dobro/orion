"use client";

// F034 — "Mandar pro Funil": ação primária do card e da seleção em massa.
// Spec: /specs/02-features/F034-funil-kanban.md

import { useActionState } from "react";
import {
  mandarProFunil,
  type MandarProFunilState,
} from "@/actions/leads/mandarProFunil";

const initial: MandarProFunilState = { kind: "idle" };

export function MandarProFunilButton({
  leadId,
  leadIds,
  rotulo,
  variante = "card",
}: {
  /** Um Lead (card da lista / Fila do dia). */
  leadId?: string;
  /** Vários (seleção em massa da lista). */
  leadIds?: string[];
  rotulo?: string;
  variante?: "card" | "ghost";
}) {
  const [state, action, pending] = useActionState(mandarProFunil, initial);
  const ids = leadIds ?? (leadId ? [leadId] : []);
  if (ids.length === 0) return null;

  return (
    <form action={action} className="contents">
      <input type="hidden" name="lead_ids" value={ids.join(",")} />
      <button
        type="submit"
        disabled={pending}
        className={variante === "card" ? "btn-card" : "btn-ghost"}
      >
        {pending ? "Mandando…" : (rotulo ?? "Mandar pro Funil")}
      </button>
      {state.kind === "erro" && (
        <span className="text-xs text-red-400">{state.mensagem}</span>
      )}
    </form>
  );
}
