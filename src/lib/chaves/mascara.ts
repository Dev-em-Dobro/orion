/** Só os 4 últimos caracteres — persistido pra montar a máscara na UI. */
export function ultimos4(valor: string): string {
  const t = valor.trim();
  if (t.length === 0) return "????";
  if (t.length <= 4) return t;
  return t.slice(-4);
}

/** Máscara pra UI. Nunca o valor em claro. */
export function formatarMascara(last4: string | null | undefined): string | null {
  if (!last4) return null;
  return `••••${last4}`;
}
