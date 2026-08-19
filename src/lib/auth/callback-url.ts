// F014 — callback pós-login seguro para Better Auth (trustedOrigins).

/**
 * Regex alinhada ao Better Auth (`matchesOriginPattern` + allowRelativePaths):
 * path relativo + query simples. Rejeita `//`, absoluto e `?` aninhado.
 *
 * O plugin magic-link faz `decodeURIComponent` de novo no verify. `%5B` passa
 * neste regex, mas vira `[` depois do decode e o Better Auth responde
 * INVALID_CALLBACK_URL. Por isso validamos também a forma decodificada.
 */
const CALLBACK_RELATIVO_OK =
  /^\/(?!\/|\\|%2f|%5c)[\w\-.\+/@]*(?:\?[\w\-.\+/=&%@]*)?$/i;

function aceitoNoVerifyBetterAuth(url: string): boolean {
  if (!CALLBACK_RELATIVO_OK.test(url)) return false;
  try {
    return CALLBACK_RELATIVO_OK.test(decodeURIComponent(url));
  } catch {
    return false;
  }
}

function soPathnameSeguro(valor: string): string {
  try {
    const u = new URL(valor, "https://orion.local");
    const soPath = u.pathname || "/";
    return aceitoNoVerifyBetterAuth(soPath) ? soPath : "/";
  } catch {
    return "/";
  }
}

/**
 * Normaliza `callbackUrl` da query / middleware para um path relativo
 * aceito pelo Better Auth. Inválido → `"/"`.
 */
export function sanitizarCallbackUrl(raw: string | null | undefined): string {
  if (!raw) return "/";
  let valor = raw.trim();
  if (!valor) return "/";

  // Já absoluto? extrai path+search do mesmo host se possível; senão "/".
  if (/^https?:\/\//i.test(valor) || valor.startsWith("//")) {
    try {
      const u = new URL(valor.startsWith("//") ? `https:${valor}` : valor);
      valor = `${u.pathname}${u.search}`;
    } catch {
      return "/";
    }
  }

  if (!valor.startsWith("/")) return "/";
  if (!aceitoNoVerifyBetterAuth(valor)) {
    return soPathnameSeguro(valor);
  }
  return valor;
}
