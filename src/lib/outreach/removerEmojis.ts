/**
 * Remove emojis / pictográficos do texto da Outreach (F005).
 * Rede de segurança se o LLM ignorar o prompt.
 */
export function removerEmojis(texto: string): string {
  return texto
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\uFE0F/g, "") // variation selector
    .replace(/[\u{1F3FB}-\u{1F3FF}]/gu, "") // skin tones
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ ?([.!?])/g, "$1")
    .trim();
}
