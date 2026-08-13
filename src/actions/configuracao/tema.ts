"use server";

// Troca do tema da interface. Piloto de 2026-08-13 — hoje só a `/leads` lê.

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  LABEL_TEMA,
  TEMA_COOKIE,
  TEMA_COOKIE_MAX_AGE,
  TEMAS,
} from "@/lib/tema";
import { requireTenant } from "@/lib/db/scoped";

const temaSchema = z.enum(TEMAS);

export type TemaActionState =
  | { kind: "idle" }
  | { kind: "ok"; mensagem: string }
  | { kind: "erro"; mensagem: string };

export async function salvarTemaAction(
  _prev: TemaActionState,
  formData: FormData,
): Promise<TemaActionState> {
  // Preferência de UI não é dado de ninguém, mas a action é pública: exigir
  // sessão evita que ela vire endpoint aberto de escrita de cookie.
  await requireTenant();

  const parsed = temaSchema.safeParse(formData.get("tema"));
  if (!parsed.success) return { kind: "erro", mensagem: "Tema inválido" };
  const tema = parsed.data;

  const jar = await cookies();
  jar.set(TEMA_COOKIE, tema, {
    path: "/",
    maxAge: TEMA_COOKIE_MAX_AGE,
    sameSite: "lax",
    // Sem `httpOnly`: não é credencial, e deixar legível permite que um dia o
    // cliente aplique o tema sem round-trip.
    httpOnly: false,
  });

  // As páginas que leem o cookie são Server Components: sem revalidar, a
  // navegação seguinte poderia servir o HTML do tema antigo.
  revalidatePath("/", "layout");

  return { kind: "ok", mensagem: `Tema ${LABEL_TEMA[tema]} aplicado.` };
}
