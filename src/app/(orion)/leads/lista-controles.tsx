import Link from "next/link";
import {
  FILTROS_SITE,
  ROTULO_FILTRO_SITE,
  type FiltroSite,
} from "@/lib/leads/filtroSite";

const PAGE_SIZE = 20;

export { PAGE_SIZE };

export type QueryLista = {
  categoria?: string | null;
  site?: FiltroSite | null;
  page: number;
};

function hrefLista(opts: QueryLista): string {
  const params = new URLSearchParams();
  if (opts.categoria) params.set("categoria", opts.categoria);
  if (opts.site) params.set("site", opts.site);
  if (opts.page > 1) params.set("page", String(opts.page));
  const q = params.toString();
  return q ? `/leads?${q}` : "/leads";
}

type FiltrosListaProps = {
  categorias: string[];
  categoriaAtual: string | null;
  siteAtual: FiltroSite | null;
};

/** Form GET: filtros + volta para a página 1. */
export function FiltrosLista({
  categorias,
  categoriaAtual,
  siteAtual,
}: FiltrosListaProps) {
  return (
    <form
      method="get"
      action="/leads"
      className="flex flex-wrap items-end gap-3"
    >
      {categorias.length > 0 && (
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs text-zinc-400">
          Categoria
          <select
            name="categoria"
            defaultValue={categoriaAtual ?? ""}
            className="rounded-lg border border-border bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"
          >
            <option value="">Todas as categorias</option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="flex min-w-[10rem] flex-col gap-1 text-xs text-zinc-400">
        Site
        <select
          name="site"
          defaultValue={siteAtual ?? ""}
          className="rounded-lg border border-border bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"
        >
          <option value="">Todos</option>
          {FILTROS_SITE.map((v) => (
            <option key={v} value={v}>
              {ROTULO_FILTRO_SITE[v]}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="btn-ghost">
        Filtrar
      </button>
    </form>
  );
}

type PaginacaoProps = {
  page: number;
  totalPages: number;
  total: number;
  categoria: string | null;
  site: FiltroSite | null;
};

export function PaginacaoLeads({
  page,
  totalPages,
  total,
  categoria,
  site,
}: PaginacaoProps) {
  if (total === 0 || totalPages <= 1) return null;

  const prev = page > 1 ? page - 1 : null;
  const next = page < totalPages ? page + 1 : null;
  const base = {
    categoria: categoria ?? undefined,
    site: site ?? undefined,
  };

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-muted">
        Página {page} de {totalPages}
      </p>
      <div className="flex items-center gap-2">
        {prev ? (
          <Link
            href={hrefLista({ ...base, page: prev })}
            className="btn-ghost"
          >
            Anterior
          </Link>
        ) : (
          <span className="btn-ghost pointer-events-none opacity-40">
            Anterior
          </span>
        )}
        {next ? (
          <Link
            href={hrefLista({ ...base, page: next })}
            className="btn-ghost"
          >
            Próxima
          </Link>
        ) : (
          <span className="btn-ghost pointer-events-none opacity-40">
            Próxima
          </span>
        )}
      </div>
    </div>
  );
}
