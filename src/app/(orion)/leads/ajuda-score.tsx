"use client";

// F003 — tooltips de Score / Valor / Necessidade (lista + detalhes).

type Colocacao = "abaixo-direita" | "abaixo-esquerda" | "acima-esquerda";

const POSICAO: Record<Colocacao, string> = {
  "abaixo-direita": "top-5 right-0",
  "abaixo-esquerda": "top-5 left-0",
  "acima-esquerda": "bottom-5 left-0",
};

type AjudaScoreProps = {
  /** Foco do tooltip: score geral, só valor, ou os três. */
  foco?: "score" | "valor" | "completo";
  colocacao?: Colocacao;
};

export function AjudaScore({
  foco = "completo",
  colocacao = "abaixo-direita",
}: AjudaScoreProps) {
  const aria =
    foco === "valor"
      ? "O que é Valor do Lead?"
      : foco === "score"
        ? "O que é o Score?"
        : "O que significam Score, Valor e Necessidade?";

  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label={aria}
        className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-zinc-600 text-[10px] font-semibold leading-none text-zinc-400 transition-colors duration-200 hover:border-zinc-400 hover:text-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        ?
      </button>
      <span
        role="tooltip"
        className={`invisible absolute z-50 w-64 rounded-lg border border-border bg-zinc-900 p-3 text-left text-xs normal-case tracking-normal leading-relaxed font-normal text-zinc-300 shadow-lg group-focus-within:visible group-hover:visible ${POSICAO[colocacao]}`}
      >
        {(foco === "score" || foco === "completo") && (
          <span className="block">
            <strong className="text-zinc-100">Score</strong> — prioridade do
            Lead (0–100). Combina Valor e Necessidade. Fica{" "}
            <strong className="text-zinc-100">0</strong> até você{" "}
            <strong className="text-zinc-100">Diagnosticar</strong> e{" "}
            <strong className="text-zinc-100">Priorizar</strong>. O rótulo ao
            lado (ALTO/MÉDIO/BAIXO) é o tier do nicho, não o score.
          </span>
        )}
        {(foco === "valor" || foco === "completo") && (
          <span className={`block ${foco === "completo" ? "mt-2" : ""}`}>
            <strong className="text-zinc-100">Valor</strong> — o quanto vale
            abordar: tier da categoria + porte pelo nº de avaliações no Google
            (calculado na hora; não exige Priorizar).
          </span>
        )}
        {foco === "completo" && (
          <span className="mt-2 block">
            <strong className="text-zinc-100">Necessidade</strong> — o quanto
            precisa de dev, segundo o Diagnóstico (sem site, site lento, sem
            HTTPS…).
          </span>
        )}
      </span>
    </span>
  );
}
