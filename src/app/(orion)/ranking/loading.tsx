import { PageSkeletonHeader, SkeletonPulse } from "@/components/page-skeleton";

// A `/ranking` é de largura cheia com o quadro em `max-w-2xl` — o esqueleto
// segue a mesma composição, senão o título nasce centrado e salta pra esquerda
// quando a página chega.
export default function Loading() {
  return (
    <main
      className="px-6 py-8 lg:px-8"
      aria-busy="true"
      aria-label="Carregando ranking"
    >
      <PageSkeletonHeader tituloLargo />
      <div className="mt-6 max-w-2xl">
        <SkeletonPulse className="h-64 w-full" />
      </div>
      <SkeletonPulse className="mt-8 h-32 w-full max-w-2xl" />
    </main>
  );
}
