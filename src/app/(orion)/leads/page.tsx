import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/db/scoped";
import { chavesEssenciaisFaltando } from "@/lib/chaves";
import { STATUS_DESCARTADO } from "@/lib/funil";
import {
  parseFiltroLista,
  queryDoFiltro,
  temFiltro,
  whereFiltroLista,
  type FiltroLista,
} from "@/lib/leads/filtros";
import { asTema, classeDoTema, TEMA_COOKIE } from "@/lib/tema";
import { BannerChaves } from "@/components/banner-chaves";
import { EmptyState } from "@/components/empty-state";
import { GridLeadsSkeleton, SkeletonPulse } from "@/components/page-skeleton";
import { AjudaScore } from "./ajuda-score";
import { ChipsFiltro } from "./chips-filtro";
import { ColetarForm } from "./coletar-form";
import { ExcluirDescartadosForm } from "./excluir-descartados-form";
import { INCLUDE_CARD, paraCardProps } from "./card-props";
import { definicao, podeUsar, restanteDaOperacao } from "@/lib/planos";
import { LeadsGrid } from "./leads-grid";
import type { LeadCardProps } from "./lead-card";
import { FiltrosLista, PAGE_SIZE, PaginacaoLeads } from "./lista-controles";

// Sempre reflete o banco do aluno logado (F015) — sem cache cross-tenant.
export const metadata: Metadata = { title: "Leads" };

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  categoria?: string;
  site?: string;
  page?: string;
  score?: string;
  telefone?: string;
  atendimento?: string;
  estagio?: string;
  status?: string;
}>;

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
  // F035 — a cota do mês vem do servidor: o formulário precisa dela pra avisar
  // ANTES de gastar a consulta ao Places.
  const cota = await restanteDaOperacao(userId, "lead_novo");
  return (
    <ColetarForm
      restante={cota.restante}
      limite={cota.limite}
      planoNome={definicao(cota.plano).nome}
    />
  );
}

// F031 — o painel "Follow-up pendente" saiu daqui em 2026-08-13. Era a mesma
// regra da Tarefa `MANDAR_FOLLOWUP` (mesma janela de 3 dias), então o mesmo
// Lead atrasado aparecia no painel, no badge da sidebar e em `/tarefas` — com
// três contagens diferentes na tela, porque o painel cortava em 20 e mostrava
// o número já cortado. A cobrança agora tem um lugar só: `/tarefas`.

async function BlocoLista({
  filtro,
  pageRequested,
}: {
  filtro: FiltroLista;
  pageRequested: number;
}) {
  const { userId, whereUser } = await requireTenant();
  const whereLista = { ...whereUser, ...whereFiltroLista(filtro) };
  // F035 — o botão de exportar aparece sempre; o plano decide se ele
  // funciona ou leva pra /planos.
  const podeExportar = await podeUsar(userId, "exportar_csv");

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
            <FiltrosLista categorias={categorias} filtro={filtro} />
          </div>
        )}

        <p className="text-sm text-muted">
          {total} Lead(s)
          {total > 0 && (
            <span className="text-muted">
              {" "}
              · ordenado por Score
              <AjudaScore foco="score" colocacao="abaixo-esquerda" />
            </span>
          )}
        </p>

        {!temAlgumLead && (
          <div className="mt-3">
            {/* O texto antigo mandava "informe um termo e uma localização" —
                instrução impossível de seguir desde a F033, que trocou o campo
                livre por nicho em lista, estado e cidade. */}
            <EmptyState
              titulo="Nenhum Lead ainda"
              descricao="Use a busca acima: escolha o nicho, o estado e a cidade. O Orion coleta, tria e diagnostica os melhores sozinho."
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
              <LeadsGrid leads={cards} podeExportar={podeExportar} />
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
  // Tema lido no servidor: o cookie chega junto com o request, então o HTML já
  // sai na cor certa — sem o flash de trocar de tema depois da hidratação.
  const tema = asTema((await cookies()).get(TEMA_COOKIE)?.value);
  const filtro = parseFiltroLista(params);
  const pageRaw = Number.parseInt(params.page ?? "1", 10);
  const pageRequested =
    Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;

  return (
    <>
      <Suspense fallback={null}>
        <BannerChaves />
      </Suspense>
      {/* F032 — sem `max-w`: a lista usa a tela. O texto é que ganha teto
          próprio (`max-w-prose`), porque linha longa demais não se lê.

          O tema vem de `/configuracao` (cookie). No escuro a classe some e
          valem os tokens do `:root`. A altura mínima desconta a topbar (h-14)
          pra o fundo claro chegar no rodapé mesmo com pouca lista. */}
      <main
        className={`${classeDoTema(tema)} @container min-h-[calc(100vh-3.5rem)] px-6 py-8 lg:px-8`}
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          {/* Sem `max-w-prose`: o teto de 65ch quebrava a frase em duas linhas.
              Sem `nowrap` também — no mobile ela ainda precisa quebrar. */}
          <p className="mt-1 text-sm text-muted">
            Busque, diagnostique e aborde. Clique no Lead para ver o diagnóstico
            completo, a abordagem e a proposta.
          </p>
        </div>

        <div className="mt-6">
          {/* O esqueleto tem a altura real do formulário: reservar 24 pra um
              bloco de ~248 empurrava a lista inteira quando ele chegava. */}
          <Suspense fallback={<SkeletonPulse className="h-[15.5rem] w-full" />}>
            <BlocoColeta />
          </Suspense>
        </div>

        <Suspense fallback={<GridLeadsSkeleton />}>
          <BlocoLista filtro={filtro} pageRequested={pageRequested} />
        </Suspense>
      </main>
    </>
  );
}
