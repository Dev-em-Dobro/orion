// F029 — Agente Orion.
// Spec: /specs/02-features/F029-agente-orion.md
//
// Última feature do revamp de propósito: o agente só é bom se os dados dele
// existirem — score confirmado (F025), Dores com atendimento (F026), cobranças
// (F031). Antes disso ele responderia sobre uma base vazia.

import { UsoDiarioBanner } from "@/components/uso-diario";
import { requireTenant } from "@/lib/db/scoped";
import { redirectSeRecursoBloqueado } from "@/lib/planos";
import { Chat } from "./chat";

export const dynamic = "force-dynamic";

export default async function AgentePage() {
  // F035 — gate de plano no servidor, **antes** do JSX: dentro de um
  // <Suspense> o redirect chegaria depois do shell, e viraria 200.
  const { userId } = await requireTenant();
  await redirectSeRecursoBloqueado(userId, "agente");

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agente</h1>
          <p className="mt-1 text-sm text-muted">
            Pergunte sobre os seus Leads, o funil e o que está parado. Só
            leitura: o agente mostra o caminho, quem age é você.
          </p>
        </div>
        <div className="min-w-[14rem]">
          <UsoDiarioBanner operacoes={["agente_msg"]} />
        </div>
      </div>

      <div className="mt-6">
        <Chat />
      </div>
    </main>
  );
}
