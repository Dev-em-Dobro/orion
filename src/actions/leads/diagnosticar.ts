"use server";

// F002 — Diagnóstico de presença digital.
// Spec: /specs/02-features/F002-diagnostico-de-presenca-digital.md
//
// Casca: valida, resolve chave e delega. A execução vive em
// `src/lib/diagnostico/executar.ts` (compartilhada com o lote da F025) e a
// persistência em `src/lib/diagnostico/persistir.ts`.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirChave } from "@/lib/chaves";
import { mensagemEscopo, requireLeadOwned } from "@/lib/db/scoped";
import {
  executarDiagnostico,
  resumoDiagnostico,
} from "@/lib/diagnostico/executar";
import { persistirDiagnostico } from "@/lib/diagnostico/persistir";

const schema = z.object({
  lead_id: z.string().cuid("lead_id inválido"),
});

export type DiagnosticarState =
  | { kind: "idle" }
  | { kind: "ok"; resumo: string }
  | { kind: "erro"; mensagem: string };

export async function diagnosticarLead(
  _prev: DiagnosticarState,
  formData: FormData,
): Promise<DiagnosticarState> {
  const parsed = schema.safeParse({ lead_id: formData.get("lead_id") });
  if (!parsed.success) {
    return { kind: "erro", mensagem: "lead_id inválido" };
  }

  try {
    const { lead, userId } = await requireLeadOwned(parsed.data.lead_id);
    const googleKey = await exigirChave(userId, "google");

    const dados = await executarDiagnostico(lead.website, googleKey);
    await persistirDiagnostico({ userId, lead, dados });

    revalidatePath("/leads");
    revalidatePath(`/leads/${lead.id}`);
    revalidatePath("/");

    return {
      kind: "ok",
      resumo: `Diagnóstico concluído: ${resumoDiagnostico(dados, lead.website)}.`,
    };
  } catch (e) {
    const escopo = mensagemEscopo(e);
    if (escopo) return { kind: "erro", mensagem: escopo };
    throw e;
  }
}
