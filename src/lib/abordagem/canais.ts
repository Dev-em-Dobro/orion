// F038 — rótulo em PT de cada canal de Abordagem, e o que a UI pode oferecer
// para cada um. Sem dep de Next: usado pelo detalhe do Lead (server) e pelos
// botões (client).
//
// `email` continua no enum do banco pelos registros antigos (saiu do produto na
// F035), então precisa de rótulo — mas nunca é gerado.

import type { Canal } from "@prisma/client";

export const ROTULO_CANAL: Record<Canal, string> = {
  whatsapp: "WhatsApp",
  ligacao: "Ligação ou áudio",
  email: "E-mail",
};

/**
 * Canal cujo conteúdo é um **roteiro pra falar**, não um texto pra enviar —
 * então nada de `wa.me` pré-preenchido: a ação certa é copiar.
 */
export function ehRoteiroFalado(canal: Canal): boolean {
  return canal === "ligacao";
}
