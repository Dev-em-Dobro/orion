// F012 — geração da Proposta. Montada em código desde 2026-08-16.
// Spec: F012-gerador-de-proposta.md ("Emenda 2026-08-16 (fim do dia)")
//
// Era um wrapper de LLM (`llm.generateStructured`, tier strong, 1500 tokens).
// Virou uma chamada síncrona. Sem `PropostaError`: não sobrou caminho de falha
// — o que podia dar errado era a rede e o modelo, e os dois saíram.

export type {
  ContextoProposta,
  DorDoLead,
  EscopoItem,
  PropostaTexto,
} from "./montar";

export { montarProposta as gerarProposta } from "./montar";
