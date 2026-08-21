import { PageSkeletonHeader, SkeletonPulse } from "@/components/page-skeleton";

// O grupo `(lista)` existe só pra isto: `/skills` ganha boundary de rota sem
// que ele alcance `/skills/[slug]`, que chama `notFound()` e precisa de 404 de
// verdade (F015 AC6 — ver `tests/unit/notfound-sem-boundary.test.ts`). Grupo de
// rota não entra na URL, mas entra na árvore de layout/loading.
//
// Sem isto, clicar em Skills no menu esperava o gate de compra (`layout.tsx`
// faz consulta no banco) sem pintar nada na tela.
export default function Loading() {
  return (
    <main
      className="mx-auto max-w-4xl px-6 py-10"
      aria-busy="true"
      aria-label="Carregando skills"
    >
      <PageSkeletonHeader />
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonPulse key={i} className="h-24 w-full" />
        ))}
      </div>
    </main>
  );
}
