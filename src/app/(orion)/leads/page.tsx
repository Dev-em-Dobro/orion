import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/db/scoped";
import { chavesEssenciaisFaltando } from "@/lib/chaves";
import {
  filaDeFollowUp,
  limiteDaJanela,
  whereFilaFollowUp,
} from "@/lib/followup";
import { STATUS_DESCARTADO } from "@/lib/funil";
import {
  parseFiltroLista,
  queryDoFiltro,
  temFiltro,
  whereFiltroLista,
  type FiltroLista,
} from "@/lib/leads/filtros";
import { BannerChaves } from "@/components/banner-chaves";
import { EmptyState } from "@/components/empty-state";
import { GridLeadsSkeleton, SkeletonPulse } from "@/components/page-skeleton";
import { UsoDiarioBanner } from "@/components/uso-diario";
import { AjudaScore } from "./ajuda-score";
import { ChipsFiltro } from "./chips-filtro";
import { ColetarForm } from "./coletar-form";
import { ExcluirDescartadosForm } from "./excluir-descartados-form";
import { GerarOutreachButton } from "./gerar-outreach-button";
import { INCLUDE_CARD, paraCardProps } from "./card-props";
import { LeadsGrid } from "./leads-grid";
import type { LeadCardProps } from "./lead-card";
import { FiltrosLista, PAGE_SIZE, PaginacaoLeads } from "./lista-controles";

// Sempre reflete o banco do aluno logado (F015) — sem cache cross-tenant.
export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  categoria?: string;
  site?: string;
  page?: string;
  score?: string;
  telefone?: string;
  atendimento?: string;
  status?: string;
}>;

/** Teto de exibição do painel de follow-up (F028: a fila não cresce sem fim). */
const FOLLOWUP_MAX = 20;

/**
 * F028 (H6) — cada bloco busca os próprios dados dentro de um `<Suspense>`,
 * então a casca (título, cota, esqueleto) pinta na hora e o conteúdo pesado
 * chega em streaming. `requireUser` e `chavesEssenciaisFaltando` são
 * memoizados por request, então dividir em blocos não multiplica consulta.
 */

async function BlocoColeta() {
  const { userId } = await requireTenant();
  const faltando = await chavesEssenciaisFaltando(userId);

  if (faltando.includes("google")) {
    return (
      <EmptyState
        titulo="Configure a chave Google pra coletar Leads"
        descricao="A busca usa a Places API da sua conta. Cole a chave em Configuração — há um tutorial curto se você ainda não criou."
        acao={{ href: "/configuracao", label: "Ir para Configuração" }}
        secundaria={{
          href: "/configuracao/tutorial-google",
          label: "Como criar a chave Google",
        }}
      />
    );
  }
  return <ColetarForm />;
}

async function PainelFollowUp() {
  const { whereUser } = await requireTenant();
  const leads = await prisma.lead.findMany({
    where: { ...whereUser, ...whereFilaFollowUp(limiteDaJanela()) },
    include: {
      outreaches: {
        where: { enviado: true },
        orderBy: { enviado_em: "desc" },
        take: 1,
      },
    },
    orderBy: { score: "desc" },
    take: FOLLOWUP_MAX,
  });

  const fila = filaDeFollowUp(leads);
  if (fila.length === 0) return null;

  return (
    <div className="mt-8 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
      <p className="text-sm font-semibold text-amber-300">
        Follow-up pendente ({fila.length})
      </p>
      <ul className="mt-2 space-y-2">
        {fila.map(({ lead, dias }) => (
          <li
            key={lead.id}
            className="flex flex-wrap items-center gap-2 text-sm"
          >
            <span className="font-medium">{lead.nome}</span>
            <span className="text-amber-200/60">{dias}d sem resposta</span>
            <GerarOutreachButton leadId={lead.id} tipo="followup" />
          </li>
        ))}
      </ul>
    </div>
  );
}

async function BlocoLista({
  filtro,
  pageRequested,
}: {
  filtro: FiltroLista;
  pageRequested: number;
}) {
  const { whereUser } = await requireTenant();
  const whereLista = { ...whereUser, ...whereFiltroLista(filtro) };

  const buscarPagina = (p: number) =>
    prisma.lead.findMany({
      where: whereLista,
      orderBy: [{ score: "desc" }, { created_at: "desc" }],
      skip: (p - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: INCLUDE_CARD,
    });

  // Uma rodada só (F028): nada aqui depende do resultado do vizinho.
  const [categoriasRows, total, leadsPagina, descartados] = await Promise.all([
    prisma.lead.groupBy({
      by: ["categoria"],
      where: { ...whereUser, status: { not: STATUS_DESCARTADO } },
      orderBy: { categoria: "asc" },
    }),
    prisma.lead.count({ where: whereLista }),
    buscarPagina(pageRequested),
    prisma.lead.count({ where: { ...whereUser, status: STATUS_DESCARTADO } }),
  ]);

  const categorias = categoriasRows
    .map((r) => r.categoria)
    .filter((c) => c.length > 0);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(pageRequested, totalPages);
  // Página pedida além do fim: rebusca só nesse caso raro.
  const leads = page === pageRequested ? leadsPagina : await buscarPagina(page);

  const filtroAtivo = temFiltro(filtro) || filtro.descartados;
  const temAlgumLead =
    total > 0
      ? true
      : filtroAtivo
        ? (await prisma.lead.count({
            where: { ...whereUser, status: { not: STATUS_DESCARTADO } },
          })) > 0
        : false;

  const cards: LeadCardProps[] = leads.map((lead) =>
    paraCardProps(lead, `/leads/${lead.id}?${queryDoFiltro(filtro, { page })}`),
  );

  return (
    <>
      {filtro.descartados && (
        <div className="mt-8 rounded-xl border border-border bg-zinc-900/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-zinc-300">
              Vendo <strong>{descartados}</strong> Lead(s) descartado(s).
              Restaurar devolve o Lead à lista.
            </p>
            <Link href="/leads" className="btn-ghost">
              ← Voltar aos ativos
            </Link>
          </div>
          {descartados > 0 && (
            <div className="mt-3 border-t border-border pt-3">
              <ExcluirDescartadosForm quantidade={descartados} />
            </div>
          )}
        </div>
      )}

      <div className="mt-8">
        {temAlgumLead && (
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <ChipsFiltro filtro={filtro} descartados={descartados} />
            <FiltrosLista
              categorias={categorias}
              categoriaAtual={filtro.categoria}
              siteAtual={filtro.site}
            />
          </div>
        )}

        <p className="text-sm text-muted">
          {total} Lead(s)
          {total > 0 && (
            <span className="text-zinc-500">
              {" "}
              · ordenado por Score
              <AjudaScore foco="score" colocacao="abaixo-esquerda" />
            </span>
          )}
        </p>

        {!temAlgumLead && (
          <div className="mt-3">
            <EmptyState
              titulo="Nenhum Lead ainda"
              descricao="Use o formulário acima: informe um termo (ex.: barbearia) e uma localização (ex.: Curitiba PR)."
            />
          </div>
        )}

        {temAlgumLead && total === 0 && (
          <div className="mt-3">
            <EmptyState
              titulo="Nenhum Lead com esses filtros"
              descricao="Ajuste os filtros acima ou limpe para ver todos."
              acao={{ href: "/leads", label: "Ver todos os Leads" }}
            />
          </div>
        )}

        {cards.length > 0 && (
          <>
            <div className="mt-3">
              <LeadsGrid leads={cards} />
            </div>
            <PaginacaoLeads
              page={page}
              totalPages={totalPages}
              total={total}
              query={queryDoFiltro(filtro)}
            />
          </>
        )}
      </div>
    </>
  );
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filtro = parseFiltroLista(params);
  const pageRaw = Number.parseInt(params.page ?? "1", 10);
  const pageRequested =
    Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;

  return (
    <>
      <Suspense fallback={null}>
        <BannerChaves />
      </Suspense>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
            <p className="mt-1 text-sm text-muted">
              Busque, diagnostique e aborde. Clique no Lead para ver o
              diagnóstico completo, a abordagem e a proposta.
            </p>
          </div>
          {/* F032 — cota no topo, como na referência. */}
          <div className="min-w-[16rem]">
            <UsoDiarioBanner operacoes={["coleta", "proposta", "outreach"]} />
          </div>
        </div>

        <div className="mt-6">
          <Suspense fallback={<SkeletonPulse className="h-24 w-full" />}>
            <BlocoColeta />
          </Suspense>
        </div>

        <Suspense fallback={null}>
          <PainelFollowUp />
        </Suspense>

        <Suspense fallback={<GridLeadsSkeleton />}>
          <BlocoLista filtro={filtro} pageRequested={pageRequested} />
        </Suspense>
      </main>
    </>
  );
}
