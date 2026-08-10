"use client";

// F024 — corrigir o status do Lead (aceita regressão, com confirmação).
// Spec: /specs/02-features/F024-estado-do-lead-reversivel.md

import { useActionState, useState } from "react";
import type { LeadStatus } from "@prisma/client";
import {
  corrigirStatus,
  type CorrigirStatusState,
} from "@/actions/leads/corrigirStatus";

const initial: CorrigirStatusState = { kind: "idle" };

// Ordem do funil; `descartado` fica de fora — pra isso existe o Descartar.
const OPCOES: { valor: LeadStatus; label: string }[] = [
  { valor: "novo", label: "Novo" },
  { valor: "enriquecido", label: "Enriquecido" },
  { valor: "priorizado", label: "Priorizado" },
  { valor: "contatado", label: "Contatado" },
  { valor: "respondeu", label: "Respondeu" },
  { valor: "qualificado", label: "Qualificado" },
  { valor: "proposta", label: "Proposta" },
  { valor: "ganho", label: "Ganho" },
  { valor: "perdido", label: "Perdido" },
];

const RANK = new Map(OPCOES.map((o, i) => [o.valor, i]));

export function CorrigirStatusForm({
  leadId,
  statusAtual,
}: {
  leadId: string;
  statusAtual: LeadStatus;
}) {
  const [state, action, pending] = useActionState(corrigirStatus, initial);
  const [escolhido, setEscolhido] = useState<LeadStatus>(statusAtual);

  const rankAtual = RANK.get(statusAtual);
  const rankNovo = RANK.get(escolhido);
  const regride =
    rankAtual !== undefined && rankNovo !== undefined && rankNovo < rankAtual;

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="lead_id" value={leadId} />
      <select
        name="status"
        value={escolhido}
        onChange={(e) => setEscolhido(e.target.value as LeadStatus)}
        className="rounded-lg border border-border bg-zinc-900/70 px-3 py-1.5 text-xs text-zinc-100"
      >
        {OPCOES.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending || escolhido === statusAtual}
        className="btn-ghost"
        onClick={(e) => {
          if (
            regride &&
            !confirm(
              `Isso volta o Lead para "${escolhido}". Diagnósticos, Dores e Outreaches continuam salvos.`,
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        {pending ? "Corrigindo…" : "Corrigir status"}
      </button>
      {regride && escolhido !== statusAtual && (
        <span className="text-xs text-amber-300">volta o funil</span>
      )}
      {state.kind === "erro" && (
        <p className="w-full text-xs text-red-400">{state.mensagem}</p>
      )}
    </form>
  );
}
