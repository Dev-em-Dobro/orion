// F038 — rótulo em PT de cada canal de Abordagem, e o que a UI pode oferecer
// para cada um. Sem dep de Next: usado pelo detalhe do Lead (server) e pelos
// botões (client).
//
// `email` saiu do enum em 2026-08-13 e por isso saiu daqui também. O
// `Record<Canal, string>` é o que garante isso: canal novo sem rótulo não
// compila, e canal removido deixa a chave órfã acusando.

import type { Canal } from "@prisma/client";

export const ROTULO_CANAL: Record<Canal, string> = {
  whatsapp: "WhatsApp",
  ligacao: "Ligação ou áudio",
};

/**
 * Canal cujo conteúdo é um **roteiro pra falar**, não um texto pra enviar —
 * então nada de `wa.me` pré-preenchido: a ação certa é copiar.
 */
export function ehRoteiroFalado(canal: Canal): boolean {
  return canal === "ligacao";
}
