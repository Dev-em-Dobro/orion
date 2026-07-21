// Resolve chave em claro do aluno — só no servidor, nunca pro client.

import { prisma } from "@/lib/db";
import { decifrar } from "@/lib/seguranca/cifra";
import { lerEnvelope } from "./campos";
import { ChaveAusenteError } from "./erros";
import type { TipoChave } from "./tipos";

/** Decifra e devolve a chave, ou null se faltando. */
export async function obterChave(
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

/** Exige a chave; sem ela lança ChaveAusenteError (sem chamar o provedor). */
export async function exigirChave(
  userId: string,
  tipo: TipoChave,
): Promise<string> {
  const chave = await obterChave(userId, tipo);
  if (!chave) throw new ChaveAusenteError(tipo);
  return chave;
}
