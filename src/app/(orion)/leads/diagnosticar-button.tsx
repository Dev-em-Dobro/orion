"use client";

import { useActionState } from "react";
import {
  diagnosticarLead,
  type DiagnosticarState,
} from "@/actions/leads/diagnosticar";
import { Ajuda } from "./ajuda";

const initial: DiagnosticarState = { kind: "idle" };

export function DiagnosticarButton({
  leadId,
  /**
   * Muda o rótulo e o texto de ajuda. "Diagnosticar" num Lead que já tem
   * Diagnóstico sugere que nada existe ainda — e o que o botão faz ali é
   * **refazer**, jogando fora o resultado anterior.
   */
  jaTemDiagnostico = false,
}: {
  leadId: string;
  jaTemDiagnostico?: boolean;
}) {
  const [state, action, pending] = useActionState(diagnosticarLead, initial);

  const rotulo = jaTemDiagnostico ? "Rediagnosticar" : "Diagnosticar";
  const rodando = jaTemDiagnostico ? "Rediagnosticando..." : "Diagnosticando...";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <form action={action}>
          <input type="hidden" name="lead_id" value={leadId} />
          <button type="submit" disabled={pending} className="btn-ghost">
            {pending ? rodando : rotulo}
          </button>
        </form>

        {/* `i` e não `?`: aqui não é dúvida sobre um conceito, é o que a ação
            vai fazer — e ela é destrutiva do lado das Dores. Precisa ser
            legível ANTES do clique. */}
        <Ajuda
          simbolo="i"
          rotulo={
            jaTemDiagnostico
              ? "O que acontece ao rediagnosticar"
              : "O que o Diagnóstico faz"
          }
        >
          {jaTemDiagnostico ? (
            <>
              Roda o Diagnóstico de novo no site do Lead e{" "}
              <strong className="text-zinc-100">
                substitui as Dores atuais
              </strong>{" "}
              pelo que encontrar agora — útil quando o site mudou desde a última
              vez (voltou do ar, ganhou HTTPS, ficou mais rápido).
              <span className="mt-2 block">
                O Diagnóstico anterior fica no histórico, e nada acontece com as
                Abordagens já geradas ou com o estágio do Lead no funil. Consome
                uma unidade da sua cota diária de diagnóstico.
              </span>
            </>
          ) : (
            <>
              Abre o site do Lead e mede o que dá pra medir sem pedir nada a
              ninguém: se está no ar, se tem HTTPS, quanto demora no celular e
              se há sinal de atendimento automatizado.
              <span className="mt-2 block">
                Disso saem as <strong className="text-zinc-100">Dores</strong> —
                o que você mostra na abordagem — e o score deixa de ser
                estimativa. Consome uma unidade da sua cota diária.
              </span>
            </>
          )}
        </Ajuda>
      </div>

      <div role="status" aria-live="polite">
        {state.kind === "ok" && (
          <p className="mt-1 max-w-48 text-xs text-emerald-400">
            {state.resumo}
          </p>
        )}
        {state.kind === "erro" && (
          <p className="mt-1 max-w-48 text-xs text-red-400">{state.mensagem}</p>
        )}
      </div>
    </div>
  );
}
