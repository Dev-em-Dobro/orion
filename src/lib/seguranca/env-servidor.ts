// Secrets críticos do servidor (deploy / ADR-009 / F014).
// Ausência ou formato inválido → falha explícita (boot + /api/health).
// Sem `node:crypto` / `Buffer` — este módulo é importado pelo instrumentation
// (webpack Edge não aceita o scheme `node:`).

export type SecretCheck = {
  ok: boolean;
  name: string;
  detalhe?: string;
};

function presente(name: string): string | null {
  const v = process.env[name]?.trim();
  return v || null;
}

/** Comprimento em bytes de um base64 (sem Node Buffer). */
function base64ByteLength(b64: string): number {
  const bin = atob(b64.replace(/\s/g, ""));
  return bin.length;
}

/** Valida BYOK_MASTER_KEY (32 bytes em base64). */
export function checkByokMasterKey(): SecretCheck {
  const raw = presente("BYOK_MASTER_KEY");
  if (!raw) {
    return {
      ok: false,
      name: "BYOK_MASTER_KEY",
      detalhe: "ausente — define 32 bytes em base64 (openssl rand -base64 32)",
    };
  }
  try {
    const len = base64ByteLength(raw);
    if (len !== 32) {
      return {
        ok: false,
        name: "BYOK_MASTER_KEY",
        detalhe: `inválida — decodificou ${len} bytes (esperado 32)`,
      };
    }
  } catch {
    return {
      ok: false,
      name: "BYOK_MASTER_KEY",
      detalhe: "inválida — não é base64",
    };
  }
  return { ok: true, name: "BYOK_MASTER_KEY" };
}

export function checkBetterAuthSecret(): SecretCheck {
  const raw = presente("BETTER_AUTH_SECRET");
  if (!raw) {
    return {
      ok: false,
      name: "BETTER_AUTH_SECRET",
      detalhe: "ausente — sem default (F014 AC6)",
    };
  }
  if (raw.length < 16) {
    return {
      ok: false,
      name: "BETTER_AUTH_SECRET",
      detalhe: "muito curto — use openssl rand -base64 32",
    };
  }
  return { ok: true, name: "BETTER_AUTH_SECRET" };
}

export function checkBetterAuthUrl(): SecretCheck {
  const raw = presente("BETTER_AUTH_URL");
  if (!raw) {
    return {
      ok: false,
      name: "BETTER_AUTH_URL",
      detalhe:
        "ausente — URL pública do app (ex.: https://orion-lead-hunter.devemdobro.com)",
    };
  }
  try {
    // eslint-disable-next-line no-new
    new URL(raw);
  } catch {
    return {
      ok: false,
      name: "BETTER_AUTH_URL",
      detalhe: "não é uma URL válida",
    };
  }
  return { ok: true, name: "BETTER_AUTH_URL" };
}

export function checkDatabaseUrl(): SecretCheck {
  const raw = presente("DATABASE_URL");
  if (!raw) {
    return {
      ok: false,
      name: "DATABASE_URL",
      detalhe: "ausente — connection string Neon/Postgres",
    };
  }
  return { ok: true, name: "DATABASE_URL" };
}

/** Todas as checagens críticas de produção. */
export function listarChecksCriticos(): SecretCheck[] {
  return [
    checkDatabaseUrl(),
    checkBetterAuthSecret(),
    checkBetterAuthUrl(),
    checkByokMasterKey(),
  ];
}

/**
 * Lança se algum secret crítico falhar.
 * Usar no boot (instrumentation) — nunca inventa default.
 */
export function assertCriticalSecrets(): void {
  const falhas = listarChecksCriticos().filter((c) => !c.ok);
  if (falhas.length === 0) return;
  const linhas = falhas.map((f) => `- ${f.name}: ${f.detalhe ?? "inválido"}`);
  throw new Error(
    `[servidor] Secrets críticos ausentes ou inválidos (sem default):\n${linhas.join("\n")}`,
  );
}

/** Fingerprint não-sensível (só health) — FNV-1a, não é crypto. */
export function fingerprintEnv(name: string): string | null {
  const raw = presente(name);
  if (!raw) return null;
  let h = 0x811c9dc5;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
