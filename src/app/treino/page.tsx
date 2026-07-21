// F013 — página de treino (roleplay). Server component: lê Leads como
// cenário (categoria + dores derivadas). Spec: F013-simulador-de-venda.md.

import { BannerChaves } from "@/components/banner-chaves";
import { EmptyState } from "@/components/empty-state";
import { chavesEssenciaisFaltando } from "@/lib/chaves";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/db/scoped";
import { detectarDores, textosDasDores } from "@/lib/dores";
import { Simulador } from "./simulador";

export const dynamic = "force-dynamic";

export default async function TreinoPage() {
  const { whereUser, userId } = await requireTenant();
  const [leads, faltando] = await Promise.all([
    prisma.lead.findMany({
      where: { ...whereUser, diagnosticos: { some: {} } },
      orderBy: { score: "desc" },
      take: 50,
      include: {
        diagnosticos: { orderBy: { executado_em: "desc" }, take: 1 },
        dores: true,
      },
    }),
    chavesEssenciaisFaltando(userId),
  ]);

  const opcoes = leads
    .map((l) => {
      const diag = l.diagnosticos[0];
      if (!diag) return null;
      const dores =
        l.dores.length > 0
          ? textosDasDores(l.dores)
          : textosDasDores(detectarDores(diag, l.website));
      return {
        id: l.id,
        nome: l.nome,
        categoria: l.categoria,
        dores,
      };
    })
    .filter((o): o is NonNullable<typeof o> => o !== null);

  const precisaIa = faltando.some((t) => t !== "google");

  return (
    <>
      <BannerChaves />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-bold tracking-tight">
          Simulador de venda
        </h1>
        <p className="mt-1 text-sm text-muted">
          Treine a conversa contra um dono de negócio cético e receba um
          Scorecard no fim. Nada aqui é salvo (F013).
        </p>

        <div className="mt-6">
          {precisaIa ? (
            <EmptyState
              titulo="Configure o provedor de IA"
              descricao="O treino usa a sua chave (Anthropic, OpenAI ou Gemini). Escolha o provedor e cole a chave em Configuração."
              acao={{ href: "/configuracao", label: "Ir para Configuração" }}
            />
          ) : opcoes.length === 0 ? (
            <EmptyState
              titulo="Sem cenários ainda"
              descricao="Diagnosticar pelo menos um Lead em /leads libera cenários aqui (categoria + dores)."
              acao={{ href: "/leads", label: "Ir para Leads" }}
            />
          ) : (
            <Simulador leads={opcoes} />
          )}
        </div>
      </main>
    </>
  );
}
