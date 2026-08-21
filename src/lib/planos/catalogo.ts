// F035 — planos, limites e recursos. Dado puro, sem Prisma e sem Next.
// Spec: /specs/02-features/F035-planos-e-limites.md
// Custos, margens e o porquê de cada número: /specs/11-custos-e-precificacao.md
//
// Mudar qualquer número aqui é mudança de produto: editar a spec ANTES.
//
// Revisão de 2026-08-13: **nada é bloqueado por plano, tudo é limitado**. O que
// separa Free de pago é volume, não recurso. A máquina de `Recurso` continua
// aqui de propósito — se voltar a existir feature fechada, ela volta por ela.

export const PLANOS = ["free", "pro", "agencia"] as const;
export type Plano = (typeof PLANOS)[number];

/** Recursos que o plano poderia fechar. Hoje **todos** estão abertos. */
export const RECURSOS = [
  "tarefas",
  "kanban",
  "agente",
  "exportar_csv",
] as const;
export type Recurso = (typeof RECURSOS)[number];

export const LABEL_RECURSO: Record<Recurso, string> = {
  tarefas: "Central de Tarefas",
  kanban: "Funil kanban",
  agente: "Agente Orion",
  exportar_csv: "Exportar CSV",
};

/**
 * Operações com teto **mensal** de plano. Substituem as cotas diárias da F018
 * como limite de produto — a diária continua existindo, mas só como freio
 * anti-loop (ver F035, "Modelo de dados").
 */
/**
 * Só entra aqui operação que **custa dinheiro**. É a régua da F035 desde
 * 2026-08-16: limite existe pra conter custo, não pra criar degrau de venda.
 *
 * `proposta` e `abordagem` saíram no mesmo dia, quando passaram a ser montadas
 * em código e o custo virou $0. Os dois tetos tinham deixado de fazer sentido de
 * formas visíveis: 3 Propostas/mês contra a recomendação da F012 de gerar três
 * opções, e 150 Abordagens contra os 300 Leads que o Pro compra — com o
 * follow-up consumindo a mesma cota, dava 75 Leads trabalhados de 300.
 *
 * Os valores continuam no enum `OperacaoMensal` do banco; as linhas já gravadas
 * viram histórico e param de ser lidas. Sem migração.
 */
export const OPERACOES_MENSAIS = [
  "lead_novo",
  "objecoes",
  "agente_msg",
  "simulador_msg",
] as const;
export type OperacaoMensal = (typeof OPERACOES_MENSAIS)[number];

export const LABEL_OPERACAO_MENSAL: Record<OperacaoMensal, string> = {
  lead_novo: "Leads novos",
  objecoes: "Respostas a objeção",
  agente_msg: "Perguntas ao Agente",
  simulador_msg: "Mensagens no Simulador",
};

export type DefinicaoPlano = {
  plano: Plano;
  nome: string;
  /** Preço mensal em centavos de BRL (0 = grátis). */
  precoCentavos: number;
  /** Teto por operação na competência. */
  limites: Record<OperacaoMensal, number>;
  /** F025 — quantos Leads o botão "Aprofundar" processa por vez. */
  aprofundarPorBusca: number;
  /** Recursos liberados. Hoje todos, em todos os planos. */
  recursos: readonly Recurso[];
  /** Uma linha pra tabela de /planos. */
  resumo: string;
};

const TODOS_RECURSOS: readonly Recurso[] = RECURSOS;

export const CATALOGO_PLANOS: Record<Plano, DefinicaoPlano> = {
  free: {
    plano: "free",
    nome: "Free",
    precoCentavos: 0,
    limites: {
      // 40 = 2 páginas exatas do Places e ~500 alunos dentro do free tier do
      // Google (1.000 req/mês na conta inteira). Era 60 (3 páginas, ~333
      // alunos) até 2026-08-16: o Places é a única linha de custo que não
      // zeramos, então o teto do Free é, na prática, a escolha de quantos
      // alunos gratuitos cabem de graça. Duas buscas de 20 (a menor opção da
      // F033) são um mês de Free.
      lead_novo: 40,
      objecoes: 5,
      // Aperitivo deliberado: 5 perguntas por mês não resolvem trabalho, servem
      // pra ver o Agente responder sobre a própria base.
      agente_msg: 5,
      simulador_msg: 20,
    },
    aprofundarPorBusca: 10,
    recursos: TODOS_RECURSOS,
    resumo: "O suficiente pra fechar o primeiro cliente.",
  },
  pro: {
    plano: "pro",
    nome: "Pro",
    precoCentavos: 3900,
    limites: {
      lead_novo: 300,
      objecoes: 50,
      agente_msg: 100,
      simulador_msg: 300,
    },
    aprofundarPorBusca: 20,
    recursos: TODOS_RECURSOS,
    resumo: "Volume pra operar o funil todo mês.",
  },
  agencia: {
    plano: "agencia",
    nome: "Agência",
    precoCentavos: 9700,
    limites: {
      // Caiu de 1.500 pra 800 em 2026-08-13: a 1.500 a margem no preço de
      // aluno ficava em 25% (ver 11 §5).
      lead_novo: 800,
      objecoes: 80,
      agente_msg: 300,
      simulador_msg: 1000,
    },
    aprofundarPorBusca: 20,
    recursos: TODOS_RECURSOS,
    resumo: "Para quem prospecta várias cidades ao mesmo tempo.",
  },
};

/** Desconto de aluno do Builders Club sobre os planos pagos. */
export const DESCONTO_ALUNO = 0.2;

/** Precedência quando o aluno tem mais de um entitlement. */
const RANK: Record<Plano, number> = { free: 0, pro: 1, agencia: 2 };

export function melhorPlano(planos: readonly Plano[]): Plano {
  return planos.reduce<Plano>(
    (melhor, p) => (RANK[p] > RANK[melhor] ? p : melhor),
    "free",
  );
}

export function definicao(plano: Plano): DefinicaoPlano {
  return CATALOGO_PLANOS[plano];
}

export function temRecurso(plano: Plano, recurso: Recurso): boolean {
  return CATALOGO_PLANOS[plano].recursos.includes(recurso);
}

/** Teto da operação no plano. */
export function limiteDaOperacao(
  plano: Plano,
  operacao: OperacaoMensal,
): number {
  return CATALOGO_PLANOS[plano].limites[operacao];
}

/**
 * Teto mensal de Leads novos. Mantém o nome antigo porque é o que o medidor da
 * topbar mostra — o bônus de BYOK morreu com o fim do BYOK (F035).
 */
export function limiteMensal(plano: Plano): number {
  return limiteDaOperacao(plano, "lead_novo");
}

export function asPlano(raw: string | null | undefined): Plano | null {
  return raw && (PLANOS as readonly string[]).includes(raw)
    ? (raw as Plano)
    : null;
}

/** Menor plano que abre o recurso — o que a UI oferece no cadeado. */
export function planoQueAbre(recurso: Recurso): Plano | null {
  return (
    PLANOS.find((p) => CATALOGO_PLANOS[p].recursos.includes(recurso)) ?? null
  );
}

function formatarBRL(centavos: number): string {
  return `R$ ${(centavos / 100).toFixed(2).replace(".", ",")}`;
}

export function precoFormatado(plano: Plano): string {
  const centavos = CATALOGO_PLANOS[plano].precoCentavos;
  if (centavos === 0) return "Grátis";
  return `${formatarBRL(centavos)}/mês`;
}

/** Preço com o desconto de aluno aplicado, arredondado ao centavo. */
export function precoAlunoFormatado(plano: Plano): string | null {
  const centavos = CATALOGO_PLANOS[plano].precoCentavos;
  if (centavos === 0) return null;
  return `${formatarBRL(Math.round(centavos * (1 - DESCONTO_ALUNO)))}/mês`;
}
