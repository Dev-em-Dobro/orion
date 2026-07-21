// F005 — link click-to-chat do WhatsApp.
// Não usar wa.me: o redirect server-side corrompe emojis UTF-8 (viram �).

export function linkWhatsapp(
  telefone: string | null,
  mensagem: string,
): string | null {
  if (!telefone) return null;
  let digitos = telefone.replace(/\D/g, "");
  if (!digitos) return null;
  if (digitos.length <= 11) digitos = `55${digitos}`;
  return `https://api.whatsapp.com/send?phone=${digitos}&text=${encodeURIComponent(mensagem)}`;
}
