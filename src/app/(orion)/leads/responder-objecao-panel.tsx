"use client";

import { useActionState, useState } from "react";
import {
  responderObjecaoAction,
  type ResponderObjecaoState,
} from "@/actions/leads/responderObjecao";

const initial: ResponderObjecaoState = { kind: "idle" };

export function ResponderObjecaoPanel({ leadId }: { leadId: string }) {
  const [state, action, pending] = useActionState(
    responderObjecaoAction,
    initial,
  );
  const [copiado, setCopiado] = useState<number | null>(null);

  async function copiar(texto: string, i: number) {
    await navigator.clipboard.writeText(texto);
    setCopiado(i);
    setTimeout(() => setCopiado(null), 2000);
  }

  return (
    <form action={action} className="w-72">
      <input type="hidden" name="lead_id" value={leadId} />
      <textarea
        name="mensagem_do_lead"
        rows={2}
        placeholder="Cole a resposta do Lead (ex.: achei caro)…"
        className="w-full rounded-lg border border-border bg-zinc-900/70 p-2 text-xs text-zinc-200 placeholder:text-zinc-500"
      />
      <button type="submit" disabled={pending} className="btn-ghost mt-1">
        {pending ? "Pensando..." : "Responder objeção"}
      </button>

      {state.kind === "ok" && (
        <ul className="mt-1 space-y-2">
          {state.respostas.map((r, i) => (
            <li
              key={i}
              className="rounded-lg border border-border bg-zinc-900/70 p-2 text-left"
            >
              <span className="badge bg-sky-500/15 text-sky-300">
                {r.abordagem}
              </span>
              <p className="mt-1 text-xs leading-relaxed text-zinc-200">
                {r.texto}
              </p>
              <button
                type="button"
                onClick={() => copiar(r.texto, i)}
                className="btn-ghost mt-1"
              >
                {copiado === i ? "Copiado!" : "Copiar"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {state.kind === "erro" && (
        <p className="mt-1 text-xs text-red-400">{state.mensagem}</p>
      )}
    </form>
  );
}
