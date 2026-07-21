// F015 AC6 — acesso por id: Lead de outro aluno → 404 (não vaza o dado).

import Link from "next/link";
import { notFound } from "next/navigation";
import { TenantNotFoundError, requireLeadOwned } from "@/lib/db/scoped";

export const dynamic = "force-dynamic";

export default async function LeadByIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const { lead } = await requireLeadOwned(id);
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-sm text-zinc-500">
          <Link href="/leads" className="hover:text-primary">
            ← Leads
          </Link>
        </p>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">{lead.nome}</h1>
        <p className="mt-1 text-sm text-muted">{lead.categoria}</p>
        <p className="mt-4 text-sm text-zinc-400">{lead.endereco}</p>
      </main>
    );
  } catch (e) {
    if (e instanceof TenantNotFoundError) notFound();
    throw e;
  }
}
