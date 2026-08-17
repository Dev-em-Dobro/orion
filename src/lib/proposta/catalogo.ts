// F012 (emenda de precificação 2026-08-16) — o catálogo que se ensina.
// Spec: /specs/02-features/F012-gerador-de-proposta.md
//
// Fonte: tabela de precificação do Arsenal (Builders Club). As faixas são
// REFERÊNCIA VISÍVEL AO ALUNO e nunca chegam ao cliente — ver AC23. Mudar
// número aqui é mudar o que se ensina, não ajustar código: edite a spec antes.
//
// Sem Next e sem Prisma: é lista e aritmética, e é o que os testes exercitam.

export type TipoItem = "projeto" | "recorrencia";

export type ItemCatalogo = {
  id: ItemId;
  titulo: string;
  /** A coluna "O que inclui" da tabela — vira a descrição no PDF. */
  inclui: string;
  /**
   * O **porquê** do item, em uma frase, na língua do dono do negócio.
   *
   * Existe porque a regra que a IA seguia era "conecte cada item a um problema
   * real, não só ao 'o quê'" — e com a montagem em código (emenda de
   * 2026-08-16) essa regra precisa de um lugar pra morar. `inclui` responde o
   * que é; `porque` responde por que está na proposta.
   *
   * **Nunca cita dinheiro nem prazo** — os dois são do aluno (AC34).
   */
  porque: string;
  /**
   * O que o cliente recebe. Vira a seção "Você recebe" da folha, como união
   * dos itens marcados, sem repetir (AC35).
   */
  entregaveis: readonly string[];
  tipo: TipoItem;
  /** Faixa de referência em BRL. `max: null` = "R$ 5.000 +" na tabela. */
  faixa: { min: number; max: number | null };
  /**
   * Semanas de execução. `null` na recorrência, que não "termina".
   *
   * Ao contrário do preço, isto é conhecimento do catálogo e não do mercado:
   * landing leva menos que sistema em qualquer cidade. Por isso o prazo nasce
   * sugerido com confiança, e o preço nasce como faixa de referência.
   */
  semanas: { min: number; max: number } | null;
};

export type ItemId =
  | "landing"
  | "site_institucional"
  | "site_admin"
  | "sistema"
  | "bot_whatsapp"
  | "manutencao_site"
  | "manutencao_bot"
  | "hospedagem";

/**
 * A ordem é a da tabela: projeto do mais barato pro mais caro, depois as
 * recorrências. É a ordem em que o aluno pensa a venda.
 */
export const CATALOGO: readonly ItemCatalogo[] = [
  {
    id: "landing",
    titulo: "Landing page",
    inclui:
      "Página única: apresentação, serviços e botão de WhatsApp.",
    porque:
      "É a página que responde “vocês existem e fazem o quê” pra quem chega pelo Google.",
    entregaveis: [
      "Página no ar, no seu domínio",
      "Layout que funciona bem no celular",
      "Botão de WhatsApp ligado ao seu número",
    ],
    tipo: "projeto",
    faixa: { min: 300, max: 800 },
    semanas: { min: 1, max: 2 },
  },
  {
    id: "site_institucional",
    titulo: "Site institucional completo",
    inclui:
      "Várias seções, galeria, SEO, responsivo e formulário de contato.",
    porque:
      "Dá a quem procura o negócio um lugar próprio, que você controla e ninguém tira do ar.",
    entregaveis: [
      "Site completo no ar, no seu domínio",
      "Layout que funciona bem no celular",
      "Formulário de contato chegando no seu e-mail",
      "Páginas principais preparadas para busca no Google",
    ],
    tipo: "projeto",
    faixa: { min: 800, max: 2500 },
    semanas: { min: 2, max: 4 },
  },
  {
    id: "site_admin",
    titulo: "Site + painel administrativo",
    inclui:
      "Site com área administrativa: cadastros, agenda e relatórios.",
    porque:
      "Tira do papel e do WhatsApp o que hoje se controla de cabeça.",
    entregaveis: [
      "Site completo no ar, no seu domínio",
      "Painel administrativo com login próprio",
      "Cadastros e agenda no painel",
      "Relatórios de acompanhamento",
    ],
    tipo: "projeto",
    faixa: { min: 2500, max: 6000 },
    semanas: { min: 4, max: 8 },
  },
  {
    id: "sistema",
    titulo: "Sistema sob medida",
    inclui:
      "Login, banco de dados, pagamento, portal do cliente e painéis.",
    porque:
      "É o que o negócio precisa e nenhum sistema pronto de prateleira entrega.",
    entregaveis: [
      "Sistema no ar com login de usuário",
      "Banco de dados próprio do negócio",
      "Portal para o seu cliente acompanhar",
      "Painéis de acompanhamento para você",
    ],
    tipo: "projeto",
    faixa: { min: 5000, max: null },
    semanas: { min: 8, max: 12 },
  },
  {
    id: "bot_whatsapp",
    titulo: "Agente de WhatsApp",
    inclui:
      "Setup, treinamento do agente e publicação no número da empresa.",
    porque:
      "Responde a primeira mensagem na hora, inclusive quando ninguém está disponível.",
    entregaveis: [
      "Agente publicado no número da empresa",
      "Fluxo de atendimento treinado com as suas informações",
      "Transferência para uma pessoa quando a conversa precisar",
    ],
    tipo: "projeto",
    faixa: { min: 500, max: 1500 },
    semanas: { min: 1, max: 2 },
  },
  {
    id: "manutencao_site",
    titulo: "Manutenção do site",
    inclui: "Ajustes, textos novos, fotos, promoções e segurança.",
    porque:
      "Site parado envelhece rápido: informação velha afasta cliente tanto quanto não ter site.",
    entregaveis: [
      "Ajustes de texto e imagem sempre que precisar",
      // "em dia" saiu: num documento comercial, qualquer palavra de tempo lê
      // como prazo, e prazo é do aluno (AC34). O teste cobra isso.
      "Atualizações de segurança do site",
      "Publicação de promoções e novidades",
    ],
    tipo: "recorrencia",
    faixa: { min: 50, max: 200 },
    semanas: null,
  },
  {
    id: "manutencao_bot",
    titulo: "Manutenção do agente",
    inclui: "Ajustes de fluxo e créditos de mensagem.",
    porque:
      "O fluxo de atendimento precisa acompanhar o que muda no negócio.",
    entregaveis: [
      "Ajustes no fluxo de conversa",
      "Créditos de mensagem inclusos",
      "Acompanhamento do que os clientes mais perguntam",
    ],
    tipo: "recorrencia",
    faixa: { min: 100, max: 400 },
    semanas: null,
  },
  {
    id: "hospedagem",
    titulo: "Hospedagem gerenciada",
    inclui: "Servidor, domínio e monitoramento sob nossa responsabilidade.",
    porque:
      "Servidor, domínio e renovação deixam de ser problema seu para virar problema nosso.",
    entregaveis: [
      "Servidor e domínio sob nossa responsabilidade",
      "Monitoramento de disponibilidade do site",
      "Backup periódico",
    ],
    tipo: "recorrencia",
    faixa: { min: 30, max: 100 },
    semanas: null,
  },
];

export function item(id: ItemId): ItemCatalogo {
  const achado = CATALOGO.find((i) => i.id === id);
  // O tipo já garante, mas um `find` sem guarda devolveria `undefined` calado.
  if (!achado) throw new Error(`[proposta] item fora do catálogo: ${id}`);
  return achado;
}

/** "R$ 800 a R$ 2.500" / "a partir de R$ 5.000" — só para o aluno. */
export function faixaDeReferencia(id: ItemId): string {
  const { faixa } = item(id);
  const brl = (v: number) => `R$ ${v.toLocaleString("pt-BR")}`;
  return faixa.max === null
    ? `a partir de ${brl(faixa.min)}`
    : `${brl(faixa.min)} a ${brl(faixa.max)}`;
}

/**
 * Compromisso mínimo da recorrência, da tabela: "cobre a manutenção por no
 * mínimo 3 meses". Vira linha no PDF quando há item mensal.
 */
export const MESES_MINIMOS_RECORRENCIA = 3;
