// F031 — lista de cobranças, agrupada por atraso.
// Spec: /specs/02-features/F031-central-de-tarefas.md

import Link from "next/link";
import type { Tarefa } from "@/lib/tarefas/calcular";
import {
  EXPLICACAO,
  ROTULO_FAIXA,
  TITULO,
  type FaixaUrgencia,
} from "@/lib/tarefas/regras";
import { AprofundarButton } from "../leads/aprofundar-button";
import { GerarAbordagemButton } from "../leads/gerar-abordagem-button";
import { TarefaAcoes } from "./tarefa-acoes";

const ORDEM_FAIXA: FaixaUrgencia[] = ["atrasada", "vencida", "hoje"];

const COR_FAIXA: Record<FaixaUrgencia, string> = {
  atrasada: "bg-red-500/15 text-red-300",
  vencida: "bg-amber-500/15 text-amber-300",
  hoje: "bg-zinc-500/15 text-zinc-400",
};

function haQuanto(marco: Date): string {
  const horas = Math.floor((Date.now() - marco.getTime()) / 3_600_000);
  if (horas < 24) return `há ${horas}h`;
  return `há ${Math.floor(horas / 24)}d`;
}

function ItemTarefa({ tarefa }: { tarefa: Tarefa }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-100">
          {TITULO[tarefa.tipo]}
          {tarefa.leadNome && (
            <>
              {" — "}
              <Link
                href={`/leads/${tarefa.leadId}?aba=abordagem`}
                className="text-primary hover:underline"
              >
                {tarefa.leadNome}
              </Link>
            </>
          )}
          {tarefa.quantidade ? ` (${tarefa.quantidade})` : ""}
        </p>
        {/* A regra sempre visível: cobrança sem explicação parece arbitrária. */}
        <p className="mt-0.5 text-xs text-muted">
          {EXPLICACAO[tarefa.tipo]} · {haQuanto(tarefa.marco)}
        </p>
      </div>

      {/* F031 — a ação resolve na própria linha quando dá. `MANDAR_FOLLOWUP`
          gera o follow-up aqui, como o painel que saiu da `/leads` fazia; o
          resto pede decisão do aluno e continua indo pro detalhe do Lead. */}
      <div className="flex flex-wrap items-center gap-2">
        {tarefa.tipo === "APROFUNDAR_FILA" ? (
          <AprofundarButton rotulo="Aprofundar próximos 10" />
        ) : tarefa.tipo === "MANDAR_FOLLOWUP" && tarefa.leadId ? (
          <GerarAbordagemButton leadId={tarefa.leadId} tipo="followup" />
        ) : (
          // F032 (revisão b) — a mesma ação tem o mesmo peso aqui e na home:
          // sólida. O `⋯` ao lado continua fantasma, e é isso que separa
          // primária de secundária na linha.
          <Link
            href={`/leads/${tarefa.leadId}?aba=abordagem`}
            className="btn-card"
          >
            Resolver
          </Link>
        )}
        <TarefaAcoes
          tipo={tarefa.tipo}
          leadId={tarefa.leadId}
          marco={tarefa.marco.toISOString()}
        />
      </div>
    </li>
  );
}

export function ListaTarefas({ tarefas }: { tarefas: Tarefa[] }) {
  return (
    <div className="space-y-6">
      {ORDEM_FAIXA.map((faixa) => {
        const doGrupo = tarefas.filter((t) => t.faixa === faixa);
        if (doGrupo.length === 0) return null;
        return (
          <section key={faixa}>
            <p className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
              <span className={`badge ${COR_FAIXA[faixa]}`}>
                {ROTULO_FAIXA[faixa]}
              </span>
              <span className="text-muted">{doGrupo.length}</span>
            </p>
            <ul className="mt-2 space-y-2">
              {doGrupo.map((t) => (
                <ItemTarefa key={`${t.tipo}-${t.leadId ?? "geral"}`} tarefa={t} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
