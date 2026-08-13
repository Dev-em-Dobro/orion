"use client";

// F005/F006 — gerar a abordagem de WhatsApp.
// F038 — o mesmo botão serve o canal `ligacao` (roteiro falado).
//
// O canal e-mail (F027) saiu em 2026-08-13 (ver F035): o seletor de canal, o
// campo de e-mail, o `mailto:` e o aviso de texto longo foram junto.

import { useActionState, useState } from "react";
import {
  gerarOutreachAction,
  type CanalGeravel,
  type GerarOutreachState,
} from "@/actions/leads/gerarOutreach";
import type { TipoOutreach } from "@/lib/outreach/prompt";
import { MarcarEnviadaButton } from "./marcar-enviada-button";

const initial: GerarOutreachState = { kind: "idle" };

function rotular(canal: CanalGeravel, tipo: TipoOutreach): string {
  if (canal === "ligacao") {
    return tipo === "followup"
      ? "Gerar roteiro de retorno"
      : "Gerar roteiro de ligação";
  }
  return tipo === "followup" ? "Gerar follow-up" : "Gerar abordagem";
}

export function GerarOutreachButton({
  leadId,
  tipo = "primeira",
  canal = "whatsapp",
  destaque = false,
}: {
  leadId: string;
  tipo?: TipoOutreach;
  canal?: CanalGeravel;
  /** F038 — o caminho recomendado da aba ganha botão sólido, não fantasma. */
  destaque?: boolean;
}) {
  const [state, action, pending] = useActionState(gerarOutreachAction, initial);
  const [copiado, setCopiado] = useState(false);

  const ehLigacao = canal === "ligacao";
  const label = rotular(canal, tipo);

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
        <input type="hidden" name="canal" value={canal} />
        <button
          type="submit"
          disabled={pending}
          className={
            destaque
              ? "rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-400 disabled:opacity-60"
              : "btn-ghost"
          }
        >
          {pending ? "Gerando..." : label}
        </button>
      </form>

      {state.kind === "ok" && (
        <div className="mt-2 max-w-xl space-y-2">
          <textarea
            readOnly
            value={state.mensagem}
            rows={ehLigacao ? 8 : 5}
            className="w-full rounded-lg border border-border bg-zinc-900/70 p-2 text-xs text-zinc-200"
          />

          <div className="flex flex-wrap items-center gap-2">
            {/* F038 AC4 — `waLink` já vem `null` no canal ligacao. */}
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
              {copiado ? "Copiado" : ehLigacao ? "Copiar roteiro" : "Copiar texto"}
            </button>
            <MarcarEnviadaButton
              outreachId={state.outreachId}
              rotulo={ehLigacao ? "Já falei com ele" : "Marcar como enviada"}
            />
          </div>
        </div>
      )}

      {state.kind === "erro" && (
        <p className="mt-1 max-w-72 text-xs text-red-400">{state.mensagem}</p>
      )}
    </div>
  );
}
