// Persistência de UserApiKeys — cifra na escrita; nunca devolve plaintext.

import type { ChaveApiStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { cifrar } from "@/lib/seguranca/cifra";
import { colunasDe, lerLast4, lerStatus } from "./campos";
import { ChaveOperacaoError } from "./erros";
import { formatarMascara, ultimos4 } from "./mascara";
import {
  LABEL_CHAVE,
  TIPOS_CHAVE,
  type TipoChave,
  type VisaoChave,
} from "./tipos";

async function rowDoUsuario(userId: string) {
  return prisma.userApiKeys.findUnique({ where: { user_id: userId } });
}

async function garantirRow(userId: string) {
  const existing = await rowDoUsuario(userId);
  if (existing) return existing;
  return prisma.userApiKeys.create({ data: { user_id: userId } });
}

/** Visão segura pra UI (máscara + status). Sem plaintext. */
export async function listarVisaoChaves(userId: string): Promise<VisaoChave[]> {
  const row = await rowDoUsuario(userId);
  return TIPOS_CHAVE.map((tipo) => ({
    tipo,
    label: LABEL_CHAVE[tipo],
    status: lerStatus(row, tipo),
    mascara: formatarMascara(lerLast4(row, tipo)),
  }));
}

/** Essenciais faltando — Google + chave do provedor de IA ativo. */
export async function chavesEssenciaisFaltando(
  userId: string,
): Promise<TipoChave[]> {
  const visao = await listarVisaoChaves(userId);
  const faltando: TipoChave[] = [];

  const google = visao.find((v) => v.tipo === "google");
  if (!google || google.status === "faltando") faltando.push("google");

  const rows = await prisma.$queryRaw<{ llm_provider: string }[]>`
    SELECT "llm_provider" FROM "user_api_keys" WHERE "user_id" = ${userId} LIMIT 1
  `;
  const slotIa = (rows[0]?.llm_provider ?? "anthropic") as TipoChave;
  const ia = visao.find((v) => v.tipo === slotIa);
  if (!ia || ia.status === "faltando") {
    if (slotIa === "anthropic" || slotIa === "openai" || slotIa === "gemini") {
      faltando.push(slotIa);
    }
  }

  return faltando;
}

/** Salva (cifra) uma chave. Retorna visão atualizada do slot. */
export async function salvarChave(
  userId: string,
  tipo: TipoChave,
  plaintext: string,
): Promise<VisaoChave> {
  const valor = plaintext.trim();
  if (valor.length < 8) {
    throw new ChaveOperacaoError("Chave muito curta");
  }

  const envelope = cifrar(valor);
  const c = colunasDe(tipo);
  const data: Prisma.UserApiKeysUpdateInput = {
    [c.ciphertext]: envelope.ciphertext,
    [c.iv]: envelope.iv,
    [c.authTag]: envelope.authTag,
    [c.keyVersion]: envelope.keyVersion,
    [c.last4]: ultimos4(valor),
    [c.status]: "configurada" satisfies ChaveApiStatus,
  };

  await garantirRow(userId);
  const row = await prisma.userApiKeys.update({
    where: { user_id: userId },
    data,
  });

  return {
    tipo,
    label: LABEL_CHAVE[tipo],
    status: row[c.status],
    mascara: formatarMascara(row[c.last4]),
  };
}

/** Remove a chave do slot (volta a faltando). */
export async function removerChave(
  userId: string,
  tipo: TipoChave,
): Promise<VisaoChave> {
  const c = colunasDe(tipo);
  const data: Prisma.UserApiKeysUpdateInput = {
    [c.ciphertext]: null,
    [c.iv]: null,
    [c.authTag]: null,
    [c.keyVersion]: 1,
    [c.last4]: null,
    [c.status]: "faltando" satisfies ChaveApiStatus,
  };

  const existing = await rowDoUsuario(userId);
  if (!existing) {
    return {
      tipo,
      label: LABEL_CHAVE[tipo],
      status: "faltando",
      mascara: null,
    };
  }

  const row = await prisma.userApiKeys.update({
    where: { user_id: userId },
    data,
  });

  return {
    tipo,
    label: LABEL_CHAVE[tipo],
    status: row[c.status],
    mascara: null,
  };
}

/** Atualiza só o status (pós-teste). */
export async function atualizarStatusChave(
  userId: string,
  tipo: TipoChave,
  status: Extract<ChaveApiStatus, "configurada" | "invalida">,
): Promise<void> {
  const c = colunasDe(tipo);
  const existing = await rowDoUsuario(userId);
  if (!existing || !existing[c.ciphertext]) {
    throw new ChaveOperacaoError("Não há chave salva neste slot pra testar");
  }
  await prisma.userApiKeys.update({
    where: { user_id: userId },
    data: { [c.status]: status },
  });
}
