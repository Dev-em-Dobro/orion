// F035 — erros de plano. Ambos entram em `mensagemEscopo` (src/lib/db/scoped),
// que é o que transforma exceção em texto de UI nas Server Actions.

import { definicao, planoQueAbre, type Plano, type Recurso } from "./catalogo";
import {
  LABEL_OPERACAO_MENSAL,
  LABEL_RECURSO,
  type OperacaoMensal,
} from "./catalogo";
import { PLANOS_NA_UI } from "./exibicao";

/**
 * Teto **mensal** de uma operação atingido. A mensagem nomeia a operação
 * porque desde 2026-08-13 são seis contadores diferentes: dizer só "limite do
 * plano" deixaria o aluno sem saber o que acabou.
 */
export class LimiteDoPlanoError extends Error {
  constructor(
    public plano: Plano,
    public usado: number,
    public limite: number,
    public operacao?: OperacaoMensal,
  ) {
    const oQue = operacao
      ? LABEL_OPERACAO_MENSAL[operacao].toLowerCase()
      : "itens";
    // Pausa de 2026-08-17 (F035): sem `/planos` no ar, "veja os planos" mandaria
    // o aluno pra um 404 e nomear o plano não lhe dá escolha nenhuma. Fica o que
    // ele pode fazer com a informação: o que acabou, e quando volta.
    super(
      PLANOS_NA_UI
        ? `Você usou ${usado} de ${limite} ${oQue} este mês — o limite do plano ` +
            `${definicao(plano).nome}. O resto do Orion continua funcionando; ` +
            "para liberar mais, veja os planos."
        : `Você usou ${usado} de ${limite} ${oQue} este mês — é o limite. ` +
            "O resto do Orion continua funcionando, e a cota zera na virada do mês.",
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
