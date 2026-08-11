// F035 — comparativo de planos e checkout.
// Spec: /specs/02-features/F035-planos-e-limites.md ("/planos")
//
// A cobrança continua na Hubla (fora do escopo da F035): aqui é só a
// comparação e o link. Sem `product_id` configurado no ambiente, o botão vira
// "em breve" em vez de um link quebrado.

import Link from "next/link";
import {
  CATALOGO_PLANOS,
  LABEL_RECURSO,
  PLANOS,
  RECURSOS,
  asPlano,
  definicao,
  precoFormatado,
  temRecurso,
  urlCheckoutPlano,
  usoDoPlano,
  type Recurso,
} from "@/lib/planos";
import { requireTenant } from "@/lib/db/scoped";

export const dynamic = "force-dynamic";

function asRecurso(raw: string | undefined): Recurso | null {
  return raw && (RECURSOS as readonly string[]).includes(raw)
    ? (raw as Recurso)
    : null;
}

export default async function PlanosPage({
  searchParams,
}: {
  searchParams: Promise<{ recurso?: string; plano?: string }>;
}) {
  const { userId } = await requireTenant();
  const [uso, sp] = await Promise.all([usoDoPlano(userId), searchParams]);
  const atual = uso.plano;
  const bloqueado = asRecurso(sp.recurso);
  const destacado = asPlano(sp.plano);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Planos</h1>
      <p className="mt-1 text-sm text-muted">
        O que muda é <strong>quantos Leads você aprofunda por mês</strong> e as
        ferramentas de operação do funil. Buscar e ver o score estimado é
        ilimitado em todos os planos.
      </p>

      {bloqueado && (
        <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          <strong>{LABEL_RECURSO[bloqueado]}</strong> não está no plano{" "}
          {definicao(atual).nome}. Escolha um plano abaixo para liberar.
        </p>
      )}

      <p className="mt-4 text-xs text-zinc-400">
        Você está no plano <strong>{definicao(atual).nome}</strong> — usou{" "}
        {uso.usado} de {uso.limite} Leads diagnosticados este mês.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {PLANOS.map((p) => {
          const def = CATALOGO_PLANOS[p];
          const ehAtual = p === atual;
          const checkout = urlCheckoutPlano(p);
          return (
            <section
              key={p}
              className={`card flex flex-col ${
                ehAtual || destacado === p ? "ring-1 ring-primary" : ""
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold">{def.nome}</h2>
                {ehAtual && (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] text-primary">
                    seu plano
                  </span>
                )}
              </div>
              <p className="mt-1 text-2xl font-bold">{precoFormatado(p)}</p>
              <p className="mt-1 text-xs text-muted">{def.resumo}</p>

              <ul className="mt-4 flex-1 space-y-1.5 text-sm">
                <li>
                  <strong>{def.leadsDiagnosticadosMes}</strong> Leads
                  diagnosticados/mês
                  {def.bonusByok && (
                    <span className="text-zinc-500"> · 2× com BYOK</span>
                  )}
                </li>
                <li className="text-zinc-400">
                  Aprofunda {def.aprofundarPorBusca} por vez
                </li>
                <li className="text-zinc-400">Outreach por WhatsApp</li>
                {RECURSOS.map((r) => (
                  <li
                    key={r}
                    className={
                      temRecurso(p, r) ? "text-zinc-200" : "text-zinc-600"
                    }
                  >
                    {temRecurso(p, r) ? "✓" : "—"} {LABEL_RECURSO[r]}
                  </li>
                ))}
              </ul>

              <div className="mt-4">
                {ehAtual ? (
                  <span className="text-xs text-zinc-500">
                    Plano ativo hoje.
                  </span>
                ) : checkout ? (
                  <a href={checkout} className="btn-primary inline-block">
                    Assinar {def.nome}
                  </a>
                ) : p === "free" ? (
                  <span className="text-xs text-zinc-500">
                    É o plano de entrada — nada a fazer.
                  </span>
                ) : (
                  <span className="text-xs text-zinc-500">
                    Checkout em breve.
                  </span>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-zinc-500">
        O limite mensal vale também no modo BYOK: o que o Orion entrega é o Lead
        diagnosticado e com abordagem pronta, não o repasse da API.{" "}
        <Link href="/configuracao" className="text-primary hover:underline">
          Ver minhas chaves
        </Link>
      </p>
    </main>
  );
}
