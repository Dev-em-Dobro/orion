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
  /**
   * Origens aceitas pelo `origin-check` do Better Auth. Sem a opção, ele
   * confia só na `baseURL` — que é o que quebrava o Preview (ver emenda de
   * 2026-08-16 na spec).
   */
  trustedOrigins: string[];
  /** Presente só quando ID e secret do Google estão configurados. */
  google: { clientId: string; clientSecret: string } | null;
};

/** O host de uma URL, ou a string crua se ela não for uma URL válida. */
function hostDe(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/**
 * Origem canônica de um host cru da Vercel.
 *
 * O esquema é **forçado** pra `https`, não herdado do valor: a Vercel entrega
 * host puro, e aceitar um `http://` que aparecesse ali seria admitir origem em
 * texto plano na lista de confiança. Path também cai — `matchesOriginPattern`
 * compara origem, então entrada com path é entrada morta.
 */
function origemDaVercel(host: string): string {
  const limpo = host.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
  return `https://${limpo}`;
}

/** Origem de uma URL configurada (sem path). Validada no boot por `env-servidor`. */
function origemDe(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

/**
 * As URLs por onde este deploy responde.
 *
 * Fora de um Preview da Vercel devolve só a `BETTER_AUTH_URL` — é o caminho de
 * produção e de local, e ele não muda.
 *
 * Em Preview, a `BETTER_AUTH_URL` costuma vir **herdada de produção**, e aí ela
 * é a origem errada por dois motivos ao mesmo tempo: o Origin do deploy não
 * bate com ela ("Invalid origin"), e o magic link sairia apontando pro app de
 * produção. Então quem manda passa a ser a URL do próprio deploy.
 *
 * O gatilho é `VERCEL_ENV`, escrito pela plataforma no ambiente da função —
 * não é header nem `Host`, então nenhuma requisição consegue se declarar
 * Preview pra afrouxar produção.
 */
function urlsDoAmbiente(configurada: string): {
  baseURL: string;
  trustedOrigins: string[];
} {
  if (process.env.VERCEL_ENV !== "preview") {
    return { baseURL: configurada, trustedOrigins: [origemDe(configurada)] };
  }

  // Estável por branch primeiro: `VERCEL_URL` muda a cada deploy, e um redeploy
  // no meio do fluxo invalidaria o magic link que já saiu por e-mail.
  const branch = process.env.VERCEL_BRANCH_URL?.trim();
  const deploy = process.env.VERCEL_URL?.trim();
  const producao = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();

  // Host diferente do de produção ⇒ a var foi definida **para** o Preview (o
  // domínio fixo de staging). Igual ⇒ foi herdada, e não serve.
  const staging =
    producao && hostDe(configurada) !== producao ? origemDe(configurada) : null;

  const daVercel = branch ?? deploy;
  const baseURL =
    staging ?? (daVercel ? origemDaVercel(daVercel) : configurada);

  const origens = [
    origemDe(baseURL),
    ...[branch, deploy].filter((v): v is string => Boolean(v)).map(origemDaVercel),
  ];

  return { baseURL, trustedOrigins: [...new Set(origens)] };
}

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

  const { baseURL, trustedOrigins } = urlsDoAmbiente(
    requireAuthEnv("BETTER_AUTH_URL"),
  );

  return {
    secret: requireAuthEnv("BETTER_AUTH_SECRET"),
    baseURL,
    trustedOrigins,
    google:
      clientId && clientSecret
        ? { clientId, clientSecret }
        : null,
  };
}
