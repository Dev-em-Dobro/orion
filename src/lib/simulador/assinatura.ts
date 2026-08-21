// F013 — assinatura das falas da persona.
// Spec: /specs/02-features/F013-simulador-de-venda.md (emenda de 2026-08-14)
//
// O histórico vive no client (ADR-002 / arquitetura stateless da F013), então o
// client reenvia as falas do `dono` a cada turno. Só que fala do `dono` é texto
// que o **servidor** produziu: sem prova disso, qualquer um escreve uma fala de
// assistente à vontade — que é o prefill, a forma mais barata de convencer o
// modelo a assumir outro papel.
//
// Cada resposta sai assinada; o servidor recusa fala de `dono` que ele não
// reconheça. Fala do `aluno` continua livre: esse canal sempre foi do aluno.

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Domínio da assinatura. Muda junto com o formato do payload — chave velha
 * deixa de validar em vez de validar a coisa errada.
 */
const DOMINIO = "orion:simulador:dono:v1";

function segredo(): string {
  const s = process.env.BETTER_AUTH_SECRET?.trim();
  if (!s) throw new Error("BETTER_AUTH_SECRET ausente");
  return s;
}

/**
 * Assina uma fala da persona para aquele aluno.
 *
 * O `userId` entra no payload de propósito: sem ele, uma fala assinada para um
 * aluno valeria na sessão de qualquer outro.
 */
export function assinarFalaDono(userId: string, texto: string): string {
  return createHmac("sha256", segredo())
    .update(`${DOMINIO}|${userId}|${texto}`)
    .digest("base64url");
}

/** A fala foi mesmo produzida por este servidor, para este aluno? */
export function falaDonoAutentica(
  userId: string,
  texto: string,
  assinatura: string | undefined,
): boolean {
  if (!assinatura) return false;
  const esperada = Buffer.from(assinarFalaDono(userId, texto));
  const recebida = Buffer.from(assinatura);
  // Comprimentos diferentes já reprovam, e `timingSafeEqual` exige iguais.
  if (esperada.length !== recebida.length) return false;
  return timingSafeEqual(esperada, recebida);
}
