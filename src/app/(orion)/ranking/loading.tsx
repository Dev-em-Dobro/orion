import { PageSkeletonHeader, SkeletonPulse } from "@/components/page-skeleton";

// Mesmo container da `/ranking` (`mx-auto max-w-4xl px-6 py-10`). Esqueleto
// com outra largura é layout shift disfarçado de carregamento — foi o que
// acontecia quando a página era de largura cheia e o esqueleto também: o
// título nascia à esquerda e a página chegava centrada.
export default function Loading() {
  return (
    <main
      className="mx-auto max-w-4xl px-6 py-10"
      aria-busy="true"
      aria-label="Carregando ranking"
    >
      <PageSkeletonHeader tituloLargo />
      <SkeletonPulse className="mt-6 h-64 w-full" />
      <SkeletonPulse className="mt-8 h-32 w-full" />
    </main>
  );
}
