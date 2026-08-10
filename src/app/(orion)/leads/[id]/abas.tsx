// F032 — abas do detalhe do Lead. Estado na URL (`?aba=`), sem client state.
// Spec: /specs/02-features/F032-interface-do-orion.md

import Link from "next/link";

export const ABAS = [
  { id: "diagnostico", label: "Diagnóstico" },
  { id: "abordagem", label: "Abordagem" },
  { id: "objecoes", label: "Objeções" },
  { id: "proposta", label: "Proposta" },
] as const;

export type AbaId = (typeof ABAS)[number]["id"];

export function parseAba(raw: string | undefined): AbaId {
  const encontrada = ABAS.find((a) => a.id === raw);
  return encontrada?.id ?? "diagnostico";
}

export function Abas({
  leadId,
  atual,
  query,
}: {
  leadId: string;
  atual: AbaId;
  /** Querystring do filtro de origem, preservada ao trocar de aba. */
  query: string;
}) {
  const href = (aba: AbaId) => {
    const params = new URLSearchParams(query);
    params.set("aba", aba);
    return `/leads/${leadId}?${params.toString()}`;
  };

  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto border-b border-border">
      {ABAS.map((aba) => {
        const ativa = aba.id === atual;
        return (
          <Link
            key={aba.id}
            href={href(aba.id)}
            aria-current={ativa ? "page" : undefined}
            className={`shrink-0 border-b-2 px-4 py-2.5 text-sm transition-colors ${
              ativa
                ? "border-primary font-medium text-zinc-100"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {aba.label}
          </Link>
        );
      })}
    </nav>
  );
}
