// F032 — chips de filtro rápido. Server component: são links, e o estado vive
// na URL (AC5 — recarregar e usar o back do navegador preservam o filtro).
// Spec: /specs/02-features/F032-interface-do-orion.md

import Link from "next/link";
import {
  queryDoFiltro,
  SCORE_CHIP,
  temFiltro,
  type FiltroLista,
} from "@/lib/leads/filtros";

type Chip = {
  label: string;
  ativo: boolean;
  /** Filtro resultante ao clicar (chip ativo volta ao estado neutro). */
  destino: FiltroLista;
};

const NEUTRO: FiltroLista = {
  categoria: null,
  site: null,
  scoreMin: null,
  comTelefone: false,
  descartados: false,
};

export function ChipsFiltro({
  filtro,
  descartados,
}: {
  filtro: FiltroLista;
  descartados: number;
}) {
  // Os chips compõem com a categoria escolhida no select — trocar de chip não
  // joga fora o recorte de nicho que o aluno já fez.
  const base: FiltroLista = { ...NEUTRO, categoria: filtro.categoria };

  const chips: Chip[] = [
    {
      label: "Todos",
      ativo: !temFiltro(filtro) && !filtro.descartados,
      destino: base,
    },
    {
      label: "Sem site",
      ativo: filtro.site === "sem_site",
      destino:
        filtro.site === "sem_site" ? base : { ...base, site: "sem_site" },
    },
    {
      label: `Score ${SCORE_CHIP}+`,
      ativo: filtro.scoreMin !== null,
      destino:
        filtro.scoreMin !== null ? base : { ...base, scoreMin: SCORE_CHIP },
    },
    {
      label: "Com telefone",
      ativo: filtro.comTelefone,
      destino: filtro.comTelefone ? base : { ...base, comTelefone: true },
    },
  ];

  if (descartados > 0 || filtro.descartados) {
    chips.push({
      label: `Descartados (${descartados})`,
      ativo: filtro.descartados,
      destino: filtro.descartados ? base : { ...base, descartados: true },
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => {
        const q = queryDoFiltro(chip.destino);
        return (
          <Link
            key={chip.label}
            href={q ? `/leads?${q}` : "/leads"}
            className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
              chip.ativo
                ? "bg-primary text-primary-foreground font-semibold"
                : "border border-border text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
            }`}
          >
            {chip.label}
          </Link>
        );
      })}
    </div>
  );
}
