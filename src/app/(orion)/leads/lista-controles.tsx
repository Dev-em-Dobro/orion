import Link from "next/link";
import { FILTROS_SITE, ROTULO_FILTRO_SITE } from "@/lib/leads/filtroSite";
import { queryDoFiltro, type FiltroLista } from "@/lib/leads/filtros";
import { rotuloCategoria } from "@/lib/nichos/catalogo";

const PAGE_SIZE = 20;

export { PAGE_SIZE };

type FiltrosListaProps = {
  categorias: string[];
  /** O filtro inteiro, não só os dois campos deste form — ver abaixo. */
  filtro: FiltroLista;
};

/**
 * Form GET: categoria + tipo de site, sempre voltando à página 1.
 * Os chips rápidos (F032) vivem ao lado e compõem com este recorte.
 */
export function FiltrosLista({ categorias, filtro }: FiltrosListaProps) {
  // Um form GET manda SÓ os campos que ele tem. Enquanto este form conhecia
  // apenas `categoria` e `site`, submeter aqui apagava silenciosamente o resto
  // do filtro: o aluno clicava no chip "Score 60+", trocava a categoria, e o
  // score sumia sem aviso.
  //
  // Os campos que este form não controla viajam escondidos — e a lista deles
  // sai de `queryDoFiltro`, o MESMO lugar que monta os links. Filtro novo
  // aparece aqui sozinho; não dá pra esquecer de somar.
  const escondidos = new URLSearchParams(
    queryDoFiltro({ ...filtro, categoria: null, site: null }),
  );

  return (
    <form
      method="get"
      action="/leads"
      className="flex flex-wrap items-end gap-3"
    >
      {[...escondidos.entries()].map(([nome, valor]) => (
        <input key={nome} type="hidden" name={nome} value={valor} />
      ))}
      {categorias.length > 0 && (
        <label className="flex min-w-[12rem] flex-col gap-1 text-xs text-zinc-400">
          Categoria
          <select
            name="categoria"
            defaultValue={filtro.categoria ?? ""}
            className="rounded-lg border border-border bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"
          >
            <option value="">Todas as categorias</option>
            {/* `value` continua o `primaryType` cru — é o que o filtro consulta
                no banco. Só o rótulo é traduzido. */}
            {categorias.map((c) => (
              <option key={c} value={c}>
                {rotuloCategoria(c)}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="flex min-w-[10rem] flex-col gap-1 text-xs text-zinc-400">
        Site
        <select
          name="site"
          defaultValue={filtro.site ?? ""}
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
  /** Querystring do filtro atual, sem `page` (vem de `queryDoFiltro`). */
  query: string;
};

export function PaginacaoLeads({
  page,
  totalPages,
  total,
  query,
}: PaginacaoProps) {
  if (total === 0 || totalPages <= 1) return null;

  const href = (p: number) => {
    const params = new URLSearchParams(query);
    if (p > 1) params.set("page", String(p));
    const q = params.toString();
    return q ? `/leads?${q}` : "/leads";
  };

  const prev = page > 1 ? page - 1 : null;
  const next = page < totalPages ? page + 1 : null;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-muted">
        Página {page} de {totalPages}
      </p>
      <div className="flex items-center gap-2">
        {prev ? (
          <Link href={href(prev)} className="btn-ghost">
            Anterior
          </Link>
        ) : (
          <span className="btn-ghost pointer-events-none opacity-40">
            Anterior
          </span>
        )}
        {next ? (
          <Link href={href(next)} className="btn-ghost">
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
