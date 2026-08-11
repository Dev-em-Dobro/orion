"use client";

// F031 — adiar / dispensar uma cobrança.
// Spec: /specs/02-features/F031-central-de-tarefas.md

import { useActionState } from "react";
import type { TipoTarefa } from "@prisma/client";
import {
  adiarTarefa,
  dispensarTarefa,
  type TarefaState,
} from "@/actions/tarefas/adiar";

const initial: TarefaState = { kind: "idle" };

export function TarefaAcoes({
  tipo,
  leadId,
  marco,
}: {
  tipo: TipoTarefa;
  leadId: string | null;
  /** ISO do marco — é ele que faz a cobrança voltar quando o fato muda. */
  marco: string;
}) {
  const [adiarState, adiar, adiando] = useActionState(adiarTarefa, initial);
  const [dispensarState, dispensar, dispensando] = useActionState(
    dispensarTarefa,
    initial,
  );

  const erro =
    adiarState.kind === "erro"
      ? adiarState.mensagem
      : dispensarState.kind === "erro"
        ? dispensarState.mensagem
        : null;

  const campos = (
    <>
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="lead_id" value={leadId ?? ""} />
      <input type="hidden" name="marco" value={marco} />
    </>
  );

  return (
    <div className="flex flex-wrap items-center gap-1">
      <form action={adiar} className="inline">
        {campos}
        <button
          type="submit"
          disabled={adiando}
          className="btn-ghost"
          title="Some por 1 dia"
        >
          Adiar
        </button>
      </form>
      <form action={dispensar} className="inline">
        {campos}
        <button
          type="submit"
          disabled={dispensando}
          className="btn-ghost"
          title="Some até algo mudar neste Lead"
        >
          Dispensar
        </button>
      </form>
      {erro && <span className="text-xs text-red-400">{erro}</span>}
    </div>
  );
}
