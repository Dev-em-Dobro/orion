"use server";

// F039 — estado dos primeiros passos, carregado quando o painel abre.
// Spec: /specs/02-features/F039-primeiros-passos.md
//
// Action fina, só orquestra `src/lib/`. É uma **leitura**, e mora numa action
// em vez de num Server Component de propósito: assim as contagens só rodam no
// clique do aluno. No shell, elas seriam pedágio em toda rota (F028) — foi
// exatamente a conta que tirou o medidor de uso do caminho crítico.

import { requireTenant } from "@/lib/db/scoped";
import { fatosDoAluno } from "@/lib/tutorial/consultar";
import { passosComEstado, type EstadoDosPassos } from "@/lib/tutorial/passos";

export async function carregarPrimeirosPassos(): Promise<EstadoDosPassos> {
  const { userId } = await requireTenant();
  return passosComEstado(await fatosDoAluno(userId));
}
