// F032 — detalhe do Lead: tela de trabalho com abas.
// Spec: /specs/02-features/F032-interface-do-orion.md
// F015 AC6 — Lead de outro aluno → 404 (não vaza o dado).

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { TenantNotFoundError, requireLeadOwned } from "@/lib/db/scoped";
import { valor as calcularValor } from "@/lib/score/score";
import { classificarWebsite } from "@/lib/diagnostico/agregador";
import { ROTULO_ATENDIMENTO } from "@/lib/diagnostico/atendimento";
import { demoUrlFor } from "@/lib/demos";
import { ESTAGIOS_EM_ABERTO } from "@/lib/funil";
import {
  parseFiltroLista,
  queryDoFiltro,
  whereFiltroLista,
} from "@/lib/leads/filtros";
import {
  ORDEM_INVERSA,
  ORDEM_LISTA,
  whereAntes,
  whereDepois,
} from "@/lib/leads/vizinhos";
import { CorrigirStatusForm } from "../corrigir-status-form";
import { DescartarButton, RestaurarButton } from "../descarte-buttons";
import { DesfechoButtons } from "../desfecho-buttons";
import { DiagnosticarButton } from "../diagnosticar-button";
import { GerarOutreachButton } from "../gerar-outreach-button";
import { GerarPropostaButton } from "../gerar-proposta-button";
import { MarcarEnviadaButton } from "../marcar-enviada-button";
import { PriorizarButton } from "../priorizar-button";
import { ResponderObjecaoPanel } from "../responder-objecao-panel";
import { faixaDeScore, linkWhatsapp, scoreBadge, SimNao, STATUS_BADGE } from "../ui";
import { Abas, parseAba } from "./abas";

export const dynamic = "force-dynamic";

const fmtData = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

type SearchParams = Promise<{
  aba?: string;
  categoria?: string;
  site?: string;
  score?: string;
  telefone?: string;
  atendimento?: string;
  status?: string;
  page?: string;
}>;

function Campo({
  rotulo,
  children,
}: {
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-2 last:border-0">
      <span className="text-xs tracking-wide text-zinc-500 uppercase">
        {rotulo}
      </span>
      <span className="text-right text-sm text-zinc-200">{children}</span>
    </div>
  );
}

export default async function LeadByIdPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const aba = parseAba(sp.aba);
  const filtro = parseFiltroLista(sp);
  const query = queryDoFiltro(filtro, { page: sp.page });

  try {
    const { lead, userId, whereUser } = await requireLeadOwned(id);

    const cursor = { score: lead.score, created_at: lead.created_at };
    const whereContexto = { ...whereUser, ...whereFiltroLista(filtro) };

    const [diagnostico, dores, outreaches, anterior, proximo, antesCount, total] =
      await Promise.all([
        prisma.diagnostico.findFirst({
          where: { lead_id: lead.id, user_id: userId },
          orderBy: { executado_em: "desc" },
        }),
        prisma.dor.findMany({ where: { lead_id: lead.id, user_id: userId } }),
        prisma.outreach.findMany({
          where: { lead_id: lead.id, user_id: userId },
          orderBy: { gerado_em: "desc" },
        }),
        prisma.lead.findFirst({
          where: { ...whereContexto, ...whereAntes(cursor) },
          orderBy: ORDEM_INVERSA,
          select: { id: true },
        }),
        prisma.lead.findFirst({
          where: { ...whereContexto, ...whereDepois(cursor) },
          orderBy: ORDEM_LISTA,
          select: { id: true },
        }),
        prisma.lead.count({
          where: { ...whereContexto, ...whereAntes(cursor) },
        }),
        prisma.lead.count({ where: whereContexto }),
      ]);

    const classif = lead.website ? classificarWebsite(lead.website) : null;
    const { valor, tier } = calcularValor({
      categoria: lead.categoria,
      num_avaliacoes: lead.num_avaliacoes,
    });
    const demoUrl = demoUrlFor(lead.place_id);
    const hrefVizinho = (vizinhoId: string) => {
      const p = new URLSearchParams(query);
      p.set("aba", aba);
      return `/leads/${vizinhoId}?${p.toString()}`;
    };

    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-sm text-zinc-500">
          <Link
            href={query ? `/leads?${query}` : "/leads"}
            className="hover:text-primary"
          >
            ← Leads
          </Link>
        </p>

        {/* Cabeçalho fixo do Lead */}
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`badge font-mono ${scoreBadge(lead.score)}`}>
                {lead.score} {faixaDeScore(lead.score)}
              </span>
              <span className={`badge ${STATUS_BADGE[lead.status]}`}>
                {lead.status}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">
              {lead.nome}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {lead.categoria} · {tier} · Valor {valor}
            </p>
          </div>

          {/* Navegação entre os Leads do filtro de origem (AC8) */}
          {total > 1 && (
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span className="font-mono text-xs">
                {antesCount + 1} de {total}
              </span>
              {anterior ? (
                <Link href={hrefVizinho(anterior.id)} className="btn-ghost">
                  ‹
                </Link>
              ) : (
                <span className="btn-ghost pointer-events-none opacity-40">
                  ‹
                </span>
              )}
              {proximo ? (
                <Link href={hrefVizinho(proximo.id)} className="btn-ghost">
                  ›
                </Link>
              ) : (
                <span className="btn-ghost pointer-events-none opacity-40">
                  ›
                </span>
              )}
            </div>
          )}
        </div>

        <div className="mt-6">
          <Abas leadId={lead.id} atual={aba} query={query} />
        </div>

        <div className="mt-6">
          {aba === "diagnostico" && (
            <div className="space-y-6">
              <section className="rounded-xl border border-border bg-card p-4">
                <Campo rotulo="Telefone">
                  {lead.telefone ?? <span className="text-zinc-600">—</span>}
                </Campo>
                <Campo rotulo="Site">
                  {lead.website ? (
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      abrir ↗
                      {classif?.ehAgregador
                        ? classif.tipo === "social"
                          ? " (rede social)"
                          : " (link-in-bio)"
                        : ""}
                    </a>
                  ) : (
                    <span className="text-red-300">sem site</span>
                  )}
                </Campo>
                <Campo rotulo="Avaliações">
                  {lead.num_avaliacoes === null ? (
                    <span className="text-zinc-600">—</span>
                  ) : (
                    <span className="font-mono">
                      {lead.nota?.toFixed(1) ?? "—"} ({lead.num_avaliacoes})
                    </span>
                  )}
                </Campo>
                <Campo rotulo="Endereço">{lead.endereco}</Campo>
              </section>

              <section className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                  Último Diagnóstico
                </p>
                {diagnostico ? (
                  <div className="mt-3">
                    <Campo rotulo="Site próprio">
                      {diagnostico.site_e_agregador ? (
                        <span className="text-red-400" title="Só agregador/rede social">
                          ✗
                        </span>
                      ) : (
                        <SimNao valor={diagnostico.tem_site} />
                      )}
                    </Campo>
                    <Campo rotulo="HTTPS">
                      <SimNao valor={diagnostico.tem_https} />
                    </Campo>
                    <Campo rotulo="Performance mobile">
                      <span className="font-mono">
                        {diagnostico.performance_mobile ?? "—"}
                      </span>
                    </Campo>
                    <Campo rotulo="Atendimento automatizado">
                      <span
                        title="Verificamos só o site público do negócio. Não enviamos mensagem para o WhatsApp dele."
                        className={
                          diagnostico.atendimento_automatizado === "detectado"
                            ? "text-emerald-300"
                            : diagnostico.atendimento_automatizado ===
                                "nao_detectado"
                              ? "text-sky-300"
                              : "text-zinc-400"
                        }
                      >
                        {ROTULO_ATENDIMENTO[diagnostico.atendimento_automatizado]}
                        {diagnostico.atendimento_evidencia && (
                          <span className="text-zinc-500">
                            {" "}
                            · {diagnostico.atendimento_evidencia}
                          </span>
                        )}
                      </span>
                    </Campo>
                    <Campo rotulo="Executado em">
                      {fmtData.format(diagnostico.executado_em)}
                    </Campo>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted">
                    Ainda não diagnosticado.
                  </p>
                )}

                {dores.length > 0 && (
                  <ul className="mt-4 space-y-1.5 border-t border-border pt-3">
                    {dores.map((dor) => (
                      <li key={dor.id} className="text-sm text-zinc-300">
                        <span
                          className={`badge mr-2 ${
                            dor.severidade === "ALTA"
                              ? "bg-red-500/15 text-red-300"
                              : dor.severidade === "MEDIA"
                                ? "bg-amber-500/15 text-amber-300"
                                : "bg-zinc-500/15 text-zinc-400"
                          }`}
                        >
                          {dor.severidade}
                        </span>
                        {dor.detalhes}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
                  <DiagnosticarButton leadId={lead.id} />
                  <PriorizarButton leadId={lead.id} />
                </div>
              </section>

              {demoUrl && (
                <a
                  href={demoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
                >
                  Ver site de amostra ↗
                </a>
              )}
            </div>
          )}

          {aba === "abordagem" && (
            <div className="space-y-4">
              {/* F027 — dois canais. O de e-mail pede o endereço quando o
                  Lead não tem um capturado do site. */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                    WhatsApp
                  </p>
                  {!lead.telefone && (
                    <span className="text-xs text-zinc-600">sem telefone</span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <GerarOutreachButton leadId={lead.id} />
                  <GerarOutreachButton leadId={lead.id} tipo="followup" />
                </div>
              </div>

              {/* O canal e-mail (F027) saiu em 2026-08-13 — ver F035,
                  "Saída do Outreach por e-mail". Abordagem é só WhatsApp. */}

              {outreaches.length === 0 ? (
                <p className="text-sm text-muted">
                  Nenhuma Outreach gerada ainda.
                </p>
              ) : (
                <ul className="space-y-3">
                  {outreaches.map((o) => {
                    const wa = linkWhatsapp(lead.telefone, o.conteudo);
                    return (
                      <li
                        key={o.id}
                        className="rounded-xl border border-border bg-card p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs text-zinc-500">
                            {o.canal} · {fmtData.format(o.gerado_em)}
                          </span>
                          <span
                            className={`badge ${
                              o.enviado
                                ? "bg-emerald-500/15 text-emerald-300"
                                : "bg-zinc-500/15 text-zinc-400"
                            }`}
                          >
                            {o.enviado ? "enviado" : "não enviado"}
                          </span>
                        </div>
                        {o.assunto && (
                          <p className="mt-2 text-xs text-zinc-300">
                            <span className="text-zinc-500">Assunto:</span>{" "}
                            {o.assunto}
                          </p>
                        )}
                        <textarea
                          readOnly
                          value={o.conteudo}
                          rows={5}
                          className="mt-2 w-full rounded-lg border border-border bg-zinc-900/70 p-2 text-xs text-zinc-200"
                        />
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {wa && (
                            <a
                              href={wa}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover"
                            >
                              Abrir no WhatsApp
                            </a>
                          )}
                          {!o.enviado && <MarcarEnviadaButton outreachId={o.id} />}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {ESTAGIOS_EM_ABERTO.includes(lead.status) && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                    Desfecho
                  </p>
                  <div className="mt-2">
                    <DesfechoButtons leadId={lead.id} />
                  </div>
                </div>
              )}
            </div>
          )}

          {aba === "objecoes" && <ResponderObjecaoPanel leadId={lead.id} />}

          {aba === "proposta" &&
            (diagnostico ? (
              <GerarPropostaButton leadId={lead.id} />
            ) : (
              <p className="text-sm text-muted">
                A proposta usa o Diagnóstico como base — rode o Diagnóstico
                antes.
              </p>
            ))}
        </div>

        {/* F024 — correção de estado, fora das abas: vale pra qualquer uma. */}
        <section className="mt-8 space-y-2 border-t border-border pt-4">
          {lead.status === "descartado" ? (
            <>
              {lead.motivo_descarte && (
                <p className="text-xs text-zinc-500">
                  Descartado: {lead.motivo_descarte}
                </p>
              )}
              <RestaurarButton leadId={lead.id} />
            </>
          ) : (
            <>
              <CorrigirStatusForm leadId={lead.id} statusAtual={lead.status} />
              <DescartarButton leadId={lead.id} />
            </>
          )}
        </section>
      </main>
    );
  } catch (e) {
    if (e instanceof TenantNotFoundError) notFound();
    throw e;
  }
}
