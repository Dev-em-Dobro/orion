"use client";

import { useActionState } from "react";
import type { KeyMode } from "@prisma/client";
import {
  salvarModoChaveAction,
  type ChaveActionState,
} from "@/actions/configuracao/chaves";
import { LABEL_KEY_MODE } from "@/lib/chaves/modo-labels";

const idle: ChaveActionState = { kind: "idle" };

const OPCOES: { id: KeyMode; descricao: string }[] = [
  {
    id: "orion",
    descricao:
      "Chaves da Orion: Google Places + OpenAI (IA). Sem Gemini. Limites diários de uso.",
  },
  {
    id: "byok",
    descricao:
      "Suas chaves (Google + Anthropic/OpenAI/Gemini). Sem limites diários da Orion; custo na sua conta.",
  },
];

export function ModoChaveForm({ atual }: { atual: KeyMode }) {
  const [state, action, pending] = useActionState(salvarModoChaveAction, idle);

  return (
    <section className="card">
      <h2 className="text-sm font-semibold text-zinc-100">Modo de chaves</h2>
      <p className="mt-1 text-sm text-muted">
        Escolha como o Orion acessa Google Places e IA.
      </p>

      <form action={action} className="mt-4 flex flex-col gap-3">
        <fieldset className="flex flex-col gap-3">
          {OPCOES.map((op) => (
            <label
              key={op.id}
              className="flex cursor-pointer gap-3 rounded-lg border border-zinc-700/60 p-3 has-[:checked]:border-primary/50 has-[:checked]:bg-primary/5"
            >
              <input
                type="radio"
                name="modo"
                value={op.id}
                defaultChecked={op.id === atual}
                className="mt-0.5 accent-primary"
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-zinc-100">
                  {LABEL_KEY_MODE[op.id]}
                </span>
                <span className="text-xs text-zinc-400">{op.descricao}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <button type="submit" disabled={pending} className="btn-primary w-fit">
          {pending ? "Salvando…" : "Salvar modo"}
        </button>
      </form>

      {state.kind === "ok" && (
        <p className="alert-ok mt-4">{state.mensagem}</p>
      )}
      {state.kind === "erro" && (
        <p className="alert-erro mt-4">{state.mensagem}</p>
      )}
    </section>
  );
}
