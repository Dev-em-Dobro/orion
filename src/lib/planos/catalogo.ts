// F035 — planos, limites e recursos. Dado puro, sem Prisma e sem Next.
// Spec: /specs/02-features/F035-planos-e-limites.md
// Custos e preços: /specs/11-custos-e-precificacao.md
//
// Mudar qualquer número aqui é mudança de produto: editar a spec ANTES.

export const PLANOS = ["free", "pro", "agencia"] as const;
export type Plano = (typeof PLANOS)[number];

/** Recursos que o plano abre ou fecha. */
export const RECURSOS = [
  "email",
  "tarefas",
  "kanban",
  "agente",
  "exportar_csv",
] as const;
export type Recurso = (typeof RECURSOS)[number];

export const LABEL_RECURSO: Record<Recurso, string> = {
  email: "Outreach por e-mail",
  tarefas: "Central de Tarefas",
  kanban: "Funil kanban",
  agente: "Agente Orion",
  exportar_csv: "Exportar CSV",
};

export type DefinicaoPlano = {
  plano: Plano;
  nome: string;
  /** Preço mensal em centavos de BRL (0 = grátis). */
  precoCentavos: number;
  /** Teto de Leads que recebem o **primeiro** Diagnóstico na competência. */
  leadsDiagnosticadosMes: number;
  /** F025 — quantos Leads o botão "Aprofundar" processa por vez. */
  aprofundarPorBusca: number;
  /** Recursos liberados. Ausente = com cadeado, visível, levando a /planos. */
  recursos: readonly Recurso[];
  /**
   * BYOK dobra o teto mensal **só no plano pago** (F035, "Bônus BYOK"): no
   * Free, dobrar seria furar a decisão de que o limite vale mesmo em BYOK.
   */
  bonusByok: boolean;
  /** Uma linha pra tabela de /planos. */
  resumo: string;
};

export const CATALOGO_PLANOS: Record<Plano, DefinicaoPlano> = {
  free: {
    plano: "free",
    nome: "Free",
    precoCentavos: 0,
    leadsDiagnosticadosMes: 50,
    aprofundarPorBusca: 10,
    recursos: [],
    bonusByok: false,
    resumo: "O suficiente pra fechar o primeiro cliente.",
  },
  pro: {
    plano: "pro",
    nome: "Pro",
    precoCentavos: 3900,
    leadsDiagnosticadosMes: 300,
    aprofundarPorBusca: 20,
    recursos: ["email", "tarefas", "kanban", "agente", "exportar_csv"],
    bonusByok: true,
    resumo: "Volume e as ferramentas de operação do funil.",
  },
  agencia: {
    plano: "agencia",
    nome: "Agência",
    precoCentavos: 9700,
    leadsDiagnosticadosMes: 1500,
    aprofundarPorBusca: 20,
    recursos: ["email", "tarefas", "kanban", "agente", "exportar_csv"],
    bonusByok: true,
    resumo: "Para quem prospecta várias cidades ao mesmo tempo.",
  },
};

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

/** Teto efetivo: o do plano, dobrado se BYOK e o plano der o bônus. */
export function limiteMensal(plano: Plano, byok: boolean): number {
  const def = CATALOGO_PLANOS[plano];
  return byok && def.bonusByok
    ? def.leadsDiagnosticadosMes * 2
    : def.leadsDiagnosticadosMes;
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

export function precoFormatado(plano: Plano): string {
  const centavos = CATALOGO_PLANOS[plano].precoCentavos;
  if (centavos === 0) return "Grátis";
  return `R$ ${(centavos / 100).toFixed(2).replace(".", ",")}/mês`;
}
