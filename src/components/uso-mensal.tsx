// F035 — barra de uso do plano no topo de `/` e `/leads`.
// Spec: /specs/02-features/F035-planos-e-limites.md ("Barra de uso")
//
// O upsell aparece **aqui**, a partir de 80%, e no cadeado do recurso — nunca
// em modal automático nem em banner recorrente. O gatilho é o aluno esbarrar
// no limite, não o Orion interromper o trabalho dele.

import Link from "next/link";
import { requireTenant } from "@/lib/db/scoped";
import { definicao, usoDoPlano } from "@/lib/planos";

/** A partir daqui a barra muda de cor e oferece o upgrade. */
const AVISO = 0.8;

export async function UsoMensalBanner() {
  const { userId } = await requireTenant();
  const uso = await usoDoPlano(userId);

  const alerta = uso.fracao >= AVISO;
  const estourado = uso.restante === 0;
  const cor = estourado
    ? "bg-red-500"
    : alerta
      ? "bg-amber-400"
      : "bg-emerald-500";

  return (
    <div className="surface-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-sm text-zinc-200">
          <strong className="font-mono font-semibold text-foreground">
            {uso.usado} / {uso.limite}
          </strong>{" "}
          Leads diagnosticados este mês
        </span>
        <span className="text-xs text-zinc-400">
          Plano {definicao(uso.plano).nome}
          {uso.byok && definicao(uso.plano).bonusByok && " · BYOK (2×)"}
        </span>
      </div>

      <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full ${cor} transition-all duration-500`}
          style={{ width: `${Math.round(uso.fracao * 100)}%` }}
        />
      </div>

      {(alerta || estourado) && (
        <p className="mt-2 text-xs text-zinc-300">
          {estourado
            ? "Limite do mês atingido. Buscar e ver a fila continua funcionando."
            : `Faltam ${uso.restante} para o limite do mês.`}{" "}
          <Link href="/planos" className="text-primary hover:underline">
            Ver planos
          </Link>
        </p>
      )}
    </div>
  );
}
