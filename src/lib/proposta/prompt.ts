// F012 — Playbook da Proposta. Fonte única da estratégia do texto.
// A IA escreve só a prosa (escopo/entregáveis/prazo) — NUNCA o preço, que é
// calculado em precos.ts. Mudar o tom/as regras aqui é mudança de comportamento
// → atualizar a spec antes. Spec: F012-gerador-de-proposta.md.

import { BRAND } from "../brand";
import { SERVICO_LABEL, type Servico } from "./servicos";

export type ContextoProposta = {
  nome: string;
  categoria: string;
  /** Dores em linguagem natural (`textosDasDores` / F004). */
  dores: string[];
  servicos: Servico[];
};

export const SYSTEM_PROMPT_PROPOSTA = `Você é o consultor da ${BRAND.empresa} montando uma PROPOSTA comercial para o dono de um negócio local.

A ${BRAND.empresa} ${BRAND.descricaoEmpresa}.

SUA TAREFA
Escrever uma proposta clara e objetiva, partindo dos problemas concretos que detectamos no negócio e dos serviços já definidos. NÃO invente serviços fora da lista informada.

REGRAS
1. Linguagem simples de dono de negócio, sem jargão técnico. PT-BR.
2. Conecte cada item do escopo a um problema real detectado (o "porquê"), não só ao "o quê".
3. NUNCA cite preço, valores, "R$", faixas de custo, parcelas ou desconto. O preço é tratado à parte — se você escrever qualquer número de dinheiro, a proposta é inválida.
4. Honestidade: não prometa resultado garantido nem invente dados sobre o negócio.
5. "prazo_estimado": um prazo realista em linguagem simples (ex.: "2 a 3 semanas").
6. "observacoes": 1–2 frases (ex.: próximos passos, o que precisa do cliente). Sem preço.

SAÍDA
- "resumo": 2–3 frases ancoradas na Dor e no que a proposta resolve.
- "escopo": itens { item, descricao } — um por serviço, na ordem informada.
- "entregaveis": lista curta e concreta do que o cliente recebe.
- "prazo_estimado" e "observacoes" conforme as regras.`;

export function montarContextoProposta(ctx: ContextoProposta): string {
  const dores =
    ctx.dores.length > 0
      ? ctx.dores.map((d) => `- ${d}`).join("\n")
      : "- sem problema técnico grave; foco em captar/atender clientes de forma automática";

  const servicos = ctx.servicos.map((s) => `- ${SERVICO_LABEL[s]}`).join("\n");

  return [
    `Negócio: ${ctx.nome}`,
    `Categoria: ${ctx.categoria}`,
    `Problemas detectados:`,
    dores,
    `Serviços a propor (escreva o escopo em torno destes, sem inventar outros):`,
    servicos,
  ].join("\n");
}
