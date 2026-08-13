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
        /* O alvo era de 16px — menos da metade do mínimo de 44px, e num
           elemento que só se explica ao ser tocado. A caixa cresce pra ~32px
           com padding transparente; o círculo visível continua pequeno. */
        className="-m-2 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full p-2 text-zinc-400 transition-colors duration-200 hover:text-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-current text-[10px] font-semibold leading-none">
          ?
        </span>
      </button>
      <span
        role="tooltip"
        className={`invisible absolute z-50 w-64 rounded-lg border border-border bg-zinc-900 p-3 text-left text-xs normal-case tracking-normal leading-relaxed font-normal text-zinc-300 shadow-lg group-focus-within:visible group-hover:visible ${POSICAO[colocacao]}`}
      >
        {(foco === "score" || foco === "completo") && (
          <span className="block">
            {/* F025 — o texto antigo mandava "Diagnosticar e Priorizar". Os
                dois botões saíram: o aprofundamento faz as duas coisas. */}
            <strong className="text-zinc-100">Score</strong> — prioridade do
            Lead (0–100). Combina Valor e Necessidade. Sai{" "}
            <strong className="text-zinc-100">estimado</strong> na busca (com{" "}
            <strong className="text-zinc-100">~</strong> no card) e vira{" "}
            <strong className="text-zinc-100">confirmado</strong> sozinho quando
            o Orion aprofunda o Lead. Aí o <strong className="text-zinc-100">~</strong>{" "}
            dá lugar a Alto / Médio / Baixo — que são faixas{" "}
            <strong className="text-zinc-100">do próprio score</strong>. O tier
            do nicho é outra coisa, e aparece ao lado da categoria.
          </span>
        )}
        {(foco === "valor" || foco === "completo") && (
          <span className={`block ${foco === "completo" ? "mt-2" : ""}`}>
            <strong className="text-zinc-100">Valor</strong> — o quanto vale
            abordar: tier da categoria + porte pelo nº de avaliações no Google.
            Sai pronto da busca, sem custo e sem Diagnóstico.
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
