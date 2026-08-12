import Link from "next/link";
import type { ReactNode } from "react";
import {
  LABEL_CHAVE,
  type TipoChave,
  type VisaoChave,
} from "@/lib/chaves";
import type { LlmProviderId } from "@/lib/llm/tipos";
import { LABEL_LLM_PROVIDER } from "@/lib/llm/tipos";

type Props = {
  chaves: VisaoChave[];
  faltando: TipoChave[];
  provider: LlmProviderId;
};

/** Checklist no topo de /configuracao quando faltam essenciais (F016). */
export function OnboardingChaves({ chaves, faltando, provider }: Props) {
  if (faltando.length === 0) return null;

  const statusDe = (tipo: TipoChave) =>
    chaves.find((c) => c.tipo === tipo)?.status ?? "faltando";

  const itens: { tipo: TipoChave; dica?: ReactNode }[] = [
    {
      tipo: "google",
      dica: (
        <Link
          href="/configuracao/tutorial-google"
          className="text-primary underline underline-offset-2 hover:text-primary-hover"
        >
          Tutorial passo a passo
        </Link>
      ),
    },
    {
      tipo: provider,
      dica: (
        <span className="text-zinc-500">
          Provedor ativo: {LABEL_LLM_PROVIDER[provider]}
        </span>
      ),
    },
  ];

  return (
    <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
      <h2 className="text-sm font-semibold text-amber-100">
        Primeiros passos — configure as chaves
      </h2>
      <p className="mt-1 text-sm text-amber-100/80">
        Sem elas o app não chama Places nem IA. O custo fica na{" "}
        <strong className="font-medium text-amber-50">sua</strong> conta dos
        provedores.
      </p>
      <ul className="mt-4 space-y-3">
        {itens.map((item) => {
          const st = statusDe(item.tipo);
          const ok = st === "configurada";
          return (
            <li
              key={item.tipo}
              className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm"
            >
              <span aria-hidden>{ok ? "✓" : "○"}</span>
              <span className={ok ? "text-emerald-300" : "text-amber-50"}>
                {LABEL_CHAVE[item.tipo]}
              </span>
              {!ok && item.dica ? (
                <span className="text-amber-100/70">— {item.dica}</span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
