"use client";

// F024 — descartar / restaurar Lead.
// Spec: /specs/02-features/F024-estado-do-lead-reversivel.md

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import {
  descartarLead,
  restaurarLead,
  type DescarteState,
} from "@/actions/leads/descartar";

const initial: DescarteState = { kind: "idle" };

/**
 * Descartar em dois tempos: o primeiro clique abre o motivo (opcional), o
 * segundo confirma. Evita descarte acidental sem custar um modal.
 *
 * `voltarPara`: descartar do detalhe deixava o aluno **na tela do Lead que ele
 * acabou de descartar** — a tela some do fluxo mas continua aberta, e ele tem
 * que achar a volta sozinho. Com o destino em mãos, some junto.
 */
export function DescartarButton({
  leadId,
  voltarPara,
}: {
  leadId: string;
  voltarPara?: string;
}) {
  const [state, action, pending] = useActionState(descartarLead, initial);
  const [aberto, setAberto] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (state.kind === "ok" && voltarPara) {
      router.push(voltarPara);
      // `refresh` porque a lista de destino é Server Component: sem ele o Lead
      // descartado ainda apareceria na volta, vindo do cache do router.
      router.refresh();
    }
  }, [state, voltarPara, router]);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="btn-ghost"
        title="Tira o Lead da lista, do funil e das cobranças. Dá pra restaurar depois."
      >
        Descartar
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="lead_id" value={leadId} />
      <input
        name="motivo"
        maxLength={140}
        placeholder="Motivo (opcional) — ex.: já tem site ótimo"
        className="min-w-[16rem] flex-1 rounded-lg border border-border bg-zinc-900/70 px-3 py-1.5 text-xs text-zinc-100"
      />
      <button type="submit" disabled={pending} className="btn-ghost">
        {pending ? "Descartando…" : "Confirmar descarte"}
      </button>
      <button
        type="button"
        onClick={() => setAberto(false)}
        className="btn-ghost"
      >
        Cancelar
      </button>
      {state.kind === "erro" && (
        <p className="w-full text-xs text-red-400">{state.mensagem}</p>
      )}
    </form>
  );
}

export function RestaurarButton({ leadId }: { leadId: string }) {
  const [state, action, pending] = useActionState(restaurarLead, initial);

  return (
    <form action={action} className="inline">
      <input type="hidden" name="lead_id" value={leadId} />
      <button type="submit" disabled={pending} className="btn-ghost">
        {pending ? "Restaurando…" : "Restaurar"}
      </button>
      {state.kind === "erro" && (
        <span className="ml-2 text-xs text-red-400">{state.mensagem}</span>
      )}
    </form>
  );
}
