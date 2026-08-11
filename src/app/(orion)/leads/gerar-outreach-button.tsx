"use client";

// F005/F006 + F027 — gerar a abordagem, agora em dois canais.
// Spec: /specs/02-features/F027-outreach-por-email.md

import { useActionState, useState } from "react";
import {
  gerarOutreachAction,
  type GerarOutreachState,
} from "@/actions/leads/gerarOutreach";
import type { TipoOutreach } from "@/lib/outreach/prompt";
import { mailtoLongo } from "@/lib/outreach/mailto";
import { MarcarEnviadaButton } from "./marcar-enviada-button";

const initial: GerarOutreachState = { kind: "idle" };

type Canal = "whatsapp" | "email";

export function GerarOutreachButton({
  leadId,
  tipo = "primeira",
  canal = "whatsapp",
  /** Lead já tem e-mail capturado? Sem isso, o canal pede o endereço. */
  temEmail = false,
}: {
  leadId: string;
  tipo?: TipoOutreach;
  canal?: Canal;
  temEmail?: boolean;
}) {
  const [state, action, pending] = useActionState(gerarOutreachAction, initial);
  const [pedindoEmail, setPedindoEmail] = useState(false);
  const [copiado, setCopiado] = useState<"assunto" | "corpo" | null>(null);

  const ehEmail = canal === "email";
  const label = ehEmail
    ? tipo === "followup"
      ? "Follow-up por e-mail"
      : "Gerar e-mail"
    : tipo === "followup"
      ? "Gerar follow-up"
      : "Gerar abordagem";

  async function copiar(texto: string, qual: "assunto" | "corpo") {
    await navigator.clipboard.writeText(texto);
    setCopiado(qual);
    setTimeout(() => setCopiado(null), 1500);
  }

  return (
    <div>
      <form action={action} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="lead_id" value={leadId} />
        <input type="hidden" name="tipo" value={tipo} />
        <input type="hidden" name="canal" value={canal} />
        {ehEmail && !temEmail && (
          <input
            name="email"
            type="email"
            required
            placeholder="e-mail do Lead"
            onFocus={() => setPedindoEmail(true)}
            className="rounded-lg border border-border bg-zinc-900/70 px-3 py-1.5 text-xs text-zinc-100"
          />
        )}
        <button type="submit" disabled={pending} className="btn-ghost">
          {pending ? "Gerando..." : label}
        </button>
        {ehEmail && !temEmail && !pedindoEmail && (
          <span className="text-xs text-zinc-600">
            este Lead não tem e-mail capturado
          </span>
        )}
      </form>

      {state.kind === "ok" && (
        <div className="mt-2 max-w-xl space-y-2">
          {state.assunto && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                readOnly
                value={state.assunto}
                className="min-w-0 flex-1 rounded-lg border border-border bg-zinc-900/70 px-2 py-1.5 text-xs text-zinc-200"
              />
              <button
                type="button"
                onClick={() => void copiar(state.assunto!, "assunto")}
                className="btn-ghost"
              >
                {copiado === "assunto" ? "Copiado" : "Copiar assunto"}
              </button>
            </div>
          )}

          <textarea
            readOnly
            value={state.mensagem}
            rows={state.canal === "email" ? 10 : 5}
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
            {state.mailto && (
              <a
                href={state.mailto}
                className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                Abrir no meu e-mail
              </a>
            )}
            <button
              type="button"
              onClick={() => void copiar(state.mensagem, "corpo")}
              className="btn-ghost"
            >
              {copiado === "corpo" ? "Copiado" : "Copiar texto"}
            </button>
            <MarcarEnviadaButton outreachId={state.outreachId} />
          </div>

          {state.mailto && mailtoLongo(state.mensagem) && (
            <p className="text-xs text-amber-300">
              Texto longo: alguns clientes de e-mail cortam links `mailto:`.
              Se acontecer, copie e cole.
            </p>
          )}
        </div>
      )}

      {state.kind === "erro" && (
        <p className="mt-1 max-w-72 text-xs text-red-400">{state.mensagem}</p>
      )}
    </div>
  );
}
