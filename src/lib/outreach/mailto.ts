// F027 — link `mailto:` com assunto e corpo prontos.
// Spec: /specs/02-features/F027-outreach-por-email.md
//
// O envio é do cliente de e-mail do aluno, não do Orion: assim a mensagem sai
// da caixa dele, a resposta chega pra ele, e nenhuma prospecção fria passa
// pelo domínio que o magic link de login usa (ADR-010).

/**
 * Alguns clientes truncam `mailto:` longos. A UI avisa a partir deste ponto e
 * oferece copiar/colar — sem esconder o botão.
 */
export const MAILTO_LIMITE = 1800;

export function montarMailto(
  para: string,
  assunto: string,
  corpo: string,
): string {
  const params = new URLSearchParams({ subject: assunto, body: corpo });
  // URLSearchParams usa "+" para espaço; mailto espera %20.
  return `mailto:${encodeURIComponent(para)}?${params
    .toString()
    .replace(/\+/g, "%20")}`;
}

export function mailtoLongo(corpo: string): boolean {
  return corpo.length > MAILTO_LIMITE;
}
