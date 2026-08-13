"use client";

// F032 — chips de filtro rápido. O estado vive na URL (AC5 — recarregar e usar
// o back do navegador preservam o filtro).
// Spec: /specs/02-features/F032-interface-do-orion.md
//
// Client component desde 2026-08-13: eram `<Link>` puros e o clique não dava
// sinal nenhum enquanto o servidor refazia a lista. Agora navegam por
// `useTransition`, que é o mesmo padrão do `NavLink` da sidebar — o chip
// clicado mostra spinner e a barra inteira baixa a opacidade.

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ROTULO_ESTAGIO } from "@/lib/funil";
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
  semAtendimento: false,
  estagio: null,
  descartados: false,
};

function Spinner() {
  return (
    <span
      className="inline-block h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden
    />
  );
}

export function ChipsFiltro({
  filtro,
  descartados,
}: {
  filtro: FiltroLista;
  descartados: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Qual chip disparou: sem isso o spinner apareceria em todos ao mesmo tempo.
  const [clicado, setClicado] = useState<string | null>(null);

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
    // F026 — o chip "WhatsApp no braço" saiu do enxugamento de 2026-08-13.
    // O filtro em si continua de pé (`?atendimento=` na URL, `whereFiltroLista`)
    // e o badge segue no card; só não disputa espaço na barra.
  ];

  // Estágio vem do clique no funil do Dashboard. Aparece como chip ativo pra
  // existir um caminho de volta: sem isso o recorte fica preso na URL.
  if (filtro.estagio) {
    chips.push({
      label: ROTULO_ESTAGIO[filtro.estagio],
      ativo: true,
      destino: base,
    });
  }

  if (descartados > 0 || filtro.descartados) {
    chips.push({
      label: `Descartados (${descartados})`,
      ativo: filtro.descartados,
      destino: filtro.descartados ? base : { ...base, descartados: true },
    });
  }

  function ir(label: string, href: string) {
    setClicado(label);
    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <div
      className={`flex flex-wrap gap-2 transition-opacity duration-200 ${
        pending ? "opacity-70" : ""
      }`}
      aria-busy={pending || undefined}
    >
      {chips.map((chip) => {
        const q = queryDoFiltro(chip.destino);
        const href = q ? `/leads?${q}` : "/leads";
        const carregando = pending && clicado === chip.label;
        return (
          <a
            key={chip.label}
            href={href}
            aria-current={chip.ativo ? "true" : undefined}
            onClick={(e) => {
              // Ctrl/Cmd/clique do meio seguem abrindo em nova aba.
              if (
                e.metaKey ||
                e.ctrlKey ||
                e.shiftKey ||
                e.altKey ||
                e.button !== 0
              ) {
                return;
              }
              e.preventDefault();
              ir(chip.label, href);
            }}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              chip.ativo
                ? "bg-primary text-primary-foreground font-semibold"
                : "border border-border text-zinc-400 hover:border-border-strong hover:text-zinc-200"
            }`}
          >
            {chip.label}
            {carregando && <Spinner />}
          </a>
        );
      })}
    </div>
  );
}
