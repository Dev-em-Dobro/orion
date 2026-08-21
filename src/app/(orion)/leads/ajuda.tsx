// Tooltip genérico de "?" — a casca visual extraída do `AjudaScore` (F003),
// que continua existindo com o conteúdo próprio dele.
//
// Sem "use client": só CSS (`group-hover` / `group-focus-within`), nenhum
// estado. Serve tanto de server component quanto de filho de client component.

type Colocacao = "abaixo-direita" | "abaixo-esquerda" | "acima-esquerda";

const POSICAO: Record<Colocacao, string> = {
  "abaixo-direita": "top-5 right-0",
  "abaixo-esquerda": "top-5 left-0",
  "acima-esquerda": "bottom-5 left-0",
};

export function Ajuda({
  rotulo,
  simbolo = "?",
  colocacao = "abaixo-esquerda",
  children,
}: {
  /** `aria-label` do botão — descreve a dúvida que o tooltip responde. */
  rotulo: string;
  /** `?` para dúvida; `i` para explicar o que uma ação faz antes do clique. */
  simbolo?: "?" | "i";
  colocacao?: Colocacao;
  children: React.ReactNode;
}) {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label={rotulo}
        /* O alvo cresce pra ~32px com padding transparente — 16px é menos da
           metade do mínimo de 44px, e num elemento que só se explica ao ser
           tocado. O círculo visível continua pequeno. */
        className="-m-2 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full p-2 text-muted transition-colors duration-200 hover:text-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-current text-[10px] leading-none font-semibold">
          {simbolo}
        </span>
      </button>
      <span
        role="tooltip"
        className={`invisible absolute z-50 w-72 rounded-lg border border-border bg-zinc-900 p-3 text-left text-xs leading-relaxed font-normal tracking-normal normal-case text-zinc-300 shadow-lg group-focus-within:visible group-hover:visible ${POSICAO[colocacao]}`}
      >
        {children}
      </span>
    </span>
  );
}
