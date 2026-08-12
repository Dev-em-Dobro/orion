"use client";

import { useActionState } from "react";
import {
  registrarDesfecho,
  type DesfechoState,
} from "@/actions/leads/registrarDesfecho";

const initial: DesfechoState = { kind: "idle" };

const OPCOES = [
  { d: "respondeu", label: "Respondeu" },
  { d: "qualificado", label: "Qualificou" },
  { d: "proposta", label: "Proposta" },
  { d: "ganho", label: "Ganho" },
  { d: "perdido", label: "Perdido" },
] as const;

export function DesfechoButtons({ leadId }: { leadId: string }) {
  const [state, action, pending] = useActionState(registrarDesfecho, initial);

  return (
    <div className="flex flex-wrap gap-1">
      {OPCOES.map(({ d, label }) => (
        <form key={d} action={action}>
          <input type="hidden" name="lead_id" value={leadId} />
          <input type="hidden" name="desfecho" value={d} />
          <button type="submit" disabled={pending} className="btn-ghost">
            {label}
          </button>
        </form>
      ))}
      {state.kind === "erro" && (
        <p className="w-full text-xs text-red-400">{state.mensagem}</p>
      )}
    </div>
  );
}
