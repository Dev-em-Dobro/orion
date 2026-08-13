// F034 — funil kanban: operar o funil, não só olhar.
// Spec: /specs/02-features/F034-funil-kanban.md
//
// A F010 (dashboard) continua sendo a leitura analítica — taxas de conversão.
// Aqui é a operação: mover o card corrige o status (F024), o que grava
// `status_em` e alimenta as cobranças da F031.

import type { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/db/scoped";
import { redirectSeRecursoBloqueado } from "@/lib/planos";
import { COLUNAS_FUNIL, colunaDoStatus, STATUS_DO_BOARD } from "@/lib/funil";
import { linkWhatsapp } from "@/lib/abordagem/whatsappLink";
import { EmptyState } from "@/components/empty-state";
import { SkeletonPulse } from "@/components/page-skeleton";
import { Board, type CardFunil, type ColunaComTotal } from "./board";

export const metadata: Metadata = { title: "Funil" };

export const dynamic = "force-dynamic";

/** Teto de cards exibidos por coluna (F034 AC7). */
const POR_COLUNA = 50;

async function Conteudo() {
  const { whereUser } = await requireTenant();

  // Duas queries: os contadores (exatos, por groupBy) e os cards (limitados).
  // Assim o número no topo da coluna nunca mente, mesmo quando a lista está
  // truncada.
  const [contagens, leads] = await Promise.all([
    prisma.lead.groupBy({
      by: ["status"],
      where: { ...whereUser, status: { in: STATUS_DO_BOARD } },
      _count: { _all: true },
    }),
    prisma.lead.findMany({
      where: { ...whereUser, status: { in: STATUS_DO_BOARD } },
      orderBy: [{ score: "desc" }, { status_em: "asc" }],
      take: POR_COLUNA * COLUNAS_FUNIL.length,
      select: {
        id: true,
        nome: true,
        categoria: true,
        score: true,
        status: true,
        telefone: true,
        abordagens: {
          select: { conteudo: true },
          orderBy: { gerado_em: "desc" },
          take: 1,
        },
      },
    }),
  ]);

  const totalPorColuna = new Map<string, number>();
  for (const c of contagens) {
    const coluna = colunaDoStatus(c.status);
    if (!coluna) continue;
    totalPorColuna.set(
      coluna.id,
      (totalPorColuna.get(coluna.id) ?? 0) + c._count._all,
    );
  }

  const total = [...totalPorColuna.values()].reduce((s, n) => s + n, 0);
  if (total === 0) {
    return (
      <EmptyState
        titulo="Funil vazio"
        descricao="Assim que um Lead for diagnosticado, ele aparece em Prontos e você move daqui pra frente."
        acao={{ href: "/leads", label: "Buscar Leads" }}
      />
    );
  }

  const porColuna = new Map<string, number>();
  const cards: CardFunil[] = [];

  for (const lead of leads) {
    const coluna = colunaDoStatus(lead.status);
    if (!coluna) continue;
    const jaTem = porColuna.get(coluna.id) ?? 0;
    if (jaTem >= POR_COLUNA) continue;
    porColuna.set(coluna.id, jaTem + 1);

    const ultimo = lead.abordagens[0];
    cards.push({
      id: lead.id,
      nome: lead.nome,
      categoria: lead.categoria,
      score: lead.score,
      status: lead.status,
      coluna: coluna.id,
      waLink: ultimo ? linkWhatsapp(lead.telefone, ultimo.conteudo) : null,
    });
  }

  const colunas: ColunaComTotal[] = COLUNAS_FUNIL.map((c) => {
    const totalColuna = totalPorColuna.get(c.id) ?? 0;
    return {
      id: c.id,
      total: totalColuna,
      truncada: totalColuna > (porColuna.get(c.id) ?? 0),
      href: "/leads",
    };
  });

  return <Board cards={cards} colunas={colunas} />;
}

export default async function FunilPage() {
  // F035 — gate de plano no servidor, **antes** do JSX: dentro de um
  // <Suspense> o redirect chegaria depois do shell, e viraria 200.
  const { userId } = await requireTenant();
  await redirectSeRecursoBloqueado(userId, "kanban");

  return (
    <main className="mx-auto max-w-[100rem] px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Funil</h1>
      <p className="mt-1 text-sm text-muted">
        Onde cada Lead está na jornada. Mover um card corrige o status — as
        taxas de conversão continuam no Dashboard.
      </p>

      <div className="mt-6">
        <Suspense fallback={<SkeletonPulse className="h-64 w-full" />}>
          <Conteudo />
        </Suspense>
      </div>
    </main>
  );
}
