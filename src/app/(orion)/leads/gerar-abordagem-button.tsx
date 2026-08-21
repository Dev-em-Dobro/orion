"use client";

// F005/F006 — gerar a abordagem de WhatsApp.
// F038 — o mesmo botão serve o canal `ligacao` (roteiro falado).
//
// O canal e-mail (F027) saiu em 2026-08-13 (ver F035): o seletor de canal, o
// campo de e-mail, o `mailto:` e o aviso de texto longo foram junto.

import { useActionState, useState } from "react";
import {
  gerarAbordagemAction,
  type CanalGeravel,
  type GerarAbordagemState,
} from "@/actions/leads/gerarAbordagem";
import type { TipoAbordagem } from "@/lib/abordagem/gerarAbordagem";
import { MarcarEnviadaButton } from "./marcar-enviada-button";

const initial: GerarAbordagemState = { kind: "idle" };

function rotular(canal: CanalGeravel, tipo: TipoAbordagem): string {
  if (canal === "ligacao") {
    return tipo === "followup"
      ? "Gerar roteiro de retorno"
      : "Gerar roteiro de ligação";
  }
  return tipo === "followup" ? "Gerar follow-up" : "Gerar abordagem";
}

export function GerarAbordagemButton({
  leadId,
  tipo = "primeira",
  canal = "whatsapp",
  destaque = false,
}: {
  leadId: string;
  tipo?: TipoAbordagem;
  canal?: CanalGeravel;
  /** F038 — o caminho recomendado da aba ganha botão sólido, não fantasma. */
  destaque?: boolean;
}) {
  const [state, action, pending] = useActionState(gerarAbordagemAction, initial);
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
          // `btn-primary` no lugar do emerald cru. O botão trazia
          // `bg-emerald-500` + `text-emerald-950` escrito à mão, fora do
          // sistema de cor — e o tema claro derruba `emerald-400` pra #047857
          // pra passar contraste em texto, então o HOVER virava verde-escuro
          // com texto quase preto: 2,7:1, ilegível. `btn-primary` já carrega o
          // par fundo/texto certo nos dois temas.
          className={destaque ? "btn-primary" : "btn-ghost"}
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
                className="btn-abordagem-primary"
              >
                Abrir no WhatsApp
              </a>
            )}
            <button
              type="button"
              onClick={() => void copiar(state.mensagem)}
              className="btn-abordagem"
            >
              {copiado ? "Copiado" : ehLigacao ? "Copiar roteiro" : "Copiar texto"}
            </button>
            <MarcarEnviadaButton
              abordagemId={state.abordagemId}
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
