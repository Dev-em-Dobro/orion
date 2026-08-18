// Resolve chave em claro — só no servidor, nunca pro client.
// F018: modo Orion usa env ORION_*; modo BYOK usa UserApiKeys cifrado.

import { prisma } from "@/lib/db";
import { decifrar } from "@/lib/seguranca/cifra";
import { lerEnvelope } from "./campos";
import { ChaveAusenteError } from "./erros";
import { obterModoChave } from "./modo";
import { exigirChaveOrion, obterChaveOrion } from "./orion";
import type { TipoChave } from "./tipos";

/** Decifra e devolve a chave BYOK, ou null se faltando. */
async function obterChaveByok(
  userId: string,
  tipo: TipoChave,
): Promise<string | null> {
  const row = await prisma.userApiKeys.findUnique({
    where: { user_id: userId },
  });
  if (!row) return null;
  const envelope = lerEnvelope(row, tipo);
  if (!envelope) return null;
  return decifrar({
    ciphertext: Buffer.from(envelope.ciphertext),
    iv: Buffer.from(envelope.iv),
    authTag: Buffer.from(envelope.authTag),
  });
}

/** Decifra e devolve a chave, ou null se faltando. */
export async function obterChave(
  userId: string,
  tipo: TipoChave,
): Promise<string | null> {
  const modo = await obterModoChave(userId);
  if (modo === "orion") {
    return obterChaveOrion(tipo);
  }
  return obterChaveByok(userId, tipo);
}

/** Exige a chave; sem ela lança ChaveAusenteError (sem chamar o provedor). */
export async function exigirChave(
  userId: string,
  tipo: TipoChave,
): Promise<string> {
  const modo = await obterModoChave(userId);
  if (modo === "orion") {
    return exigirChaveOrion(tipo);
  }
  const chave = await obterChaveByok(userId, tipo);
  if (!chave) throw new ChaveAusenteError(tipo);
  return chave;
}
