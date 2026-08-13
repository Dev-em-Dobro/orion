"use client";

// F037 — aceite de aparecer no Ranking de Builders.

import { useActionState, useState } from "react";
import {
  salvarPerfilPublicoAction,
  type PerfilPublicoState,
} from "@/actions/configuracao/perfil-publico";

const idle: PerfilPublicoState = { kind: "idle" };

export function PerfilPublicoForm({
  optinAtual,
  nomeAtual,
}: {
  optinAtual: boolean;
  nomeAtual: string;
}) {
  const [state, action, pending] = useActionState(
    salvarPerfilPublicoAction,
    idle,
  );
  const [optin, setOptin] = useState(optinAtual);

  return (
    <section className="card">
      <h2 className="text-sm font-semibold text-zinc-100">
        Ranking de Builders
      </h2>
      <p className="mt-1 text-sm text-muted">
        Todo mês, os 3 Builders com mais vendas registradas ganham prêmio. Entrar
        é opcional — e você pode sair quando quiser.
      </p>

      <form action={action} className="mt-4 flex flex-col gap-3">
        <label className="flex cursor-pointer gap-3 rounded-lg border border-zinc-700/60 p-3 has-[:checked]:border-primary/50 has-[:checked]:bg-primary/5">
          <input
            type="checkbox"
            name="optin"
            value="true"
            checked={optin}
            onChange={(e) => setOptin(e.target.checked)}
            className="check-orion mt-0.5"
          />
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-zinc-100">
              Quero aparecer no ranking
            </span>
            <span className="text-xs text-zinc-400">
              Os outros alunos passam a ver o seu nome de exibição e o número de
              vendas do mês. Nada mais: nenhum Lead, cliente, cidade ou valor.
            </span>
          </span>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-400">Nome de exibição</span>
          <input
            name="nome"
            defaultValue={nomeAtual}
            maxLength={40}
            required
            className="input-base max-w-xs"
          />
          <span className="text-xs text-zinc-500">
            É o que os outros veem. Não use e-mail.
          </span>
        </label>

        <button type="submit" disabled={pending} className="btn-primary w-fit">
          {pending ? "Salvando…" : "Salvar"}
        </button>
      </form>

      {state.kind === "ok" && <p className="alert-ok mt-4">{state.mensagem}</p>}
      {state.kind === "erro" && (
        <p className="alert-erro mt-4">{state.mensagem}</p>
      )}
    </section>
  );
}
