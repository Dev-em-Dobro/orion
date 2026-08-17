// F005/F006/F038 — geração da Abordagem. Montada em código desde 2026-08-16.
// Spec: F005-abordagem-whatsapp.md ("Emenda 2026-08-16 — a Abordagem sai da IA")
//
// Era um wrapper de LLM (`llm.generateStructured`, tier strong). Virou uma
// chamada síncrona: sem rede, sem chave, sem latência e sem custo. Por isso
// não sobrou `AbordagemError` — não existe mais caminho de falha aqui, e um
// erro que nunca acontece só faz o chamador tratar fantasma.

import { montarAbordagem, montarRoteiro, type ContextoLead } from "./montar";
import { removerEmojis } from "./removerEmojis";

export type { ContextoLead, DorDoLead, TipoAbordagem } from "./montar";

/**
 * `removerEmojis` fica, mesmo com o pool sendo texto nosso e sem emoji nenhum.
 * Não é paranoia com o próprio código: `BRAND.propostaDeValor` e
 * `BRAND.ofertaDeEntrada` são editáveis pelo aluno e entram na mensagem. Um
 * emoji colado ali quebraria o encode do `wa.me` — que é o motivo original da
 * regra na F005, e ele não some porque a IA saiu.
 */
export function gerarAbordagem(
  ctx: ContextoLead,
  tipo: "primeira" | "followup" = "primeira",
): { mensagem: string } {
  return { mensagem: removerEmojis(montarAbordagem(ctx, tipo).trim()) };
}

/** F038 — roteiro falado (ligação ou áudio de WhatsApp). */
export function gerarRoteiroLigacao(
  ctx: ContextoLead,
  tipo: "primeira" | "followup" = "primeira",
): { mensagem: string } {
  return { mensagem: removerEmojis(montarRoteiro(ctx, tipo).trim()) };
}
