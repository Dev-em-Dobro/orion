/** Blocos de skeleton compartilhados (loading.tsx das rotas autenticadas). */

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

export function DashboardSkeleton() {
  return (
    <main
      className="mx-auto max-w-6xl px-6 py-8"
      aria-busy="true"
      aria-label="Carregando dashboard"
    >
      <PageSkeletonHeader />
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2 space-y-4">
          <SkeletonPulse className="h-4 w-36" />
          <SkeletonPulse className="mx-auto h-72 w-full max-w-md" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <SkeletonPulse key={i} className="h-7 w-24 rounded-full" />
            ))}
          </div>
        </div>
        <div className="grid gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="card space-y-3">
              <SkeletonPulse className="h-3 w-28" />
              <SkeletonPulse className="h-9 w-16" />
            </div>
          ))}
        </div>
      </div>
      <div className="card mt-4 space-y-3">
        <SkeletonPulse className="h-4 w-40" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonPulse key={i} className="h-16 min-w-[8rem] flex-1" />
          ))}
        </div>
      </div>
    </main>
  );
}

export function LeadsSkeleton() {
  return (
    <main
      className="mx-auto max-w-6xl px-6 py-10"
      aria-busy="true"
      aria-label="Carregando leads"
    >
      <PageSkeletonHeader tituloLargo />
      <div className="card mt-6 space-y-3">
        <div className="flex flex-wrap gap-3">
          <SkeletonPulse className="h-10 flex-1 min-w-[10rem]" />
          <SkeletonPulse className="h-10 flex-1 min-w-[10rem]" />
          <SkeletonPulse className="h-10 w-28" />
        </div>
      </div>
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <SkeletonPulse className="h-4 w-32" />
        <div className="flex gap-3">
          <SkeletonPulse className="h-10 w-40" />
          <SkeletonPulse className="h-10 w-32" />
        </div>
      </div>
      <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-3 py-3">
          <SkeletonPulse className="h-3 w-full max-w-xl" />
        </div>
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-border/60 px-3 py-3 last:border-0"
          >
            <SkeletonPulse className="h-4 w-36" />
            <SkeletonPulse className="h-4 w-24" />
            <SkeletonPulse className="h-5 w-16 rounded-full" />
            <SkeletonPulse className="ml-auto h-4 w-12" />
          </div>
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
