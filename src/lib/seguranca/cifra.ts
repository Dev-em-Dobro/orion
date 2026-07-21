// ADR-009 — envelope AES-256-GCM com crypto nativo.
// Chave-mestra: BYOK_MASTER_KEY (32 bytes em base64). Sem deps de Next.

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export const BYOK_KEY_VERSION = 1;

export class CifraError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CifraError";
  }
}

export type EnvelopeCifrado = {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
  keyVersion: number;
};

function masterKey(): Buffer {
  const b64 = process.env.BYOK_MASTER_KEY;
  if (!b64?.trim()) {
    throw new CifraError(
      "BYOK_MASTER_KEY não configurada no servidor — defina o secret (32 bytes em base64)",
    );
  }
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) {
    throw new CifraError(
      "BYOK_MASTER_KEY inválida — precisa decodificar para exatamente 32 bytes",
    );
  }
  return key;
}

/** Cifra plaintext → envelope (IV aleatório por chamada). */
export function cifrar(plaintext: string): EnvelopeCifrado {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return {
    ciphertext,
    iv,
    authTag: cipher.getAuthTag(),
    keyVersion: BYOK_KEY_VERSION,
  };
}

/** Decifra envelope → plaintext. Nunca logar o retorno. */
export function decifrar(envelope: {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
}): string {
  const decipher = createDecipheriv("aes-256-gcm", masterKey(), envelope.iv);
  decipher.setAuthTag(envelope.authTag);
  const plain = Buffer.concat([
    decipher.update(envelope.ciphertext),
    decipher.final(),
  ]);
  return plain.toString("utf8");
}
