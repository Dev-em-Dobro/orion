"use server";

// F016 — salvar / remover / testar chaves BYOK do aluno.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  LABEL_CHAVE,
  TIPOS_CHAVE,
  listarVisaoChaves,
  removerChave,
  salvarChave,
  testarChaveSalva,
  type TipoChave,
  type VisaoChave,
} from "@/lib/chaves";
import { LABEL_LLM_PROVIDER, salvarProviderLlm } from "@/lib/llm";
import { LABEL_KEY_MODE, salvarModoChave } from "@/lib/chaves";
import type { KeyMode } from "@prisma/client";
import { mensagemEscopo, requireTenant } from "@/lib/db/scoped";

const tipoSchema = z.enum(TIPOS_CHAVE);

export type ChaveActionState =
  | { kind: "idle" }
  | { kind: "ok"; mensagem: string; visao?: VisaoChave }
  | { kind: "erro"; mensagem: string; visao?: VisaoChave };

function parseTipo(raw: FormDataEntryValue | null): TipoChave | null {
  const parsed = tipoSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function salvarChaveAction(
  _prev: ChaveActionState,
  formData: FormData,
): Promise<ChaveActionState> {
  const tipo = parseTipo(formData.get("tipo"));
  const valor = String(formData.get("valor") ?? "");
  if (!tipo) return { kind: "erro", mensagem: "Tipo de chave inválido" };

  try {
    const { userId } = await requireTenant();
    const visao = await salvarChave(userId, tipo, valor);
    revalidatePath("/configuracao");
    revalidatePath("/");
    revalidatePath("/leads");
    return {
      kind: "ok",
      mensagem: `${LABEL_CHAVE[tipo]} salva`,
      visao,
    };
  } catch (e) {
    const escopo = mensagemEscopo(e);
    if (escopo) return { kind: "erro", mensagem: escopo };
    return {
      kind: "erro",
      mensagem: e instanceof Error ? e.message : "Falha ao salvar",
    };
  }
}

export async function removerChaveAction(
  _prev: ChaveActionState,
  formData: FormData,
): Promise<ChaveActionState> {
  const tipo = parseTipo(formData.get("tipo"));
  if (!tipo) return { kind: "erro", mensagem: "Tipo de chave inválido" };

  try {
    const { userId } = await requireTenant();
    const visao = await removerChave(userId, tipo);
    revalidatePath("/configuracao");
    revalidatePath("/");
    revalidatePath("/leads");
    return {
      kind: "ok",
      mensagem: `${LABEL_CHAVE[tipo]} removida`,
      visao,
    };
  } catch (e) {
    const escopo = mensagemEscopo(e);
    if (escopo) return { kind: "erro", mensagem: escopo };
    return {
      kind: "erro",
      mensagem: e instanceof Error ? e.message : "Falha ao remover",
    };
  }
}

export async function testarChaveAction(
  _prev: ChaveActionState,
  formData: FormData,
): Promise<ChaveActionState> {
  const tipo = parseTipo(formData.get("tipo"));
  if (!tipo) return { kind: "erro", mensagem: "Tipo de chave inválido" };

  try {
    const { userId } = await requireTenant();
    const resultado = await testarChaveSalva(userId, tipo);
    const [visao] = (await listarVisaoChaves(userId)).filter(
      (v) => v.tipo === tipo,
    );
    revalidatePath("/configuracao");
    return {
      kind: resultado.ok ? "ok" : "erro",
      mensagem: resultado.mensagem,
      visao,
    };
  } catch (e) {
    const escopo = mensagemEscopo(e);
    if (escopo) return { kind: "erro", mensagem: escopo };
    return {
      kind: "erro",
      mensagem: e instanceof Error ? e.message : "Falha ao testar",
    };
  }
}

const providerSchema = z.enum(["anthropic", "openai", "gemini"]);
const modoSchema = z.enum(["orion", "byok"]);

export async function salvarModoChaveAction(
  _prev: ChaveActionState,
  formData: FormData,
): Promise<ChaveActionState> {
  const parsed = modoSchema.safeParse(formData.get("modo"));
  if (!parsed.success) {
    return { kind: "erro", mensagem: "Modo de chave inválido" };
  }

  try {
    const { userId } = await requireTenant();
    const modo = await salvarModoChave(userId, parsed.data as KeyMode);
    revalidatePath("/configuracao");
    revalidatePath("/");
    revalidatePath("/leads");
    revalidatePath("/treino");
    return {
      kind: "ok",
      mensagem: `Modo ativo: ${LABEL_KEY_MODE[modo]}`,
    };
  } catch (e) {
    const escopo = mensagemEscopo(e);
    if (escopo) return { kind: "erro", mensagem: escopo };
    return {
      kind: "erro",
      mensagem: e instanceof Error ? e.message : "Falha ao salvar modo",
    };
  }
}

export async function salvarProviderLlmAction(
  _prev: ChaveActionState,
  formData: FormData,
): Promise<ChaveActionState> {
  const parsed = providerSchema.safeParse(formData.get("provider"));
  if (!parsed.success) {
    return { kind: "erro", mensagem: "Provedor de IA inválido" };
  }

  try {
    const { userId } = await requireTenant();
    const provider = await salvarProviderLlm(userId, parsed.data);
    revalidatePath("/configuracao");
    revalidatePath("/");
    revalidatePath("/leads");
    return {
      kind: "ok",
      mensagem: `Provedor de IA: ${LABEL_LLM_PROVIDER[provider]}`,
    };
  } catch (e) {
    const escopo = mensagemEscopo(e);
    if (escopo) return { kind: "erro", mensagem: escopo };
    return {
      kind: "erro",
      mensagem: e instanceof Error ? e.message : "Falha ao salvar provedor",
    };
  }
}
