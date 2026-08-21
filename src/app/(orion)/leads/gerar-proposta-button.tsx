"use client";

// F012 (emenda de precificação 2026-08-16) — o preço é fechado ANTES de gerar.
// Spec: /specs/02-features/F012-gerador-de-proposta.md
//
// A ordem da tela é a ordem da venda: marcar o que o cliente leva → fechar os
// valores → só então gerar o texto. Gerar primeiro e precificar depois é o que
// produzia PDF com faixa, que ancora o cliente no piso.

import { useActionState, useMemo, useState } from "react";
import {
  gerarPropostaAction,
  type GerarPropostaState,
} from "@/actions/leads/gerarProposta";
import { item } from "@/lib/proposta/catalogo";
import { precoFechado } from "@/lib/proposta/formatar";
import {
  itensOrdenados,
  selecaoVazia,
  validar,
  type Selecao,
} from "@/lib/proposta/selecao";
import { FolhaProposta } from "./folha-proposta";
import { SeletorServicos } from "./seletor-servicos";

const initial: GerarPropostaState = { kind: "idle" };

export function GerarPropostaButton({
  leadId,
  nomeDoLead,
  /** Pré-marcação vinda do Diagnóstico (F012 AC20). O aluno ajusta à vontade. */
  sugestao,
}: {
  leadId: string;
  nomeDoLead: string;
  sugestao?: Selecao;
}) {
  const [state, action, pending] = useActionState(gerarPropostaAction, initial);
  const [selecao, setSelecao] = useState<Selecao>(sugestao ?? selecaoVazia());
  const [copiado, setCopiado] = useState(false);

  // A data de emissão é carimbada quando a Proposta chega e congela ali:
  // `new Date()` solto no render mudaria a data impressa a cada re-render.
  const folha = useMemo(
    () => (state.kind === "ok" ? { ...state, emitidaEm: new Date() } : null),
    [state],
  );

  const problemas = validar(selecao);
  const podeGerar = problemas.length === 0 && !pending;

  async function copiar(texto: string) {
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <form action={action}>
      <input type="hidden" name="lead_id" value={leadId} />
      {/* A seleção viaja como JSON: FormData não tem forma de mandar
          estrutura aninhada sem inventar convenção de nome de campo. */}
      <input type="hidden" name="selecao" value={JSON.stringify(selecao)} />

      <SeletorServicos selecao={selecao} onChange={setSelecao} />

      <button
        type="submit"
        disabled={!podeGerar}
        className="btn-primary mt-4"
        title={
          problemas.length > 0 ? "Feche o valor e o prazo antes de gerar" : undefined
        }
      >
        {pending ? "Gerando..." : "Gerar Proposta"}
      </button>

      {state.kind === "ok" && (
        <div className="mt-4 max-w-3xl rounded-lg border border-border bg-zinc-900/70 p-4 text-left">
          <p className="text-xs leading-relaxed text-zinc-300">
            {state.proposta.resumo}
          </p>

          {/* O valor como o cliente vai ver: fechado, sem faixa. */}
          <div className="mt-3 rounded-md border border-border bg-card-raised px-3 py-2">
            <p className="text-[10px] font-semibold tracking-wide text-muted uppercase">
              Investimento
            </p>
            <p className="mt-0.5 font-mono text-sm font-semibold text-primary">
              {precoFechado(state.selecao.valor, state.selecao.mensal)}
            </p>
            <p className="mt-1 text-[11px] text-zinc-400">
              {itensOrdenados(state.selecao)
                .map((i) => item(i).titulo)
                .join(" · ")}
            </p>
          </div>

          <p className="mt-3 text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">
            O que está incluído
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
              <p className="mt-3 text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">
                Entregáveis
              </p>
              <ul className="mt-1 space-y-0.5">
                {state.proposta.entregaveis.map((e, i) => (
                  <li key={i} className="text-xs text-zinc-300">
                    {e}
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-zinc-500">Prazo</span>
            <span className="text-zinc-300">{state.selecao.prazo}</span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {/* F012 AC12 — o diálogo do navegador imprime só `.folha-proposta`;
                o resto do app fica `visibility: hidden` no `@media print`. */}
            <button
              type="button"
              onClick={() => window.print()}
              className="btn-primary"
            >
              Baixar PDF
            </button>
            <button
              type="button"
              onClick={() => copiar(state.textoCopiavel)}
              className="btn-ghost"
            >
              {copiado ? "Copiado!" : "Copiar texto"}
            </button>
          </div>
        </div>
      )}

      {folha && (
        <FolhaProposta
          proposta={folha.proposta}
          selecao={folha.selecao}
          nomeDoLead={nomeDoLead}
          emitidaEm={folha.emitidaEm}
        />
      )}

      {state.kind === "erro" && (
        <p className="mt-2 max-w-3xl text-xs text-red-400">{state.mensagem}</p>
      )}
    </form>
  );
}
