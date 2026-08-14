// F013 — página de treino (roleplay). Server component: lê Leads como
// cenário (categoria + dores derivadas). Spec: F013-simulador-de-venda.md.

import type { Metadata } from "next";
import { BannerChaves } from "@/components/banner-chaves";
import { EmptyState } from "@/components/empty-state";
import { chavesEssenciaisFaltando } from "@/lib/chaves";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/db/scoped";
import { Simulador } from "./simulador";

export const metadata: Metadata = { title: "Simulador de venda" };

export const dynamic = "force-dynamic";

export default async function TreinoPage() {
  const { whereUser, userId } = await requireTenant();
  const [leads, faltando] = await Promise.all([
    prisma.lead.findMany({
      where: { ...whereUser, diagnosticos: { some: {} } },
      orderBy: { score: "desc" },
      take: 50,
      // Só o que a tela mostra na lista. As Dores ficam no servidor: quem monta
      // o cenário é a action, lendo do banco (F013, emenda de 2026-08-14).
      select: { id: true, nome: true, categoria: true },
    }),
    chavesEssenciaisFaltando(userId),
  ]);

  const opcoes = leads;

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

        <div className="mt-4">
          
        </div>

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
