// F031 — Central de Tarefas: o que o Orion está cobrando.
// Spec: /specs/02-features/F031-central-de-tarefas.md
//
// In-app, sem cron (ADR-002 preservado): a lista é derivada do banco quando o
// aluno abre a página. A limitação, dita na cara: o Orion cobra quem entra —
// não puxa de volta quem sumiu. Pra isso seria job agendado + e-mail, e isso
// exige ADR próprio.

import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/empty-state";
import { SkeletonPulse } from "@/components/page-skeleton";
import { tarefasDoUsuario } from "@/lib/tarefas/consultar";
import { ListaTarefas } from "./lista-tarefas";

export const dynamic = "force-dynamic";

async function Conteudo() {
  const tarefas = await tarefasDoUsuario();

  if (tarefas.length === 0) {
    return (
      <EmptyState
        titulo="Nada atrasado"
        descricao="Quando uma abordagem ficar sem resposta ou uma proposta parar, a cobrança aparece aqui."
        acao={{ href: "/", label: "Ver a fila de hoje" }}
      />
    );
  }

  return <ListaTarefas tarefas={tarefas} />;
}

export default function TarefasPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Tarefas</h1>
      <p className="mt-1 text-sm text-muted">
        O que ficou parado, do mais esquecido para o menos.{" "}
        <Link href="/" className="text-primary hover:underline">
          A fila de hoje
        </Link>{" "}
        é quem abordar; aqui é o que cobrar.
      </p>

      <div className="mt-6">
        <Suspense fallback={<SkeletonPulse className="h-40 w-full" />}>
          <Conteudo />
        </Suspense>
      </div>
    </main>
  );
}
