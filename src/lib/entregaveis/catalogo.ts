// F020 — catálogo estático de entregáveis (Builders Club / Consultoria Freela).

/** Kit .zip gerado sob demanda (mesmos arquivos do hub entregaveis-psi). */
export type KitZip = {
  /** Nome do arquivo baixado (ex.: meu-portfolio.zip). */
  nomeArquivo: string;
  /** Pasta raiz dentro do zip. */
  pastaInterna: string;
  /** Arquivos relativos à pasta do entregável. */
  arquivos: string[];
};

export type Entregavel = {
  slug: string;
  titulo: string;
  descricao: string;
  /** Pasta em content/entregaveis/ (servida via /api/entregaveis). */
  pasta: string;
  /** false = aparece no menu lateral */
  emBreve?: boolean;
  /** Se definido, visão geral exibe "Baixar .zip". */
  kitZip?: KitZip;
};

export const ENTREGAVEIS: Entregavel[] = [
  {
    slug: "arsenal-sites",
    titulo: "Arsenal de sites",
    descricao:
      "12 templates por nicho. Abre, troca os dados do cliente e publica em minutos.",
    pasta: "01-SITES-PRONTOS",
  },
  {
    slug: "prompts",
    titulo: "Biblioteca de prompts",
    descricao:
      "Prompt-mestre para gerar site novo do zero, mais prompts de copy e performance.",
    pasta: "02-PROMPTS",
  },
  {
    slug: "portfolio",
    titulo: "Seu portfólio pronto",
    descricao:
      "Página pronta para mostrar nas abordagens. Troca nome, cidade e WhatsApp.",
    pasta: "04-PORTFOLIO",
    kitZip: {
      nomeArquivo: "meu-portfolio.zip",
      pastaInterna: "meu-portfolio",
      arquivos: [
        "index.html",
        "_GUIA-personalizar.md",
        "_GUIA-publicar-github-pages.md",
      ],
    },
  },
  {
    slug: "contrato",
    titulo: "Modelo de contrato",
    descricao:
      "Contrato para projetos simples: sinal, garantia e escopo fora cobrado à parte.",
    pasta: "05-CONTRATO",
    kitZip: {
      nomeArquivo: "contrato-freela-devemdobro.zip",
      pastaInterna: "contrato-freela",
      arquivos: ["contrato-desenvolvimento.md", "_GUIA-como-usar.md"],
    },
  },
  {
    slug: "scripts-venda",
    titulo: "Scripts de venda",
    descricao:
      "Do primeiro oi ao contrato: abertura, follow-up, objeção e fechamento.",
    pasta: "06-SCRIPTS-VENDA",
    kitZip: {
      nomeArquivo: "scripts-de-venda-devemdobro.zip",
      pastaInterna: "scripts-de-venda",
      arquivos: ["scripts-de-venda.md", "_GUIA-como-usar.md"],
    },
  },
  {
    slug: "setup-orion",
    titulo: "Setup do Orion",
    descricao:
      "Guia para destravar a chave Google (Places e PageSpeed) e resolver erros comuns.",
    pasta: "07-SETUP-ORION",
  },
  {
    slug: "briefing",
    titulo: "Briefing do cliente",
    descricao:
      "Formulário para levantar tudo antes de codar e evitar retrabalho.",
    pasta: "08-BRIEFING",
  },
  {
    slug: "precificacao",
    titulo: "Precificação",
    descricao:
      "Faixas de referência para site, landing, bot e manutenção mensal.",
    pasta: "09-PRECIFICACAO",
  },
  {
    slug: "crm",
    titulo: "Modelo de CRM",
    descricao: "CRM para usar e revender — chegando nas próximas consultorias.",
    pasta: "",
    emBreve: true,
  },
  {
    slug: "cms",
    titulo: "Modelo de CMS",
    descricao: "Painel para o cliente editar o site — chegando em breve.",
    pasta: "",
    emBreve: true,
  },
  {
    slug: "agentes-whatsapp",
    titulo: "Agentes no WhatsApp",
    descricao: "Tutorial de agente conectado ao WhatsApp — chegando em breve.",
    pasta: "",
    emBreve: true,
  },
];

export const ENTREGAVEIS_MENU = ENTREGAVEIS.filter((e) => !e.emBreve);

export function entregavelPorSlug(slug: string): Entregavel | undefined {
  return ENTREGAVEIS.find((e) => e.slug === slug);
}
