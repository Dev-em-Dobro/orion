// F027 — e-mail de contato publicado no site do próprio Lead.
// Spec: /specs/02-features/F027-abordagem-por-email.md · fronteira: ADR-016
//
// LGPD, explícito: só endereço que o negócio publicou **no site dele**, para
// ser contactado. Nada de terceiros, redes sociais, bases vazadas ou
// enriquecimento. Um endereço por Lead — não montamos lista de disparo.
//
// Puro: sem rede, sem Prisma.

const RE_MAILTO = /href\s*=\s*["']mailto:([^"'?]+)/gi;
const RE_TEXTO =
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

/** Prefixos e domínios que nunca são contato comercial. */
const DESCARTAR = [
  "noreply@",
  "no-reply@",
  "nao-responda@",
  "naoresponda@",
  "@sentry.",
  "@wixpress.",
  "@wordpress.",
  "@example.",
  "@email.com",
  "@domain.com",
  "@sentry.io",
];

/** Sufixos de arquivo: "foto@2x.png" casa a regex de e-mail e não é e-mail. */
const RE_ARQUIVO = /\.(png|jpe?g|gif|webp|svg|css|js|woff2?)$/i;

function aceitavel(email: string): boolean {
  const e = email.toLowerCase();
  if (e.length > 100) return false;
  if (RE_ARQUIVO.test(e)) return false;
  return !DESCARTAR.some((d) => e.includes(d));
}

function dominioDe(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Extrai **um** e-mail do HTML da home.
 *
 * Ordem: `mailto:` primeiro (é o que o negócio marcou como contato), depois
 * texto solto. Entre candidatos, prefere o do mesmo domínio do site — mas
 * aceita Gmail e afins, que é o comum no negócio local.
 */
export function extrairEmail(
  html: string | null,
  website?: string | null,
): string | null {
  if (!html) return null;

  const deMailto = [...html.matchAll(RE_MAILTO)]
    .map((m) => m[1]?.trim() ?? "")
    .filter((e) => e.length > 0 && aceitavel(e));

  const doTexto = (html.match(RE_TEXTO) ?? []).filter(aceitavel);

  const candidatos = [...deMailto, ...doTexto];
  if (candidatos.length === 0) return null;

  const dominio = website ? dominioDe(website) : null;
  if (dominio) {
    const doDominio = candidatos.find((e) =>
      e.toLowerCase().endsWith(`@${dominio}`),
    );
    if (doDominio) return doDominio.toLowerCase();
  }

  return candidatos[0]!.toLowerCase();
}
