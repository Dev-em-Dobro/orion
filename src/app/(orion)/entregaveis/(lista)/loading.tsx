import { PageSkeletonHeader, SkeletonPulse } from "@/components/page-skeleton";

// Mesmo motivo do grupo `(lista)` das Skills: boundary pra `/entregaveis` sem
// alcançar `/entregaveis/[slug]`, que depende de `notFound()`. E aqui o ganho é
// maior — o `layout.tsx` gateia por compra verificada, então a espera antes de
// qualquer pixel era a consulta da compra.
export default function Loading() {
  return (
    <main
      className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10"
      aria-busy="true"
      aria-label="Carregando materiais"
    >
      <PageSkeletonHeader />
      <div className="mt-6 space-y-3 sm:mt-8">
        <SkeletonPulse className="h-4 w-36" />
        {Array.from({ length: 3 }, (_, i) => (
          <SkeletonPulse key={i} className="h-32 w-full" />
        ))}
      </div>
    </main>
  );
}
