// F030 — catálogo de Skills. Espelha o padrão do catálogo de entregáveis
// (F020): config estática, conteúdo em `content/skills/<slug>/`.
// Spec: /specs/02-features/F030-menu-skills.md
//
// Adicionar uma skill = criar a pasta em `content/skills/` e uma entrada aqui.
// Nenhuma rota, nenhum componente.

export type Skill = {
  /** Identificador na URL e nome da pasta em content/skills/. */
  slug: string;
  titulo: string;
  /** Uma linha: o que a skill faz. */
  resumo: string;
  /** Situações reais em que ela vale a pena. */
  quandoUsar: string[];
  versao: string;
  /**
   * `false` mantém fora do menu (mesmo padrão "em breve" da F020). Use enquanto
   * o conteúdo não estiver em `content/skills/<slug>/`.
   */
  disponivel: boolean;
};

export const SKILLS: Skill[] = [
  {
    slug: "extrator-de-dna",
    titulo: "Extrator de DNA",
    resumo:
      "Extrai o DNA visual e de comunicação de um negócio para o site nascer com a cara dele.",
    quandoUsar: [
      "Antes de gerar o site de um cliente novo, para não entregar template genérico",
      "Quando o cliente não sabe descrever o que quer, mas tem redes e materiais prontos",
      "Para padronizar briefing entre vários clientes",
    ],
    versao: "1.0",
    // PENDENTE: aguardando os arquivos em content/skills/extrator-de-dna/.
    disponivel: false,
  },
];

export const SKILLS_POR_SLUG = new Map(SKILLS.map((s) => [s.slug, s]));

/** Só as com conteúdo — é o que entra no menu e na visão geral. */
export const SKILLS_MENU = SKILLS.filter((s) => s.disponivel);

export function skillPorSlug(slug: string): Skill | null {
  const s = SKILLS_POR_SLUG.get(slug);
  return s?.disponivel ? s : null;
}
