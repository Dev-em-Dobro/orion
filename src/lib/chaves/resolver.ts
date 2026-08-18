// Resolve chave em claro — só no servidor, nunca pro client.
// F018: modo Orion usa env ORION_*; modo BYOK usa UserApiKeys cifrado.
//
// F016 (2026-08-17): com o BYOK encerrado, a **flag** manda, não o dado. Uma
// linha com `key_mode = 'byok'` sobrevivente à migração não faz o app procurar
// chave que não existe mais — ela cai em Orion como todo mundo. É o AC9, e
// existe porque o contrário falharia calado: `ChaveAusenteError` num aluno que
// não tem tela nenhuma pra resolver o problema.

import { prisma } from "@/lib/db";
import { decifrar } from "@/lib/seguranca/cifra";
import { byokDisponivel } from "./byok-flag";
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

/** O aluno usa chave própria? Só se o BYOK estiver ligado — e ele estiver nele. */
async function usaChavePropria(userId: string): Promise<boolean> {
  if (!byokDisponivel()) return false;
  return (await obterModoChave(userId)) === "byok";
}

/** Decifra e devolve a chave, ou null se faltando. */
export async function obterChave(
  userId: string,
  tipo: TipoChave,
): Promise<string | null> {
  if (!(await usaChavePropria(userId))) {
    return obterChaveOrion(tipo);
  }
  return obterChaveByok(userId, tipo);
}

/** Exige a chave; sem ela lança ChaveAusenteError (sem chamar o provedor). */
export async function exigirChave(
  userId: string,
  tipo: TipoChave,
): Promise<string> {
  if (!(await usaChavePropria(userId))) {
    return exigirChaveOrion(tipo);
  }
  const chave = await obterChaveByok(userId, tipo);
  if (!chave) throw new ChaveAusenteError(tipo);
  return chave;
}
