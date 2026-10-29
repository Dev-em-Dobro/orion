// F043 — quem pode abrir /admin.

function normalizar(email: string | undefined | null): string | null {
  const e = email?.trim().toLowerCase();
  if (!e || !e.includes("@")) return null;
  return e;
}

/** E-mail bootstrap + CSV `ADMIN_EMAILS`. */
export function emailsAdminPermitidos(): Set<string> {
  const set = new Set<string>();
  const bootstrap = normalizar(process.env.BOOTSTRAP_ADMIN_EMAIL);
  if (bootstrap) set.add(bootstrap);
  for (const parte of (process.env.ADMIN_EMAILS ?? "").split(",")) {
    const e = normalizar(parte);
    if (e) set.add(e);
  }
  return set;
}

export function emailEhAdminPermitido(email: string): boolean {
  const n = normalizar(email);
  if (!n) return false;
  return emailsAdminPermitidos().has(n);
}
