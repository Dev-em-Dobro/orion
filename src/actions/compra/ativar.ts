"use server";

// F019.1 — verificar e-mail da compra Hubla.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/require-user";
import {
  CompraJaVinculadaError,
  CompraNaoEncontradaError,
  verificarCompraManual,
} from "@/lib/compra";

const schema = z.object({
  email: z.string().trim().min(3, "Informe o e-mail da compra."),
});

export type AtivarActionState =
  | { kind: "idle" }
  | { kind: "ok"; mensagem: string }
  | { kind: "erro"; mensagem: string };

export async function verificarCompraAction(
  _prev: AtivarActionState,
  formData: FormData,
): Promise<AtivarActionState> {
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { kind: "erro", mensagem: parsed.error.errors[0]?.message ?? "E-mail inválido." };
  }

  try {
    const user = await requireUser();
    await verificarCompraManual(user.id, parsed.data.email);
    revalidatePath("/ativar-acesso");
    revalidatePath("/");
    redirect("/");
  } catch (e) {
    if (
      e instanceof CompraNaoEncontradaError ||
      e instanceof CompraJaVinculadaError
    ) {
      return { kind: "erro", mensagem: e.message };
    }
    throw e;
  }
}
