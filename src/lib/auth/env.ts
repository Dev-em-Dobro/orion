// F014 — validação de env de auth. Ausência → erro descritivo, nunca default.
// Spec: /specs/02-features/F014-autenticacao.md (AC6)

export function requireAuthEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `[auth] Variável de ambiente obrigatória ausente: ${name}. ` +
        `Defina-a no .env do servidor — não há valor default.`,
    );
  }
  return value;
}

function optionalAuthEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export type AuthEnv = {
  secret: string;
  baseURL: string;
  /** Presente só quando ID e secret do Google estão configurados. */
  google: { clientId: string; clientSecret: string } | null;
};

/** Lê e valida no boot os segredos exigidos pela F014 (AC6). */
export function loadAuthEnv(): AuthEnv {
  const clientId = optionalAuthEnv("GOOGLE_CLIENT_ID");
  const clientSecret = optionalAuthEnv("GOOGLE_CLIENT_SECRET");

  if ((clientId && !clientSecret) || (!clientId && clientSecret)) {
    throw new Error(
      "[auth] GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET devem estar ambos definidos " +
        "ou ambos ausentes. Configuração parcial não é permitida.",
    );
  }

  return {
    secret: requireAuthEnv("BETTER_AUTH_SECRET"),
    baseURL: requireAuthEnv("BETTER_AUTH_URL"),
    google:
      clientId && clientSecret
        ? { clientId, clientSecret }
        : null,
  };
}
