// F014 — callback pós-login seguro para Better Auth (trustedOrigins).

/**
 * Regex alinhada ao Better Auth (`matchesOriginPattern` + allowRelativePaths):
 * path relativo + query simples. Rejeita `//`, absoluto e `?` aninhado.
 */
const CALLBACK_RELATIVO_OK =
  /^\/(?!\/|\\|%2f|%5c)[\w\-.\+/@]*(?:\?[\w\-.\+/=&%@]*)?$/i;

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
  if (!CALLBACK_RELATIVO_OK.test(valor)) {
    // Query “suja” (ex.: segundo `?`): mantém só o pathname.
    try {
      const u = new URL(valor, "https://orion.local");
      const soPath = u.pathname || "/";
      return CALLBACK_RELATIVO_OK.test(soPath) ? soPath : "/";
    } catch {
      return "/";
    }
  }
  return valor;
}
