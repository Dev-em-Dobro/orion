"use client";

import { useActionState } from "react";
import {
  salvarProviderLlmAction,
  type ChaveActionState,
} from "@/actions/configuracao/chaves";

const idle: ChaveActionState = { kind: "idle" };

const OPCOES = [
  { id: "anthropic" as const, label: "Anthropic", padrao: true },
  { id: "openai" as const, label: "OpenAI", padrao: false },
  { id: "gemini" as const, label: "Gemini", padrao: false },
];

export function ProviderLlmForm({
  atual,
}: {
  atual: "anthropic" | "openai" | "gemini";
}) {
  const [state, action, pending] = useActionState(
    salvarProviderLlmAction,
    idle,
  );

  return (
    <section className="card">
      <h2 className="text-sm font-semibold text-zinc-100">
        Provedor de IA ativo
      </h2>
      <p className="mt-1 text-sm text-muted">
        Outreach, conteúdo, proposta, objeções, treino e Diagnóstico UX usam
        este provedor (com a chave correspondente abaixo).
      </p>

      <form action={action} className="mt-4 flex flex-col gap-3">
        <fieldset className="flex flex-col gap-2">
          {OPCOES.map((p) => (
            <label
              key={p.id}
              className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300"
            >
              <input
                type="radio"
                name="provider"
                value={p.id}
                defaultChecked={p.id === atual}
                className="accent-primary"
              />
              {p.label}
              {p.padrao ? (
                <span className="text-xs text-zinc-500">(padrão)</span>
              ) : null}
            </label>
          ))}
        </fieldset>
        <button type="submit" disabled={pending} className="btn-primary w-fit">
          {pending ? "Salvando…" : "Salvar provedor"}
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
