// F025 — "Sua fila de hoje": os melhores Leads acionáveis agora.
// Spec: /specs/02-features/F025-fila-do-dia.md
//
// Não é tabela nem entidade: é uma consulta. Muda sozinha conforme o aluno
// trabalha — abordou, sai da fila; descartou, sai da fila; aprofundou mais,
// entra gente nova.

import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/db/scoped";
import { AprofundarButton } from "./leads/aprofundar-button";
import { INCLUDE_CARD, paraCardProps } from "./leads/card-props";
import { LeadsGrid } from "./leads/leads-grid";

export const FILA_TAMANHO = 10;

export async function FilaDoDia() {
  const { whereUser } = await requireTenant();

  const [leads, aguardandoAprofundamento] = await Promise.all([
    prisma.lead.findMany({
      where: {
        ...whereUser,
        // Já diagnosticado e ainda não abordado.
        status: { in: ["priorizado", "enriquecido"] },
        // Score confirmado — Lead com score de Triagem ainda não é fila.
        score_estimado: false,
        // Quem já foi abordado vira cobrança na Central de Tarefas (F031),
        // não fila de abordagem.
        outreaches: { none: { enviado: true } },
      },
      orderBy: [{ score: "desc" }, { status_em: "asc" }],
      take: FILA_TAMANHO,
      include: INCLUDE_CARD,
    }),
    prisma.lead.count({
      where: { ...whereUser, score_estimado: true, status: "novo" },
    }),
  ]);

  const cards = leads.map((lead) => paraCardProps(lead, `/leads/${lead.id}`));

  return (
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-zinc-300 uppercase">
            Sua fila de hoje
          </h2>
          <p className="mt-1 text-xs text-muted">
            Diagnosticados, priorizados e ainda não abordados — do melhor para
            o pior.
          </p>
        </div>
        {aguardandoAprofundamento > 0 && (
          <AprofundarButton
            rotulo={`Aprofundar próximos 10 (${aguardandoAprofundamento} na espera)`}
          />
        )}
      </div>

      <div className="mt-4">
        {cards.length > 0 ? (
          <LeadsGrid leads={cards} comSelecao={false} />
        ) : aguardandoAprofundamento > 0 ? (
          <p className="text-sm text-muted">
            Você tem {aguardandoAprofundamento} Lead(s) coletado(s) esperando
            diagnóstico. Aprofunde os melhores para montar a fila.
          </p>
        ) : (
          <p className="text-sm text-muted">
            Nada na fila.{" "}
            <Link href="/leads" className="text-primary hover:underline">
              Faça uma busca
            </Link>{" "}
            para trazer Leads novos.
          </p>
        )}
      </div>
    </section>
  );
}
