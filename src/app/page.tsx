import Link from "next/link";
import { BannerChaves } from "@/components/banner-chaves";
import { EmptyState } from "@/components/empty-state";
import { FunilChart } from "@/components/funil-chart";
import { chavesEssenciaisFaltando } from "@/lib/chaves";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/db/scoped";
import { filaDeFollowUp } from "@/lib/followup";
import { ESTAGIOS_EM_ABERTO, taxasDeConversao } from "@/lib/funil";
import type { LeadStatus } from "@prisma/client";

// Dashboard sempre reflete só os dados do aluno (F015).
export const dynamic = "force-dynamic";

const ESTAGIOS: { status: LeadStatus; label: string; cor: string }[] = [
  { status: "novo", label: "Novo", cor: "#71717a" },
  { status: "enriquecido", label: "Enriquecido", cor: "#0ea5e9" },
  { status: "priorizado", label: "Priorizado", cor: "#8b5cf6" },
  { status: "contatado", label: "Contatado", cor: "#f59e0b" },
  { status: "respondeu", label: "Respondeu", cor: "#06b6d4" },
  { status: "qualificado", label: "Qualificado", cor: "#14b8a6" },
  { status: "proposta", label: "Proposta", cor: "#6366f1" },
  { status: "ganho", label: "Ganho", cor: "#22c55e" },
  { status: "perdido", label: "Perdido", cor: "#ef4444" },
];

const LABEL: Record<LeadStatus, string> = Object.fromEntries(
  ESTAGIOS.map((e) => [e.status, e.label]),
) as Record<LeadStatus, string>;

export default async function DashboardPage() {
  const { whereUser, userId } = await requireTenant();
  const [leads, faltandoChaves] = await Promise.all([
    prisma.lead.findMany({
      where: whereUser,
      orderBy: { score: "desc" },
      include: {
        outreaches: {
          where: { enviado: true },
          orderBy: { enviado_em: "desc" },
          take: 1,
        },
      },
    }),
    chavesEssenciaisFaltando(userId),
  ]);
  const semChaves = faltandoChaves.length > 0;

  const porStatus = Object.fromEntries(
    ESTAGIOS.map((e) => [
      e.status,
      leads.filter((l) => l.status === e.status).length,
    ]),
  ) as Record<LeadStatus, number>;
  const maxEstagio = Math.max(1, ...Object.values(porStatus));

  // Funil (silhueta): estágios de progressão, sem `perdido` (vazamento lateral).
  const funilStages = ESTAGIOS.filter((e) => e.status !== "perdido").map(
    (e) => ({
      id: e.status,
      label: e.label,
      value: porStatus[e.status],
      color: e.cor,
    }),
  );

  const scoreMedio =
    leads.length > 0
      ? Math.round(leads.reduce((soma, l) => soma + l.score, 0) / leads.length)
      : 0;

  // Em aberto: no funil de venda e ainda sem desfecho final.
  const emAberto = ESTAGIOS_EM_ABERTO.reduce(
    (soma, st) => soma + porStatus[st],
    0,
  );

  const taxas = taxasDeConversao(porStatus);

  // Prontos pra contato: score alto e ainda não contatados.
  const exigemAtencao = leads
    .filter(
      (l) =>
        l.score >= 60 &&
        (l.status === "novo" ||
          l.status === "enriquecido" ||
          l.status === "priorizado"),
    )
    .slice(0, 5);

  const followUp = filaDeFollowUp(leads);

  return (
    <>
    <BannerChaves />
    <main className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-sm text-muted">
        Funil de prospecção · visão geral
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <h2 className="text-sm font-semibold tracking-wide text-zinc-300 uppercase">
            Funil por estágio
          </h2>
          {leads.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                titulo={
                  semChaves
                    ? "Configure as chaves pra começar"
                    : "Nenhum Lead no funil"
                }
                descricao={
                  semChaves
                    ? "Cole Google + provedor de IA em Configuração. Sem isso a coleta e o Outreach não rodam."
                    : "Colete os primeiros estabelecimentos em Leads pra encher o funil."
                }
                acao={
                  semChaves
                    ? { href: "/configuracao", label: "Ir para Configuração" }
                    : { href: "/leads", label: "Coletar Leads" }
                }
                secundaria={
                  semChaves
                    ? {
                        href: "/configuracao/tutorial-google",
                        label: "Tutorial Google",
                      }
                    : undefined
                }
              />
            </div>
          ) : (
            <FunilChart
              stages={funilStages}
              perdido={{ value: porStatus.perdido, max: maxEstagio }}
            />
          )}
        </section>

        <div className="grid gap-4">
          <section className="card">
            <p className="text-xs font-medium tracking-wider text-zinc-500 uppercase">
              Total de Leads
            </p>
            <p className="mt-2 font-mono text-3xl font-semibold">
              {leads.length}
            </p>
          </section>
          <section className="card">
            <p className="text-xs font-medium tracking-wider text-zinc-500 uppercase">
              Score médio
            </p>
            <p className="mt-2 font-mono text-3xl font-semibold">
              {scoreMedio}
            </p>
            <p className="mt-1 text-xs text-zinc-500">de 0 a 100</p>
          </section>
          <section className="card">
            <p className="text-xs font-medium tracking-wider text-zinc-500 uppercase">
              Ganhos
            </p>
            <p className="mt-2 font-mono text-3xl font-semibold text-primary">
              {porStatus.ganho}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {porStatus.perdido} perdido(s)
            </p>
          </section>
          <section className="card">
            <p className="text-xs font-medium tracking-wider text-zinc-500 uppercase">
              Em aberto
            </p>
            <p className="mt-2 font-mono text-3xl font-semibold text-amber-300">
              {emAberto}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              contatado → proposta, sem desfecho
            </p>
          </section>
        </div>
      </div>

      <section className="card mt-4">
        <h2 className="text-sm font-semibold tracking-wide text-zinc-300 uppercase">
          Taxas de conversão
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Funil de venda · aproximação sobre o estado atual (sem histórico)
        </p>
        <div className="mt-4 flex flex-wrap items-stretch gap-2">
          {taxas.map((passo) => (
            <div
              key={`${passo.de}-${passo.para}`}
              className="min-w-[8rem] flex-1 rounded-lg border border-border bg-zinc-800/30 px-3 py-2.5"
            >
              <p className="truncate text-xs text-zinc-400">
                {LABEL[passo.de]} → {LABEL[passo.para]}
              </p>
              <p className="mt-1 font-mono text-xl font-semibold text-zinc-100">
                {passo.taxa === null
                  ? "—"
                  : `${Math.round(passo.taxa * 100)}%`}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <h2 className="text-sm font-semibold tracking-wide text-zinc-300 uppercase">
            Exigem atenção
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Score ≥ 60 e ainda sem Outreach enviado
          </p>
          {exigemAtencao.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Nada pendente por aqui.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border/60">
              {exigemAtencao.map((lead) => (
                <li
                  key={lead.id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{lead.nome}</p>
                    <p className="truncate text-xs text-zinc-500">
                      {lead.categoria}
                    </p>
                  </div>
                  <span className="badge shrink-0 bg-emerald-500/15 font-mono text-emerald-300">
                    {lead.score}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/leads"
            className="mt-3 inline-block text-sm text-primary transition-colors hover:text-primary-hover hover:underline"
          >
            Abrir Leads →
          </Link>
        </section>

        <section className="rounded-xl border border-red-500/30 bg-red-500/[0.06] p-5">
          <h2 className="text-sm font-semibold tracking-wide text-red-300 uppercase">
            Follow-up pendente
          </h2>
          <p className="mt-1 text-xs text-red-300/60">
            Contatados sem resposta há 3+ dias
          </p>
          {followUp.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Ninguém esperando.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {followUp.map(({ lead, dias }) => (
                <li
                  key={lead.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="truncate font-medium">{lead.nome}</span>
                  <span className="badge shrink-0 bg-red-500/15 font-mono text-red-300">
                    {dias}d
                  </span>
                </li>
              ))}
            </ul>
          )}
          {followUp.length > 0 && (
            <Link
              href="/leads"
              className="mt-3 inline-block text-sm text-red-300 transition-colors hover:text-red-200 hover:underline"
            >
              Resolver →
            </Link>
          )}
        </section>
      </div>
    </main>
    </>
  );
}
