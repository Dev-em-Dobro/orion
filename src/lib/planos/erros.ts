// F035 — erros de plano. Ambos entram em `mensagemEscopo` (src/lib/db/scoped),
// que é o que transforma exceção em texto de UI nas Server Actions.

import { definicao, planoQueAbre, type Plano, type Recurso } from "./catalogo";
import { LABEL_RECURSO } from "./catalogo";

/** Teto mensal de Leads diagnosticados atingido. */
export class LimiteDoPlanoError extends Error {
  constructor(
    public plano: Plano,
    public usado: number,
    public limite: number,
  ) {
    super(
      `Você diagnosticou ${usado} Leads este mês — o limite do plano ` +
        `${definicao(plano).nome}. Sua busca e sua fila continuam ` +
        "funcionando; para aprofundar mais Leads, veja os planos.",
    );
    this.name = "LimiteDoPlanoError";
  }
}

/** Recurso que o plano atual não abre. */
export class RecursoDoPlanoError extends Error {
  constructor(
    public recurso: Recurso,
    public plano: Plano,
  ) {
    const abre = planoQueAbre(recurso);
    super(
      `${LABEL_RECURSO[recurso]} não está no plano ${definicao(plano).nome}` +
        (abre ? `. Disponível no ${definicao(abre).nome}.` : "."),
    );
    this.name = "RecursoDoPlanoError";
  }
}
