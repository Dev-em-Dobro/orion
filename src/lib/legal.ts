/** Conteúdo compartilhado das páginas legais (LGPD). */

import { NOME_PRODUTO } from "@/lib/produto";

export const OPERADOR_LEGAL = {
  /** Nome do operador responsável pelo tratamento. */
  nome: "Dev em Dobro",
  /** Contato do titular de dados / DPO operacional. Substituir pelo e-mail oficial. */
  emailPrivacidade: "suportedevquest@gmail.com",
  produto: NOME_PRODUTO,
} as const;

/**
 * Muda junto com qualquer edição de conteúdo dos Termos ou da Política — é o
 * que diz ao titular que o texto que ele leu antes não é mais o vigente.
 *
 * 2026-08-13: saída do canal de e-mail (fim da captura de endereço do Lead) e
 * mudança do modelo de chaves (plataforma por padrão, chave própria só para
 * quem já tinha).
 */
export const ATUALIZADO_EM = "13 de agosto de 2026";
