// Blocos de skeleton compartilhados.
//
// F015 AC6 / F028: as rotas com Lead (`/leads`, `/leads/[id]`) NÃO têm
// `loading.tsx`. Um boundary de rota faz o Next enviar o shell antes da
// página resolver, e aí `notFound()` chega tarde demais para virar 404.
// O skeleton dessas telas vive num `<Suspense>` dentro da própria página.

export function SkeletonPulse({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-zinc-800/70 ${className}`}
      aria-hidden
    />
  );
}

export function PageSkeletonHeader({
  tituloLargo = false,
}: {
  tituloLargo?: boolean;
}) {
  return (
    <div className="space-y-2">
      <SkeletonPulse className={tituloLargo ? "h-8 w-56" : "h-8 w-40"} />
      <SkeletonPulse className="h-4 w-72 max-w-full" />
    </div>
  );
}


/** F032 — a grade de cards, usada como fallback do `<Suspense>` da lista. */
export function GridLeadsSkeleton() {
  return (
    <div className="@container mt-8" aria-busy="true" aria-label="Carregando leads">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div className="flex gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonPulse key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
        <div className="flex gap-3">
          <SkeletonPulse className="h-10 w-40" />
          <SkeletonPulse className="h-10 w-32" />
        </div>
      </div>
      <SkeletonPulse className="h-4 w-32" />
      {/* Mesmos breakpoints do `LeadsGrid`: esqueleto com outra contagem de
          colunas é layout shift disfarçado de carregamento. */}
      <div className="mt-3 grid gap-3 @2xl:grid-cols-2 @4xl:grid-cols-3 @7xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="space-y-3 rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <SkeletonPulse className="h-4 w-32" />
              <SkeletonPulse className="h-5 w-16 rounded-full" />
            </div>
            <SkeletonPulse className="h-3 w-24" />
            <SkeletonPulse className="h-3 w-full" />
            <SkeletonPulse className="h-8 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}


/**
 * Larguras de conteúdo em uso pelas páginas. O esqueleto tem que usar a MESMA
 * da rota que ele está anunciando: `RotaSkeleton` nasceu com um `max-w-6xl`
 * fixo, e como as páginas vão de `max-w-2xl` (Configuração) a `max-w-[100rem]`
 * (Funil), o conteúdo pulava de largura no instante em que chegava. Esqueleto
 * que não bate com a página é layout shift disfarçado de carregamento.
 */
const LARGURAS = {
  estreita: "mx-auto max-w-2xl",
  media: "mx-auto max-w-3xl",
  larga: "mx-auto max-w-4xl",
  extra: "mx-auto max-w-5xl",
  /** Kanban e listas que usam a tela inteira — sem teto, só respiro lateral. */
  cheia: "max-w-none",
} as const;

export type LarguraRota = keyof typeof LARGURAS;

/**
 * Skeleton genérico de rota, usado pelos `loading.tsx` do menu. Substituiu o
 * spinner que a sidebar mostrava por item: cada `NavLink` tinha o próprio
 * `useTransition`, então clicar em três menus seguidos deixava três spinners
 * girando ao mesmo tempo — nenhum deles descrevendo o que estava carregando.
 * O feedback passa a ser a forma da página que está chegando.
 */
export function RotaSkeleton({
  titulo = "medio",
  blocos = 3,
  largura = "larga",
  /** `py-10` na maioria das rotas; `py-8` nas que usam a tela cheia. */
  respiro = "py-10",
  rotulo = "Carregando",
}: {
  titulo?: "curto" | "medio";
  /** Quantos retângulos de conteúdo desenhar abaixo do cabeçalho. */
  blocos?: number;
  largura?: LarguraRota;
  respiro?: "py-8" | "py-10";
  /** O que está carregando — vai pro leitor de tela. */
  rotulo?: string;
}) {
  return (
    <main
      className={`${LARGURAS[largura]} px-6 ${respiro}`}
      aria-busy="true"
      aria-label={rotulo}
    >
      <PageSkeletonHeader tituloLargo={titulo === "medio"} />
      <div className="mt-8 space-y-4">
        {Array.from({ length: blocos }, (_, i) => (
          <SkeletonPulse key={i} className="h-28 w-full" />
        ))}
      </div>
    </main>
  );
}

/** Colunas do kanban: o esqueleto tem a forma do board, não três barras. */
export function FunilSkeleton() {
  return (
    <main
      className="mx-auto max-w-[100rem] px-6 py-10"
      aria-busy="true"
      aria-label="Carregando funil"
    >
      <PageSkeletonHeader />
      <div className="mt-6 flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className="coluna-funil w-64 shrink-0 space-y-2 rounded-xl border border-border bg-zinc-900/30 p-3"
          >
            <SkeletonPulse className="h-4 w-28" />
            {Array.from({ length: 3 - (i % 2) }, (_, j) => (
              <SkeletonPulse key={j} className="h-20 w-full" />
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}

/** Três colunas de plano lado a lado. */
export function PlanosSkeleton() {
  return (
    <main
      className="mx-auto max-w-5xl px-6 py-10"
      aria-busy="true"
      aria-label="Carregando planos"
    >
      <PageSkeletonHeader />
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <SkeletonPulse key={i} className="h-96 w-full" />
        ))}
      </div>
    </main>
  );
}

export function TreinoSkeleton() {
  return (
    <main
      className="mx-auto max-w-3xl px-6 py-10"
      aria-busy="true"
      aria-label="Carregando treino"
    >
      <PageSkeletonHeader />
      <div className="card mt-6 space-y-4">
        <SkeletonPulse className="h-4 w-48" />
        <SkeletonPulse className="h-10 w-full" />
        <SkeletonPulse className="h-32 w-full" />
        <SkeletonPulse className="h-10 w-36" />
      </div>
    </main>
  );
}

export function ConfiguracaoSkeleton() {
  return (
    <main
      className="mx-auto max-w-2xl px-6 py-10"
      aria-busy="true"
      aria-label="Carregando configuração"
    >
      <PageSkeletonHeader tituloLargo />
      <div className="mt-8 space-y-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="card space-y-3">
            <SkeletonPulse className="h-4 w-40" />
            <SkeletonPulse className="h-10 w-full" />
            <div className="flex gap-2">
              <SkeletonPulse className="h-8 w-24" />
              <SkeletonPulse className="h-8 w-20" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

/** Texto corrido: Skills e Materiais são documento, não painel. */
export function DocumentoSkeleton({ rotulo }: { rotulo: string }) {
  return (
    <main
      className="mx-auto max-w-3xl px-6 py-10"
      aria-busy="true"
      aria-label={rotulo}
    >
      <PageSkeletonHeader />
      <div className="mt-8 space-y-6">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="space-y-2">
            <SkeletonPulse className="h-4 w-40" />
            <SkeletonPulse className="h-4 w-full" />
            <SkeletonPulse className="h-4 w-11/12" />
            <SkeletonPulse className="h-4 w-9/12" />
          </div>
        ))}
      </div>
    </main>
  );
}
