import { cookies } from "next/headers";
import { cache, Suspense } from "react";
import { BannerChaves } from "@/components/banner-chaves";
import { EmptyState } from "@/components/empty-state";
import { FunilChart } from "@/components/funil-chart";
import { chavesEssenciaisFaltando } from "@/lib/chaves";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/db/scoped";
import {
  COLUNAS_SILHUETA,
  COLUNA_POR_ID,
  contarPorColuna,
  ESTAGIOS_EM_ABERTO,
  ESTAGIOS_FUNIL,
  ONDE_NAO_DESCARTADO,
} from "@/lib/funil";
import { hrefDoEstagio } from "@/lib/leads/filtros";
import { asTema, classeDoTema, TEMA_COOKIE } from "@/lib/tema";
import { metaDoMes } from "@/lib/metas";
import type { LeadStatus } from "@prisma/client";
import { SkeletonPulse } from "@/components/page-skeleton";
import { FilaDoDia } from "./fila-do-dia";
import { PraFazerAgora } from "./pra-fazer-agora";

// Dashboard sempre reflete só os dados do aluno (F015).
export const dynamic = "force-dynamic";

// F010 (revisão 2026-08-13) — o Dashboard não tem mais lista própria de
// estágios. Tinha uma, com 9 status soltos e os mesmos hexes copiados do
// `lib/funil.ts`, e por isso as contagens não batiam com o kanban: lá
// `enriquecido` + `priorizado` são uma coluna só ("Prontos"). Agora as duas
// telas leem `COLUNAS_FUNIL`.
//
// `novo` fica fora da silhueta: Lead coletado e ainda não aprofundado não é
// etapa de venda, é trabalho na fila — e a Fila do dia, logo abaixo nesta
// mesma tela, já mostra quantos são com o botão de aprofundar do lado.
const ESTAGIOS_CONTADOS: LeadStatus[] = ESTAGIOS_FUNIL;

/**
 * Contagem por estágio. Era um `findMany` de **todos** os Leads do tenant só
 * para contar em memória; virou `groupBy`, que o banco resolve pelo índice.
 *
 * Memoizado por request (F028 H5): o funil e a faixa de resultado leem a mesma
 * coisa, e agora vivem em blocos `<Suspense>` diferentes.
 */
const contarPorStatus = cache(async (): Promise<Record<LeadStatus, number>> => {
  const { whereUser } = await requireTenant();
  const linhas = await prisma.lead.groupBy({
    by: ["status"],
    // F024 — descartado nunca esteve na disputa: fica fora das contagens.
    where: { ...whereUser, ...ONDE_NAO_DESCARTADO },
    _count: { _all: true },
  });
  const contagem = Object.fromEntries(
    ESTAGIOS_CONTADOS.map((s) => [s, 0]),
  ) as Record<LeadStatus, number>;
  for (const linha of linhas) contagem[linha.status] = linha._count._all;
  return contagem;
});

async function PainelFunil() {
  const { userId } = await requireTenant();
  const [porStatus, faltandoChaves] = await Promise.all([
    contarPorStatus(),
    chavesEssenciaisFaltando(userId),
  ]);
  const semChaves = faltandoChaves.length > 0;
  const total = Object.values(porStatus).reduce((soma, n) => soma + n, 0);

  // Silhueta: as colunas do kanban, sem `perdidos` (vazamento lateral).
  const porColuna = contarPorColuna(porStatus, COLUNAS_SILHUETA);
  const perdidos = COLUNA_POR_ID.get("perdidos");
  const maxEstagio = Math.max(1, ...porColuna.map((c) => c.total));

  const funilStages = porColuna.map(({ coluna, total: valor }) => ({
    id: coluna.id,
    label: coluna.titulo,
    value: valor,
    color: coluna.cor,
    // Clicar na coluna abre a lista filtrada por TODOS os status dela — senão
    // o número da barra não bateria com o que a lista mostra.
    href: hrefDoEstagio(coluna.id),
  }));

  return (
    <section className="card">
      <h2 className="card-title">Funil por estágio</h2>
      <p className="card-sub">Clique em um estágio para ver os Leads dele.</p>
      {total === 0 ? (
        <div className="mt-4">
          <EmptyState
            titulo={
              semChaves
                ? "Configure as chaves pra começar"
                : "Nenhum Lead no funil"
            }
            descricao={
              semChaves
                ? "Cole Google + provedor de IA em Configuração. Sem isso a coleta e a Abordagem não rodam."
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
          perdido={{
            value: porStatus.perdido,
            max: maxEstagio,
            href: hrefDoEstagio(perdidos?.id ?? "perdido"),
          }}
        />
      )}
    </section>
  );
}

/**
 * A meta é PISO, não teto — o oposto da cota do medidor. Por isso mora aqui, no
 * bloco de resultado, e é desenhada como conquista: barra que enche, "faltam
 * N", e um estado de meta batida. Ver `lib/metas.ts`.
 */
async function MetaAbordagem() {
  const { userId } = await requireTenant();
  const meta = await metaDoMes(userId);

  return (
    <section className="card sm:col-span-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="metric-label">Leads abordados este mês</p>
        {meta.batida ? (
          <span className="text-sm font-semibold text-primary">
            meta batida 🎯
          </span>
        ) : (
          <span className="text-sm text-muted">
            faltam <strong className="font-mono text-zinc-200">{meta.restante}</strong>
          </span>
        )}
      </div>

      <p className="metric-value">
        {meta.abordados}
        <span className="text-2xl text-muted">/{meta.meta}</span>
      </p>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${Math.round(meta.fracao * 100)}%` }}
        />
      </div>

      <p className="metric-nota">
        Conta Lead com abordagem marcada como enviada. Vários follow-ups pro
        mesmo Lead contam uma vez.
      </p>
    </section>
  );
}

async function Resultado() {
  const porStatus = await contarPorStatus();
  // Em aberto: no funil de venda e ainda sem desfecho final.
  const emAberto = ESTAGIOS_EM_ABERTO.reduce(
    (soma, st) => soma + porStatus[st],
    0,
  );

  return (
    <>
      <section className="card">
        <p className="metric-label">Ganhos</p>
        <p className="metric-value text-primary">{porStatus.ganho}</p>
        <p className="metric-nota">{porStatus.perdido} perdido(s)</p>
      </section>
      <section className="card">
        <p className="metric-label">Em aberto</p>
        <p className="metric-value text-amber-300">{emAberto}</p>
        <p className="metric-nota">contatado → proposta, sem desfecho</p>
      </section>
    </>
  );
}

export default async function DashboardPage() {
  // A `/` não pode ter `loading.tsx`: o boundary ficaria no segmento `(orion)`
  // e cobriria a `/leads`, onde o `notFound()` do detalhe chegaria depois do
  // 200 (ver `page-skeleton.tsx`). Em vez disso a casca pinta na hora e cada
  // bloco chega em streaming.
  const tema = asTema((await cookies()).get(TEMA_COOKIE)?.value);

  return (
    <>
      <BannerChaves />
      <main
        className={`${classeDoTema(tema)} min-h-[calc(100vh-3.5rem)] px-6 py-8 lg:px-8`}
      >
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-base text-muted">
          Funil de prospecção · visão geral
        </p>

        {/* F032 (2026-08-13) — três perguntas, um bloco cada. "O que fazer" na
            coluna larga porque a Fila do dia renderiza o card de Lead inteiro
            (~320px). A coluna da esquerda é o primeiro ponto de leitura, o que
            preserva a prioridade da F025.

            Meio a meio, e não 2/3 + 1/3: no rail de um terço o funil ficava
            espremido — a silhueta passava por cima do rótulo do estágio e o
            card inteiro virava uma coluna estreita. A Fila do dia continua
            comportando duas colunas de card em 50%. */}
        <div className="mt-6 grid items-start gap-5 lg:grid-cols-2">
          <div className="space-y-6">
            <Suspense fallback={<SkeletonPulse className="h-64 w-full" />}>
              <FilaDoDia />
            </Suspense>

            {/* F031 — o par da fila: quem abordar (acima) + o que cobrar (aqui). */}
            <Suspense fallback={<SkeletonPulse className="h-32 w-full" />}>
              <PraFazerAgora />
            </Suspense>
          </div>

          <Suspense fallback={<SkeletonPulse className="h-96 w-full" />}>
            <PainelFunil />
          </Suspense>
        </div>

        {/* O que já fiz: esforço (meta de abordagem) + resultado. */}
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Suspense fallback={<SkeletonPulse className="h-40 w-full sm:col-span-2" />}>
            <MetaAbordagem />
          </Suspense>
          <Suspense
            fallback={
              <>
                <SkeletonPulse className="h-32 w-full" />
                <SkeletonPulse className="h-32 w-full" />
              </>
            }
          >
            <Resultado />
          </Suspense>
        </div>
      </main>
    </>
  );
}
