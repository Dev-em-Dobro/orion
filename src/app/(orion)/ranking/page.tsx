// F037 — Ranking de Builders do mês.
// Spec: /specs/02-features/F037-ranking-de-builders.md

import Link from "next/link";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { requireTenant } from "@/lib/db/scoped";
import { requireUser } from "@/lib/auth/require-user";
import { rotuloCompetencia } from "@/lib/planos";
import { competenciaDe, obterPerfilPublico, rankingDoMes } from "@/lib/ranking";
import { asTema, classeDoTema, TEMA_COOKIE } from "@/lib/tema";
import { EmptyState } from "@/components/empty-state";
import { SkeletonPulse } from "@/components/page-skeleton";

export const dynamic = "force-dynamic";

const MEDALHA = ["🥇", "🥈", "🥉"];

async function Quadro({ competencia }: { competencia: string }) {
  const [{ userId }, user] = await Promise.all([requireTenant(), requireUser()]);
  const [ranking, perfil] = await Promise.all([
    rankingDoMes(userId, competencia),
    obterPerfilPublico(userId, user.name ?? null),
  ]);

  if (ranking.participantes === 0) {
    return (
      <EmptyState
        titulo="Ninguém registrou venda este mês ainda"
        descricao="A primeira venda marcada como ganha abre o quadro. Pode ser a sua."
        acao={{ href: "/funil", label: "Ver meu funil" }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <ol className="space-y-2">
        {ranking.top.map((linha) => (
          <li
            key={`${linha.posicao}-${linha.nomeExibicao}`}
            className={`flex items-center gap-4 rounded-xl border p-4 ${
              linha.ehVoce
                ? "border-primary/60 bg-primary/5"
                : "border-border bg-card"
            }`}
          >
            <span className="w-8 shrink-0 text-center font-mono text-lg">
              {MEDALHA[linha.posicao - 1] ?? linha.posicao}
            </span>
            <span className="min-w-0 flex-1 truncate font-medium">
              {linha.nomeExibicao}
              {linha.ehVoce && (
                <span className="ml-2 text-xs text-primary">você</span>
              )}
            </span>
            <span className="shrink-0 font-mono text-sm">
              {linha.vendas}
              <span className="text-muted">
                {" "}
                venda{linha.vendas === 1 ? "" : "s"}
              </span>
            </span>
          </li>
        ))}
      </ol>

      {/* A linha do próprio aluno aparece SEMPRE, mesmo fora do top e mesmo
          sem opt-in: ranking onde a pessoa não se acha não engaja (AC10). */}
      {ranking.voce && !ranking.top.some((l) => l.ehVoce) && (
        <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
          <p className="text-sm">
            <strong className="font-mono">{ranking.voce.posicao}º</strong> ·{" "}
            {ranking.voce.vendas} venda
            {ranking.voce.vendas === 1 ? "" : "s"} suas este mês
          </p>
          {!perfil.optin && (
            <p className="mt-1 text-xs text-muted">
              Só você está vendo esta linha — você ainda não entrou no ranking.
            </p>
          )}
        </div>
      )}

      {!perfil.optin && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-zinc-200">
            Você não aparece no ranking.
          </p>
          <p className="mt-1 text-sm text-muted">
            Entrar publica só o seu nome de exibição e o número de vendas do
            mês. Nenhum Lead, cliente, cidade ou valor fica visível.
          </p>
          <Link href="/configuracao" className="btn-primary mt-3 inline-block">
            Entrar no ranking
          </Link>
        </div>
      )}

      {ranking.anonimos > 0 && (
        <p className="text-xs text-muted">
          {ranking.anonimos} Builder(s) venderam este mês mas não estão no
          quadro público.
        </p>
      )}
    </div>
  );
}

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const [sp, jar] = await Promise.all([searchParams, cookies()]);
  const tema = asTema(jar.get(TEMA_COOKIE)?.value);
  const competencia = /^\d{4}-\d{2}$/.test(sp.mes ?? "")
    ? (sp.mes as string)
    : competenciaDe(new Date());

  return (
    <main
      className={`${classeDoTema(tema)} min-h-[calc(100vh-3.5rem)] px-6 py-8 lg:px-8`}
    >
      <h1 className="text-2xl font-bold tracking-tight">
        Ranking de Builders
      </h1>
      <p className="mt-1 text-sm text-muted">
        {rotuloCompetencia(competencia)} · os 3 primeiros do mês ganham prêmio.
        Todo mês zera.
      </p>

      <div className="mt-6 max-w-2xl">
        <Suspense fallback={<SkeletonPulse className="h-64 w-full" />}>
          <Quadro competencia={competencia} />
        </Suspense>
      </div>

      <div className="mt-8 max-w-2xl rounded-xl border border-border bg-card p-4 text-xs text-muted">
        <p className="font-semibold text-zinc-300">Como a conta é feita</p>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>
            Conta o Lead marcado como <strong>ganho</strong> dentro do mês, que
            tenha Diagnóstico e uma abordagem marcada como enviada.
          </li>
          <li>
            Empate: quem chegou ao número primeiro fica na frente.
          </li>
          <li>
            O prêmio passa por <strong>conferência</strong> do funil dos três
            primeiros antes de ser entregue.
          </li>
          <li>
            Venda fechada fora do Orion não entra — o ranking premia quem usa o
            motor.
          </li>
        </ul>
      </div>
    </main>
  );
}
