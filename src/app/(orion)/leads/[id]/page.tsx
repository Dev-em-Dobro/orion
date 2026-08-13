// F032 — detalhe do Lead: tela de trabalho com abas.
// Spec: /specs/02-features/F032-interface-do-orion.md
// F015 AC6 — Lead de outro aluno → 404 (não vaza o dado).

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { TenantNotFoundError, requireLeadOwned } from "@/lib/db/scoped";
import { classificarWebsite } from "@/lib/diagnostico/agregador";
import { ROTULO_ATENDIMENTO } from "@/lib/diagnostico/atendimento";
import { demoUrlFor } from "@/lib/demos";
import { ESTAGIOS_EM_ABERTO } from "@/lib/funil";
import { rotuloCategoria } from "@/lib/nichos/catalogo";
import { ehRoteiroFalado, ROTULO_CANAL } from "@/lib/abordagem/canais";
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
import { CopiarButton } from "../copiar-button";
import { CorrigirStatusForm } from "../corrigir-status-form";
import { DescartarButton, RestaurarButton } from "../descarte-buttons";
import { DesfechoButtons } from "../desfecho-buttons";
import { DiagnosticarButton } from "../diagnosticar-button";
import { GerarAbordagemButton } from "../gerar-abordagem-button";
import { GerarPropostaButton } from "../gerar-proposta-button";
import { MarcarEnviadaButton } from "../marcar-enviada-button";
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

    const [diagnostico, dores, abordagens, anterior, proximo, antesCount, total] =
      await Promise.all([
        prisma.diagnostico.findFirst({
          where: { lead_id: lead.id, user_id: userId },
          orderBy: { executado_em: "desc" },
        }),
        prisma.dor.findMany({ where: { lead_id: lead.id, user_id: userId } }),
        prisma.abordagem.findMany({
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
            {/* Categoria em PT (o Places devolve `veterinary_care`). O tier e o
                Valor saíram: são entrada do score, e o score já está no badge
                acima — repetir a fórmula ao lado do resultado não decide nada. */}
            <p className="mt-1 text-sm text-muted">
              {rotuloCategoria(lead.categoria)}
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
                    {/* "Performance mobile" saiu: a nota crua do PageSpeed não
                        dizia o que fazer. O mesmo fato chega como Dor logo
                        abaixo ("site muito lento no celular"), que é acionável,
                        e continua pesando no score via `necessidade`. */}
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

                {/* "Priorizar" saiu de vez: desde a F025 o aprofundamento já
                    recalcula o score e promove o Lead pra `priorizado` — quem
                    chega nesta tela já está priorizado, e o botão só refazia a
                    mesma conta. "Diagnosticar" fica só como saída pro Lead que
                    ainda não tem Diagnóstico: sem ele a aba Proposta pediria um
                    Diagnóstico que não haveria como rodar. */}
                {!diagnostico && (
                  <div className="mt-4 border-t border-border pt-3">
                    <DiagnosticarButton leadId={lead.id} />
                  </div>
                )}
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
              {/* F038 — a ordem dos cards É a recomendação: voz primeiro,
                  texto depois. Texto frio é o que o dono do negócio desliza pra
                  cima sem custo; voz custa atenção, e por isso responde mais. */}
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/[0.06] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold tracking-wide text-emerald-300 uppercase">
                    Ligação ou áudio
                  </p>
                  <span className="badge bg-emerald-500/20 text-emerald-300">
                    Mais eficiente
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-zinc-400">
                  Roteiro pra você ler na ligação ou gravar como áudio no
                  WhatsApp. Quem liga é você — o Orion só escreve.
                </p>
                <div className="mt-3">
                  <GerarAbordagemButton leadId={lead.id} canal="ligacao" destaque />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                    WhatsApp (texto)
                  </p>
                  {!lead.telefone && (
                    <span className="text-xs text-zinc-600">sem telefone</span>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-zinc-500">
                  Alternativa de baixo atrito — ou o follow-up de quem já ouviu
                  o áudio e não respondeu.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <GerarAbordagemButton leadId={lead.id} />
                  <GerarAbordagemButton leadId={lead.id} tipo="followup" />
                </div>
              </div>

              {/* F038 — o site de amostra na mão do aluno, aqui e não só na aba
                  Diagnóstico. Ele mora fora do Orion (`DEMOS_BASE_URL`), então
                  o dono do negócio abre sem login nenhum. A Abordagem de texto
                  já sai com o link embutido; no roteiro falado, não — ninguém
                  soletra URL no telefone —, e é daqui que o aluno copia depois. */}
              {demoUrl && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                    Site de amostra deste Lead
                  </p>
                  <p className="mt-1.5 text-xs text-zinc-500">
                    Link público — o cliente abre sem login. Já vai embutido na
                    abordagem de texto.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <a
                      href={demoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-ghost"
                    >
                      Abrir ↗
                    </a>
                    <CopiarButton texto={demoUrl} rotulo="Copiar link" />
                  </div>
                </div>
              )}

              {/* O canal e-mail (F027) saiu em 2026-08-13 — ver F035,
                  "Saída da Abordagem por e-mail". */}

              {abordagens.length === 0 ? (
                <p className="text-sm text-muted">
                  Nenhuma Abordagem gerada ainda.
                </p>
              ) : (
                <ul className="space-y-3">
                  {abordagens.map((o) => {
                    // F038 AC4 — roteiro falado não vira `wa.me`: pré-preencher
                    // o chat com ele mandaria pro cliente o texto que era pra
                    // ser dito.
                    const falado = ehRoteiroFalado(o.canal);
                    const wa = falado
                      ? null
                      : linkWhatsapp(lead.telefone, o.conteudo);
                    return (
                      <li
                        key={o.id}
                        className="rounded-xl border border-border bg-card p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs text-zinc-500">
                            <span
                              className={falado ? "text-emerald-300" : undefined}
                            >
                              {ROTULO_CANAL[o.canal]}
                            </span>{" "}
                            · {fmtData.format(o.gerado_em)}
                          </span>
                          <span
                            className={`badge ${
                              o.enviado
                                ? "bg-emerald-500/15 text-emerald-300"
                                : "bg-zinc-500/15 text-zinc-400"
                            }`}
                          >
                            {o.enviado
                              ? falado
                                ? "falado"
                                : "enviado"
                              : "não enviado"}
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
                          rows={falado ? 8 : 5}
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
                          <CopiarButton
                            texto={o.conteudo}
                            rotulo={falado ? "Copiar roteiro" : "Copiar texto"}
                          />
                          {!o.enviado && (
                            <MarcarEnviadaButton
                              abordagemId={o.id}
                              rotulo={
                                falado ? "Já falei com ele" : "Marcar como enviada"
                              }
                            />
                          )}
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
