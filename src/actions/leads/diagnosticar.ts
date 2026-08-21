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
import { estornarCota, reservarCota } from "@/lib/limites";
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

  let reservou = false;
  let userId: string | null = null;

  try {
    const { lead, userId: uid } = await requireLeadOwned(parsed.data.lead_id);
    userId = uid;

    // F035 (2026-08-13) — o teto **mensal** saiu daqui: passou a ser cobrado na
    // coleta, que é onde está o custo (Places). Diagnosticar usa PageSpeed, que
    // é grátis.
    //
    // A cota **diária** (F018), essa fica — e passou a ser reservada aqui
    // também. Até 2026-08-13 só o lote reservava, e o botão individual só
    // aparecia pra Lead sem Diagnóstico, então o conjunto era finito. Com o
    // "Rediagnosticar" sempre disponível, sem isto viraria um loop de chamadas
    // externas sem teto nenhum.
    await reservarCota(uid, "diagnostico");
    reservou = true;

    const googleKey = await exigirChave(uid, "google");

    const { dados, email } = await executarDiagnostico(
      lead.website,
      googleKey,
    );
    await persistirDiagnostico({ userId: uid, lead, dados, email });

    revalidatePath("/leads");
    revalidatePath(`/leads/${lead.id}`);
    revalidatePath("/");

    return {
      kind: "ok",
      resumo: `Diagnóstico concluído: ${resumoDiagnostico(dados, lead.website)}.`,
    };
  } catch (e) {
    // Diagnóstico que falhou não gastou PageSpeed: devolve a cota, senão a
    // tentativa frustrada custa o mesmo que a bem-sucedida.
    if (reservou && userId) {
      await estornarCota(userId, "diagnostico").catch(() => undefined);
    }
    const escopo = mensagemEscopo(e);
    if (escopo) return { kind: "erro", mensagem: escopo };
    throw e;
  }
}
