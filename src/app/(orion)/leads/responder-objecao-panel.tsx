"use client";

// F011 (emenda 2026-08-13) — a aba abre com o catálogo curado, não com um
// textarea vazio. Spec: /specs/02-features/F011-assistente-de-objecoes.md
//
// A IA não saiu: virou "Outra objeção", recolhida, pra o que o catálogo não
// cobre. O que mudou foi a ordem — catálogo primeiro porque é instantâneo, não
// gasta cota e é o mesmo repertório pra turma toda.

import { useActionState, useState } from "react";
import {
  responderObjecaoAction,
  type ResponderObjecaoState,
} from "@/actions/leads/responderObjecao";
import {
  OBJECOES_COMUNS,
  personalizar,
  type ObjecaoComum,
} from "@/lib/objecoes/catalogo";

const initial: ResponderObjecaoState = { kind: "idle" };

function BotaoCopiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  }

  return (
    <button type="button" onClick={() => void copiar()} className="btn-ghost">
      {copiado ? "Copiado" : "Copiar"}
    </button>
  );
}

function CardObjecao({
  objecao,
  aberta,
  aoAlternar,
  dados,
}: {
  objecao: ObjecaoComum;
  aberta: boolean;
  aoAlternar: () => void;
  dados: { negocio?: string | null; categoria?: string | null };
}) {
  return (
    <li className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={aoAlternar}
        aria-expanded={aberta}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-800/40"
      >
        <span className="text-sm font-medium text-zinc-100">
          “{objecao.rotulo}”
        </span>
        <span
          aria-hidden
          className={`shrink-0 text-zinc-500 transition-transform ${
            aberta ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>

      {aberta && (
        <div className="border-t border-border px-4 py-3">
          <p className="text-xs leading-relaxed text-zinc-400">
            <span className="font-semibold text-zinc-300">
              O que está por trás:
            </span>{" "}
            {objecao.porQue}
          </p>

          <div className="mt-3 rounded-lg border border-primary/30 bg-primary/[0.07] px-3 py-2">
            <p className="text-[10px] font-semibold tracking-wide text-zinc-400 uppercase">
              Pergunta que vira o jogo
            </p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-200">
              {personalizar(objecao.perguntaChave, dados)}
            </p>
          </div>

          <ul className="mt-3 space-y-2">
            {objecao.respostas.map((r, i) => {
              const texto = personalizar(r.texto, dados);
              return (
                <li
                  key={i}
                  className="rounded-lg border border-border bg-zinc-900/70 p-3"
                >
                  <span className="badge bg-sky-500/15 text-sky-300">
                    {r.tatica}
                  </span>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-200">
                    {texto}
                  </p>
                  <div className="mt-1.5">
                    {/* Copia o texto JÁ personalizado — o que o aluno vê é o
                        que ele cola (AC13). */}
                    <BotaoCopiar texto={texto} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </li>
  );
}

export function ResponderObjecaoPanel({
  leadId,
  nomeDoLead,
  categoria,
}: {
  leadId: string;
  nomeDoLead?: string | null;
  categoria?: string | null;
}) {
  const [state, action, pending] = useActionState(
    responderObjecaoAction,
    initial,
  );
  const [abertaId, setAbertaId] = useState<string | null>(
    OBJECOES_COMUNS[0]?.id ?? null,
  );
  const [mostrarIa, setMostrarIa] = useState(false);
  const [copiado, setCopiado] = useState<number | null>(null);

  const dados = { negocio: nomeDoLead, categoria };

  async function copiar(texto: string, i: number) {
    await navigator.clipboard.writeText(texto);
    setCopiado(i);
    setTimeout(() => setCopiado(null), 1500);
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-zinc-300">
          O que ele respondeu? Clique na objeção pra ver o que está por trás e o
          que responder.
        </p>
      </div>

      <ul className="space-y-2">
        {OBJECOES_COMUNS.map((o) => (
          <CardObjecao
            key={o.id}
            objecao={o}
            aberta={abertaId === o.id}
            aoAlternar={() => setAbertaId(abertaId === o.id ? null : o.id)}
            dados={dados}
          />
        ))}
      </ul>

      {/* Saída de escape: o que o catálogo não cobre continua indo pra IA. */}
      <div className="rounded-xl border border-border bg-card p-4">
        <button
          type="button"
          onClick={() => setMostrarIa((v) => !v)}
          aria-expanded={mostrarIa}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span>
            <span className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
              Outra objeção
            </span>
            <span className="mt-0.5 block text-xs text-zinc-500">
              Ele disse algo fora da lista? A IA responde usando a Dor deste
              Lead.
            </span>
          </span>
          <span
            aria-hidden
            className={`shrink-0 text-zinc-500 transition-transform ${
              mostrarIa ? "rotate-180" : ""
            }`}
          >
            ▾
          </span>
        </button>

        {mostrarIa && (
          <form action={action} className="mt-3">
            <input type="hidden" name="lead_id" value={leadId} />
            <textarea
              name="mensagem_do_lead"
              rows={3}
              placeholder="Cole aqui o que o Lead respondeu…"
              className="w-full rounded-lg border border-border bg-zinc-900/70 p-2 text-xs text-zinc-200 placeholder:text-zinc-500"
            />
            <button type="submit" disabled={pending} className="btn-ghost mt-2">
              {pending ? "Pensando..." : "Sugerir respostas"}
            </button>

            {state.kind === "ok" && (
              <ul className="mt-3 space-y-2">
                {state.respostas.map((r, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-border bg-zinc-900/70 p-3"
                  >
                    <span className="badge bg-sky-500/15 text-sky-300">
                      {r.abordagem}
                    </span>
                    <p className="mt-1.5 text-xs leading-relaxed text-zinc-200">
                      {r.texto}
                    </p>
                    <button
                      type="button"
                      onClick={() => void copiar(r.texto, i)}
                      className="btn-ghost mt-1.5"
                    >
                      {copiado === i ? "Copiado" : "Copiar"}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {state.kind === "erro" && (
              <p className="mt-2 text-xs text-red-400">{state.mensagem}</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
