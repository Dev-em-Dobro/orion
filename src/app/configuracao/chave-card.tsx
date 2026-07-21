"use client";

import { useActionState, useEffect, useState } from "react";
import {
  removerChaveAction,
  salvarChaveAction,
  testarChaveAction,
  type ChaveActionState,
} from "@/actions/configuracao/chaves";
import type { VisaoChave } from "@/lib/chaves";

const idle: ChaveActionState = { kind: "idle" };

function StatusBadge({ status }: { status: VisaoChave["status"] }) {
  if (status === "configurada") {
    return (
      <span className="badge bg-emerald-500/15 text-emerald-300">
        configurada ✓
      </span>
    );
  }
  if (status === "invalida") {
    return (
      <span className="badge bg-red-500/15 text-red-300">inválida ✗</span>
    );
  }
  return (
    <span className="badge bg-zinc-500/15 text-zinc-400">faltando —</span>
  );
}

export function ChaveCard({ inicial }: { inicial: VisaoChave }) {
  const [visao, setVisao] = useState(inicial);
  const [valor, setValor] = useState("");
  const [salvarState, salvarAction, salvando] = useActionState(
    salvarChaveAction,
    idle,
  );
  const [removerState, removerAction, removendo] = useActionState(
    removerChaveAction,
    idle,
  );
  const [testarState, testarAction, testando] = useActionState(
    testarChaveAction,
    idle,
  );

  useEffect(() => {
    setVisao(inicial);
  }, [inicial]);

  useEffect(() => {
    if (salvarState.kind === "ok" && salvarState.visao) {
      setVisao(salvarState.visao);
      setValor("");
    }
  }, [salvarState]);

  useEffect(() => {
    if (removerState.kind === "ok" && removerState.visao) {
      setVisao(removerState.visao);
      setValor("");
    }
  }, [removerState]);

  useEffect(() => {
    if (
      (testarState.kind === "ok" || testarState.kind === "erro") &&
      testarState.visao
    ) {
      setVisao(testarState.visao);
    }
  }, [testarState]);

  const feedback =
    (salvarState.kind !== "idle" && salvarState) ||
    (removerState.kind !== "idle" && removerState) ||
    (testarState.kind !== "idle" && testarState) ||
    null;

  const pending = salvando || removendo || testando;
  const temChave = visao.status !== "faltando";

  return (
    <section className="card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">{visao.label}</h2>
          <p className="mt-1 font-mono text-xs text-zinc-500">
            {visao.mascara ?? "nenhuma chave salva"}
          </p>
        </div>
        <StatusBadge status={visao.status} />
      </div>

      <form action={salvarAction} className="mt-4 flex flex-col gap-3">
        <input type="hidden" name="tipo" value={visao.tipo} />
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-300">
            {temChave ? "Substituir chave" : "Colar chave"}
          </span>
          <input
            name="valor"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder={temChave ? "•••• nova chave" : "sk-… / AIza…"}
            className="input-base font-mono"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={pending || valor.trim().length < 8}
            className="btn-primary"
          >
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        <form action={testarAction}>
          <input type="hidden" name="tipo" value={visao.tipo} />
          <button
            type="submit"
            disabled={pending || !temChave}
            className="btn-ghost"
          >
            {testando ? "Testando…" : "Testar chave"}
          </button>
        </form>
        <form action={removerAction}>
          <input type="hidden" name="tipo" value={visao.tipo} />
          <button
            type="submit"
            disabled={pending || !temChave}
            className="btn-ghost text-red-300 hover:text-red-200"
          >
            {removendo ? "Removendo…" : "Remover"}
          </button>
        </form>
      </div>

      {feedback && feedback.kind === "ok" && (
        <p className="alert-ok mt-4">{feedback.mensagem}</p>
      )}
      {feedback && feedback.kind === "erro" && (
        <p className="alert-erro mt-4">{feedback.mensagem}</p>
      )}
    </section>
  );
}
