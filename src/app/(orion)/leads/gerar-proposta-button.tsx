"use client";

import { useActionState, useState } from "react";
import {
  gerarPropostaAction,
  type GerarPropostaState,
} from "@/actions/leads/gerarProposta";
import { SERVICO_LABEL } from "@/lib/proposta/servicos";
import { faixaBRL } from "@/lib/proposta/formatar";

const initial: GerarPropostaState = { kind: "idle" };

export function GerarPropostaButton({ leadId }: { leadId: string }) {
  const [state, action, pending] = useActionState(gerarPropostaAction, initial);
  const [copiado, setCopiado] = useState(false);

  async function copiar(texto: string) {
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <form action={action}>
      <input type="hidden" name="lead_id" value={leadId} />
      <button type="submit" disabled={pending} className="btn-ghost">
        {pending ? "Gerando..." : "Gerar Proposta"}
      </button>

      {state.kind === "ok" && (
        <div className="mt-1 w-72 rounded-lg border border-border bg-zinc-900/70 p-3 text-left whitespace-normal">
          <p className="text-xs leading-relaxed text-zinc-300">
            {state.proposta.resumo}
          </p>

          <p className="mt-2 text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">
            Escopo
          </p>
          <ul className="mt-1 space-y-1.5">
            {state.proposta.escopo.map((e, i) => (
              <li key={i} className="text-xs">
                <span className="font-medium text-zinc-200">{e.item}</span>
                <p className="mt-0.5 leading-relaxed text-zinc-400">
                  {e.descricao}
                </p>
              </li>
            ))}
          </ul>

          {state.proposta.entregaveis.length > 0 && (
            <>
              <p className="mt-2 text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">
                Entregáveis
              </p>
              <ul className="mt-1 space-y-0.5">
                {state.proposta.entregaveis.map((e, i) => (
                  <li key={i} className="text-xs text-zinc-300">
                    • {e}
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-zinc-500">Prazo</span>
            <span className="text-zinc-300">
              {state.proposta.prazo_estimado}
            </span>
          </div>

          <div className="mt-2 rounded-md border border-primary/30 bg-primary/10 px-2 py-1.5">
            <span className="text-[10px] tracking-wide text-zinc-400 uppercase">
              Investimento sugerido
            </span>
            <p className="font-mono text-sm font-semibold text-primary">
              {faixaBRL(state.precificacao)}
            </p>
            <p className="mt-0.5 text-[10px] text-zinc-500">
              {state.precificacao.servicos
                .map((s) => SERVICO_LABEL[s])
                .join(" · ")}
            </p>
          </div>

          <button
            type="button"
            onClick={() => copiar(state.textoCopiavel)}
            className="btn-ghost mt-2"
          >
            {copiado ? "Copiado!" : "Copiar"}
          </button>
        </div>
      )}

      {state.kind === "erro" && (
        <p className="mt-1 max-w-72 text-xs text-red-400">{state.mensagem}</p>
      )}
    </form>
  );
}
