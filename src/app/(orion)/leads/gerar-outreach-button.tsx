"use client";

import { useActionState } from "react";
import {
  gerarOutreachAction,
  type GerarOutreachState,
} from "@/actions/leads/gerarOutreach";
import type { TipoOutreach } from "@/lib/outreach/prompt";
import { MarcarEnviadaButton } from "./marcar-enviada-button";

const initial: GerarOutreachState = { kind: "idle" };

export function GerarOutreachButton({
  leadId,
  tipo = "primeira",
}: {
  leadId: string;
  tipo?: TipoOutreach;
}) {
  const [state, action, pending] = useActionState(gerarOutreachAction, initial);
  const label = tipo === "followup" ? "Gerar follow-up" : "Gerar Outreach";

  return (
    <div>
      <form action={action}>
        <input type="hidden" name="lead_id" value={leadId} />
        <input type="hidden" name="tipo" value={tipo} />
        <button type="submit" disabled={pending} className="btn-ghost">
          {pending ? "Gerando..." : label}
        </button>
      </form>

      {state.kind === "ok" && (
        <div className="mt-1 max-w-72">
          <textarea
            readOnly
            value={state.mensagem}
            rows={5}
            className="w-full rounded-lg border border-border bg-zinc-900/70 p-2 text-xs text-zinc-200"
          />
          {state.waLink && (
            <a
              href={state.waLink}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary-hover"
            >
              Abrir no WhatsApp
            </a>
          )}
          <MarcarEnviadaButton outreachId={state.outreachId} />
        </div>
      )}

      {state.kind === "erro" && (
        <p className="mt-1 max-w-72 text-xs text-red-400">{state.mensagem}</p>
      )}
    </div>
  );
}
