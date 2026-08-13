"use client";

// F005/F006 — gerar a abordagem de WhatsApp.
//
// O canal e-mail (F027) saiu em 2026-08-13 (ver F035): o seletor de canal, o
// campo de e-mail, o `mailto:` e o aviso de texto longo foram junto.

import { useActionState, useState } from "react";
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
  const [copiado, setCopiado] = useState(false);

  const label = tipo === "followup" ? "Gerar follow-up" : "Gerar abordagem";

  async function copiar(texto: string) {
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  }

  return (
    <div>
      <form action={action} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="lead_id" value={leadId} />
        <input type="hidden" name="tipo" value={tipo} />
        <button type="submit" disabled={pending} className="btn-ghost">
          {pending ? "Gerando..." : label}
        </button>
      </form>

      {state.kind === "ok" && (
        <div className="mt-2 max-w-xl space-y-2">
          <textarea
            readOnly
            value={state.mensagem}
            rows={5}
            className="w-full rounded-lg border border-border bg-zinc-900/70 p-2 text-xs text-zinc-200"
          />

          <div className="flex flex-wrap items-center gap-2">
            {state.waLink && (
              <a
                href={state.waLink}
                target="_blank"
                rel="noreferrer"
                className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                Abrir no WhatsApp
              </a>
            )}
            <button
              type="button"
              onClick={() => void copiar(state.mensagem)}
              className="btn-ghost"
            >
              {copiado ? "Copiado" : "Copiar texto"}
            </button>
            <MarcarEnviadaButton outreachId={state.outreachId} />
          </div>
        </div>
      )}

      {state.kind === "erro" && (
        <p className="mt-1 max-w-72 text-xs text-red-400">{state.mensagem}</p>
      )}
    </div>
  );
}
