"use client";

// Seletor de tema da interface. Piloto de 2026-08-13.

import { useActionState } from "react";
import {
  salvarTemaAction,
  type TemaActionState,
} from "@/actions/configuracao/tema";
import { LABEL_TEMA, TEMAS, type Tema } from "@/lib/tema";

const idle: TemaActionState = { kind: "idle" };

const DESCRICAO: Record<Tema, string> = {
  escuro: "O tema atual do Orion — fundo quase preto, cards elevados.",
  claro: "Fundo claro e cards brancos, com o verde da marca nos destaques.",
};

export function TemaForm({ atual }: { atual: Tema }) {
  const [state, action, pending] = useActionState(salvarTemaAction, idle);

  return (
    <section className="card">
      <h2 className="text-sm font-semibold text-zinc-100">Tema da interface</h2>
      {/*
        O tema subiu pro app shell em 2026-08-14 e passou a valer em todas as
        telas. Este aviso ainda dizia "só na tela de Leads" — quem lia não
        trocava, achando que ia ficar pela metade.
      */}
      <p className="mt-1 text-sm text-muted">
        Vale em todas as telas. A escolha fica salva na sua conta.
      </p>

      <form action={action} className="mt-4 flex flex-col gap-3">
        <fieldset className="flex flex-col gap-3">
          {TEMAS.map((t) => (
            <label
              key={t}
              className="flex cursor-pointer gap-3 rounded-lg border border-zinc-700/60 p-3 has-[:checked]:border-primary/50 has-[:checked]:bg-primary/5"
            >
              <input
                type="radio"
                name="tema"
                value={t}
                defaultChecked={t === atual}
                className="mt-0.5 accent-primary"
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-zinc-100">
                  {LABEL_TEMA[t]}
                </span>
                <span className="text-xs text-zinc-400">{DESCRICAO[t]}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <button type="submit" disabled={pending} className="btn-primary w-fit">
          {pending ? "Aplicando…" : "Aplicar tema"}
        </button>
      </form>

      {state.kind === "ok" && <p className="alert-ok mt-4">{state.mensagem}</p>}
      {state.kind === "erro" && (
        <p className="alert-erro mt-4">{state.mensagem}</p>
      )}
    </section>
  );
}
