import { requireTenant } from "@/lib/db/scoped";
import { obterModoChave } from "@/lib/chaves/modo";
import {
  LABEL_OPERACAO,
  listarUsoDiario,
  type OperacaoCota,
} from "@/lib/limites";

type Props = {
  operacoes: OperacaoCota[];
  titulo?: string;
};

/** Contador de uso diário no modo Orion (F018). */
export async function UsoDiarioBanner({
  operacoes,
  titulo = "Uso de hoje (modo Orion)",
}: Props) {
  const { userId } = await requireTenant();
  const modo = await obterModoChave(userId);
  if (modo !== "orion") return null;

  const usos = (await listarUsoDiario(userId)).filter((u) =>
    operacoes.includes(u.operacao),
  );

  const algumNoLimite = usos.some((u) => u.usado >= u.limite);

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${
        algumNoLimite
          ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
          : "border-zinc-700/60 bg-zinc-900/40 text-zinc-300"
      }`}
      role="status"
    >
      <p className="font-medium text-zinc-100">{titulo}</p>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {usos.map((u) => (
          <li key={u.operacao}>
            <span
              className={
                u.usado >= u.limite ? "font-semibold text-amber-200" : undefined
              }
            >
              {u.usado}/{u.limite} {LABEL_OPERACAO[u.operacao]}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-zinc-400">
        Os limites resetam à meia-noite (horário de Brasília). Em breve, planos
        pagos poderão remover esse limite.
      </p>
    </div>
  );
}
