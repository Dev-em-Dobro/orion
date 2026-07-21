import Link from "next/link";

type Props = {
  titulo: string;
  descricao: string;
  acao?: { href: string; label: string };
  secundaria?: { href: string; label: string };
};

/** Empty state compacto pra beta (F016 onboarding). */
export function EmptyState({ titulo, descricao, acao, secundaria }: Props) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-zinc-900/40 px-6 py-10 text-center">
      <h2 className="text-base font-semibold text-zinc-100">{titulo}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{descricao}</p>
      {(acao || secundaria) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {acao ? (
            <Link href={acao.href} className="btn-primary">
              {acao.label}
            </Link>
          ) : null}
          {secundaria ? (
            <Link href={secundaria.href} className="btn-ghost px-3 py-2 text-sm">
              {secundaria.label}
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}
