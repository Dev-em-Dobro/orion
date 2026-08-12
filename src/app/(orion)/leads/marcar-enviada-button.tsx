"use client";

import { useActionState } from "react";
import {
  marcarEnviado,
  type MarcarEnviadoState,
} from "@/actions/leads/marcarEnviado";

const initial: MarcarEnviadoState = { kind: "idle" };

export function MarcarEnviadaButton({ outreachId }: { outreachId: string }) {
  const [state, action, pending] = useActionState(marcarEnviado, initial);

  if (state.kind === "ok") {
    return <p className="mt-1 text-xs text-emerald-400">{state.mensagem}</p>;
  }

  return (
    <form action={action} className="mt-1">
      <input type="hidden" name="outreach_id" value={outreachId} />
      <button type="submit" disabled={pending} className="btn-ghost">
        {pending ? "Marcando..." : "Marcar como enviada"}
      </button>
      {state.kind === "erro" && (
        <p className="mt-1 text-xs text-red-400">{state.mensagem}</p>
      )}
    </form>
  );
}
