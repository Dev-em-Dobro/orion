"use client";

import { useState } from "react";
import { responderTurnoAction } from "@/actions/simulador/responder";
import { avaliarSimulacaoAction } from "@/actions/simulador/avaliar";
import { MAX_TURNOS } from "@/lib/simulador/constantes";
import type { Cenario, Dificuldade, Turno } from "@/lib/simulador/prompt";
import type { Scorecard } from "@/lib/simulador/avaliar";

type LeadOpcao = {
  id: string;
  nome: string;
  categoria: string;
  dores: string[];
};

const DIFICULDADES: { v: Dificuldade; label: string }[] = [
  { v: "facil", label: "Fácil" },
  { v: "medio", label: "Médio" },
  { v: "dificil", label: "Difícil" },
];

function notaCor(n: number): string {
  if (n <= 4) return "text-red-400";
  if (n <= 7) return "text-amber-400";
  return "text-emerald-400";
}

export function Simulador({ leads }: { leads: LeadOpcao[] }) {
  const [cenario, setCenario] = useState<Cenario | null>(null);
  const [historico, setHistorico] = useState<Turno[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [avaliando, setAvaliando] = useState(false);
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const [origem, setOrigem] = useState<"lead" | "manual">(
    leads.length > 0 ? "lead" : "manual",
  );
  const [leadId, setLeadId] = useState(leads[0]?.id ?? "");
  const [categoria, setCategoria] = useState("");
  const [dificuldade, setDificuldade] = useState<Dificuldade>("medio");

  const turnosAluno = historico.filter((t) => t.papel === "aluno").length;
  const limite = turnosAluno >= MAX_TURNOS;

  function iniciar() {
    setErro(null);
    let c: Cenario;
    if (origem === "lead") {
      const l = leads.find((x) => x.id === leadId);
      if (!l) {
        setErro("Escolha um Lead.");
        return;
      }
      c = { categoria: l.categoria, dores: l.dores, dificuldade };
    } else {
      if (categoria.trim().length < 2) {
        setErro("Informe a categoria do negócio.");
        return;
      }
      c = { categoria: categoria.trim(), dores: [], dificuldade };
    }
    setCenario(c);
    setHistorico([]);
    setScorecard(null);
  }

  async function enviar() {
    const texto = input.trim();
    if (!cenario || !texto || pending || limite) return;
    const novo: Turno[] = [...historico, { papel: "aluno", texto }];
    setHistorico(novo);
    setInput("");
    setPending(true);
    setErro(null);
    const res = await responderTurnoAction({ cenario, historico: novo });
    setPending(false);
    if (!res.ok) {
      setErro(res.erro);
      return;
    }
    setHistorico([...novo, { papel: "dono", texto: res.mensagem }]);
  }

  async function avaliar() {
    if (!cenario || avaliando) return;
    setAvaliando(true);
    setErro(null);
    const res = await avaliarSimulacaoAction({ cenario, historico });
    setAvaliando(false);
    if (!res.ok) {
      setErro(res.erro);
      return;
    }
    setScorecard(res.scorecard);
  }

  function reiniciar() {
    setCenario(null);
    setHistorico([]);
    setScorecard(null);
    setInput("");
    setErro(null);
  }

  // ---- SETUP ----
  if (!cenario) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-zinc-200">Monte o cenário</h2>

        {leads.length > 0 && (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setOrigem("lead")}
              className={`badge ${origem === "lead" ? "bg-primary/20 text-primary" : "bg-zinc-500/15 text-zinc-400"}`}
            >
              A partir de um Lead
            </button>
            <button
              type="button"
              onClick={() => setOrigem("manual")}
              className={`badge ${origem === "manual" ? "bg-primary/20 text-primary" : "bg-zinc-500/15 text-zinc-400"}`}
            >
              Categoria manual
            </button>
          </div>
        )}

        {origem === "lead" && leads.length > 0 ? (
          <label className="mt-4 block">
            <span className="text-xs text-zinc-400">Lead</span>
            <select
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-zinc-900/70 p-2 text-sm text-zinc-200"
            >
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome} · {l.categoria}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="mt-4 block">
            <span className="text-xs text-zinc-400">Categoria do negócio</span>
            <input
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              placeholder="ex.: dentist, restaurant, advogado…"
              className="mt-1 w-full rounded-lg border border-border bg-zinc-900/70 p-2 text-sm text-zinc-200 placeholder:text-zinc-500"
            />
          </label>
        )}

        <div className="mt-4">
          <span className="text-xs text-zinc-400">Dificuldade</span>
          <div className="mt-1 flex gap-2">
            {DIFICULDADES.map((d) => (
              <button
                key={d.v}
                type="button"
                onClick={() => setDificuldade(d.v)}
                className={`badge ${dificuldade === d.v ? "bg-primary/20 text-primary" : "bg-zinc-500/15 text-zinc-400"}`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={iniciar}
          className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          Iniciar treino
        </button>

        {erro && <p className="mt-2 text-xs text-red-400">{erro}</p>}
      </div>
    );
  }

  // ---- SCORECARD ----
  if (scorecard) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">Scorecard</h2>
          <span
            className={`font-mono text-2xl font-bold ${notaCor(scorecard.nota_geral)}`}
          >
            {scorecard.nota_geral}
            <span className="text-sm text-zinc-500">/10</span>
          </span>
        </div>

        <ul className="mt-4 space-y-3">
          {scorecard.competencias.map((c, i) => (
            <li key={i} className="border-b border-border/60 pb-3 last:border-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-200">
                  {c.nome}
                </span>
                <span
                  className={`font-mono text-sm font-semibold ${notaCor(c.nota)}`}
                >
                  {c.nota}/10
                </span>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
                {c.comentario}
              </p>
            </li>
          ))}
        </ul>

        {scorecard.pontos_fortes.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
              Pontos fortes
            </p>
            <ul className="mt-1 space-y-0.5">
              {scorecard.pontos_fortes.map((p, i) => (
                <li key={i} className="text-xs text-emerald-400">
                  + {p}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4">
          <p className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
            O que melhorar
          </p>
          <ul className="mt-1 space-y-0.5">
            {scorecard.o_que_melhorar.map((p, i) => (
              <li key={i} className="text-xs text-amber-300">
                → {p}
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          onClick={reiniciar}
          className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          Treinar de novo
        </button>
      </div>
    );
  }

  // ---- CHAT ----
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs text-zinc-400">
          Cliente: <span className="text-zinc-200">{cenario.categoria}</span> ·{" "}
          {cenario.dificuldade}
        </div>
        <button type="button" onClick={reiniciar} className="btn-ghost">
          Recomeçar
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {historico.length === 0 && (
          <p className="text-sm text-muted">
            Mande a primeira mensagem como se estivesse abordando o cliente no
            WhatsApp.
          </p>
        )}
        {historico.map((t, i) => (
          <div
            key={i}
            className={t.papel === "aluno" ? "text-right" : "text-left"}
          >
            <span
              className={`inline-block max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                t.papel === "aluno"
                  ? "bg-primary/20 text-zinc-100"
                  : "bg-zinc-800/70 text-zinc-200"
              }`}
            >
              {t.texto}
            </span>
          </div>
        ))}
        {pending && (
          <div className="text-left">
            <span className="inline-block rounded-2xl bg-zinc-800/70 px-3 py-2 text-sm text-zinc-500">
              digitando…
            </span>
          </div>
        )}
      </div>

      {limite && (
        <p className="mt-3 text-xs text-amber-300">
          Chegou no limite de {MAX_TURNOS} rodadas — encerre e avalie.
        </p>
      )}

      <div className="mt-4 flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void enviar();
            }
          }}
          rows={2}
          disabled={pending || limite}
          placeholder="Sua mensagem…"
          className="flex-1 rounded-lg border border-border bg-zinc-900/70 p-2 text-sm text-zinc-200 placeholder:text-zinc-500 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => void enviar()}
          disabled={pending || limite || !input.trim()}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          Enviar
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-zinc-500">
          {turnosAluno} / {MAX_TURNOS} rodadas
        </span>
        <button
          type="button"
          onClick={() => void avaliar()}
          disabled={avaliando || turnosAluno < 2}
          className="btn-ghost disabled:opacity-50"
        >
          {avaliando ? "Avaliando..." : "Encerrar e avaliar"}
        </button>
      </div>

      {erro && <p className="mt-2 text-xs text-red-400">{erro}</p>}
    </div>
  );
}
