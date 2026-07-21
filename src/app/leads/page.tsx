import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/db/scoped";
import { chavesEssenciaisFaltando } from "@/lib/chaves";
import { valor as calcularValor } from "@/lib/score/score";
import { classificarWebsite } from "@/lib/diagnostico/agregador";
import { filaDeFollowUp } from "@/lib/followup";
import { ESTAGIOS_EM_ABERTO } from "@/lib/funil";
import { demoUrlFor } from "@/lib/demos";
import { BannerChaves } from "@/components/banner-chaves";
import { EmptyState } from "@/components/empty-state";
import { AjudaScore } from "./ajuda-score";
import { ColetarForm } from "./coletar-form";
import { GerarOutreachButton } from "./gerar-outreach-button";
import { LeadRow } from "./lead-row";
import {
  FiltrosLista,
  PAGE_SIZE,
  PaginacaoLeads,
} from "./lista-controles";
import { linkWhatsapp } from "./ui";
import {
  parseFiltroSite,
  ROTULO_FILTRO_SITE,
  whereFiltroSite,
} from "@/lib/leads/filtroSite";

// Sempre reflete o banco do aluno logado (F015) — sem cache cross-tenant.
export const dynamic = "force-dynamic";

const fmtData = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

type SearchParams = Promise<{
  categoria?: string;
  site?: string;
  page?: string;
}>;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const categoriaRaw = params.categoria?.trim() ?? "";
  const siteFiltro = parseFiltroSite(params.site);

  const { whereUser, userId } = await requireTenant();

  const [categoriasRows, totalTenant, faltandoChaves, leadsFollowUp] =
    await Promise.all([
      prisma.lead.findMany({
        where: whereUser,
        select: { categoria: true },
        distinct: ["categoria"],
        orderBy: { categoria: "asc" },
      }),
      prisma.lead.count({ where: whereUser }),
      chavesEssenciaisFaltando(userId),
      prisma.lead.findMany({
        where: { ...whereUser, status: "contatado" },
        include: {
          outreaches: {
            where: { enviado: true },
            orderBy: { enviado_em: "desc" },
            take: 1,
          },
        },
      }),
    ]);

  const categorias = categoriasRows
    .map((r) => r.categoria)
    .filter((c) => c.length > 0);

  const categoriaValida =
    categoriaRaw.length > 0 && categorias.includes(categoriaRaw)
      ? categoriaRaw
      : null;

  const whereLista = {
    ...whereUser,
    ...(categoriaValida ? { categoria: categoriaValida } : {}),
    ...(siteFiltro ? whereFiltroSite(siteFiltro) : {}),
  };

  const total =
    categoriaValida || siteFiltro
      ? await prisma.lead.count({ where: whereLista })
      : totalTenant;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageRaw = Number.parseInt(params.page ?? "1", 10);
  const pageRequested =
    Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
  const page = Math.min(pageRequested, totalPages);
  const skip = (page - 1) * PAGE_SIZE;

  const leads =
    total === 0
      ? []
      : await prisma.lead.findMany({
          where: whereLista,
          orderBy: [{ score: "desc" }, { created_at: "desc" }],
          skip,
          take: PAGE_SIZE,
          include: {
            diagnosticos: { orderBy: { executado_em: "desc" }, take: 1 },
            outreaches: { orderBy: { gerado_em: "desc" } },
          },
        });

  const semGoogle = faltandoChaves.includes("google");
  const followUp = filaDeFollowUp(leadsFollowUp);

  const linhas = leads.map((lead) => {
    const classif = lead.website ? classificarWebsite(lead.website) : null;
    return {
      lead,
      classif,
      valor: calcularValor({
        categoria: lead.categoria,
        num_avaliacoes: lead.num_avaliacoes,
      }),
    };
  });

  const temFiltroAtivo = categoriaValida !== null || siteFiltro !== null;
  const semResultadosFiltro = totalTenant > 0 && total === 0 && temFiltroAtivo;

  return (
    <>
      <BannerChaves />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
        <p className="mt-1 text-sm text-muted">
          Coleta (F001), Diagnóstico (F002), priorização por score (F003),
          Outreach de WhatsApp (F005) e follow-up (F006). Clique no nome para
          ver detalhes, mensagem e ações.
        </p>

        <div className="mt-6">
          {semGoogle ? (
            <EmptyState
              titulo="Configure a chave Google pra coletar Leads"
              descricao="A busca usa a Places API da sua conta. Cole a chave em Configuração — há um tutorial curto se você ainda não criou."
              acao={{ href: "/configuracao", label: "Ir para Configuração" }}
              secundaria={{
                href: "/configuracao/tutorial-google",
                label: "Como criar a chave Google",
              }}
            />
          ) : (
            <ColetarForm />
          )}
        </div>

        {followUp.length > 0 && (
          <div className="mt-8 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="text-sm font-semibold text-amber-300">
              Follow-up pendente ({followUp.length})
            </p>
            <ul className="mt-2 space-y-2">
              {followUp.map(({ lead, dias }) => (
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
        )}

        <div className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted">
                {total} Lead(s)
                {categoriaValida ? (
                  <span className="text-zinc-500">
                    {" "}
                    · categoria “{categoriaValida}”
                  </span>
                ) : null}
                {siteFiltro ? (
                  <span className="text-zinc-500">
                    {" "}
                    · site “{ROTULO_FILTRO_SITE[siteFiltro]}”
                  </span>
                ) : null}
              </p>
              {total > 0 && (
                <p className="mt-0.5 text-xs text-zinc-500">
                  Ordenado por Score (depois data). Até {PAGE_SIZE} por página.
                  Score 0 = ainda não priorizado — Diagnosticar → Priorizar.
                </p>
              )}
            </div>
            {totalTenant > 0 ? (
              <FiltrosLista
                categorias={categorias}
                categoriaAtual={categoriaValida}
                siteAtual={siteFiltro}
              />
            ) : null}
          </div>

          {totalTenant === 0 ? (
            <div className="mt-3">
              <EmptyState
                titulo={
                  semGoogle
                    ? "Nenhum Lead ainda — faltam chaves"
                    : "Nenhum Lead ainda"
                }
                descricao={
                  semGoogle
                    ? "Depois de configurar o Google, use o formulário de coleta acima pra buscar estabelecimentos."
                    : "Use o formulário acima: informe um termo (ex.: barbearia) e uma localização (ex.: Curitiba PR)."
                }
                acao={
                  semGoogle
                    ? { href: "/configuracao", label: "Configurar chaves" }
                    : undefined
                }
              />
            </div>
          ) : null}

          {semResultadosFiltro ? (
            <div className="mt-3">
              <EmptyState
                titulo="Nenhum Lead com esses filtros"
                descricao="Ajuste categoria ou tipo de site, ou limpe os filtros para ver todos."
                acao={{ href: "/leads", label: "Ver todos os Leads" }}
              />
            </div>
          ) : null}

          {linhas.length > 0 && (
            <>
              <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs tracking-wide text-zinc-400 uppercase">
                      <th className="px-3 py-3 font-medium">Nome</th>
                      <th className="px-3 py-3 font-medium">Categoria</th>
                      <th className="px-3 py-3 font-medium">Status</th>
                      <th className="px-3 py-3 font-medium">
                        <span className="inline-flex items-center gap-1.5">
                          Score
                          <AjudaScore foco="score" colocacao="abaixo-esquerda" />
                        </span>
                      </th>
                      <th className="px-3 py-3 font-medium">Avaliações</th>
                      <th className="px-3 py-3 font-medium">Site</th>
                      <th className="px-3 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {linhas.map(({ lead, valor, classif }) => {
                      const diag = lead.diagnosticos[0];
                      const ultimoOutreach = lead.outreaches[0];
                      const waLink = ultimoOutreach
                        ? linkWhatsapp(lead.telefone, ultimoOutreach.conteudo)
                        : null;
                      return (
                        <LeadRow
                          key={lead.id}
                          id={lead.id}
                          nome={lead.nome}
                          categoria={lead.categoria}
                          endereco={lead.endereco}
                          telefone={lead.telefone}
                          website={lead.website}
                          nota={lead.nota}
                          numAvaliacoes={lead.num_avaliacoes}
                          status={lead.status}
                          score={lead.score}
                          valor={valor.valor}
                          tier={valor.tier}
                          ehAgregador={classif?.ehAgregador ?? false}
                          agregadorTipo={
                            classif?.ehAgregador ? classif.tipo : null
                          }
                          diag={
                            diag
                              ? {
                                  temSite: diag.tem_site,
                                  siteEhAgregador: diag.site_e_agregador,
                                  temHttps: diag.tem_https,
                                  performanceMobile: diag.performance_mobile,
                                }
                              : null
                          }
                          diagnosticadoEm={
                            diag ? fmtData.format(diag.executado_em) : null
                          }
                          outreachConteudo={ultimoOutreach?.conteudo ?? null}
                          outreachEnviado={ultimoOutreach?.enviado ?? false}
                          outreachCount={lead.outreaches.length}
                          waLink={waLink}
                          emAberto={ESTAGIOS_EM_ABERTO.includes(lead.status)}
                          demoUrl={demoUrlFor(lead.place_id)}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <PaginacaoLeads
                page={page}
                totalPages={totalPages}
                total={total}
                categoria={categoriaValida}
                site={siteFiltro}
              />
            </>
          )}
        </div>
      </main>
    </>
  );
}
