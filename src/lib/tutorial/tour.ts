// F040 — o catálogo do tour do menu e a aritmética do balão.
// Spec: /specs/02-features/F040-tour-do-menu.md
//
// Sem Next e sem DOM de propósito: `posicionarBalao` recebe **retângulos**, não
// elementos. Quem mede é o componente; quem decide onde o balão cabe é esta
// função, e é ela que os testes exercitam (AC5 e AC6).

import { temRecurso, type Plano, type Recurso } from "@/lib/planos/catalogo";
import { PLANOS_NA_UI } from "@/lib/planos/exibicao";

/**
 * Sinal que começa o tour a partir de fora da sidebar (hoje: o painel da F039).
 *
 * `CustomEvent` e não contexto novo: é um sinal sem carga, de um botão pra um
 * listener. Um provider no shell custaria re-render em toda rota (F028) pra
 * transportar um booleano que muda uma vez por sessão.
 */
export const EVENTO_TOUR = "orion:tour-do-menu";

/** Largura fixa do balão, em px. O que varia é a altura — e ela é medida. */
export const LARGURA_BALAO = 320;

/** Folga entre o alvo e o balão, e entre o balão e a borda da viewport. */
export const MARGEM_BALAO = 12;

export type PassoDoTour = {
  id: string;
  /**
   * Valor do `data-tour` do item de menu. `null` = passo centralizado, sem
   * alvo — é o de abertura.
   */
  alvo: string | null;
  titulo: string;
  texto: string;
  /** F035 — recurso de plano pago. O passo **não some**: ganha o aviso. */
  recurso?: Recurso;
};

// Nunca renderiza hoje (nenhum recurso é fechado por plano), mas a pausa de
// 2026-08-17 vale aqui também: não se cita uma tela que está fora do ar.
export const AVISO_BLOQUEADO = PLANOS_NA_UI
  ? "Fechado no seu plano — o cadeado no item leva para a tela de Planos."
  : "Indisponível no momento.";

/**
 * Um passo por item de menu, **na ordem do menu**. A ordem do array é a ordem
 * do tour; não há campo `ordem` pra sair de sincronia com ela.
 *
 * Duas frases por passo, no máximo: o tour é lido em pé, no meio de outra
 * coisa. Cada texto responde "o que é" e "quando se usa" — nunca "clique aqui
 * para", que é o que faria o tour envelhecer junto com o layout.
 */
export const PASSOS_DO_TOUR: readonly PassoDoTour[] = [
  {
    id: "abertura",
    alvo: null,
    titulo: "Este é o menu do Orion",
    texto:
      "Vou acender um item por vez e dizer o que ele faz — leva menos de um minuto. Use as setas do teclado para andar, e Esc para sair a qualquer momento.",
  },
  {
    id: "dashboard",
    alvo: "dashboard",
    titulo: "Dashboard",
    texto:
      "Abre na Fila do dia: os melhores Leads de hoje, já com a Dor achada e a Abordagem pronta. É por aqui que o seu dia começa.",
  },
  {
    id: "leads",
    alvo: "leads",
    titulo: "Leads",
    texto:
      "Onde a busca acontece: você escolhe o nicho e a cidade, e o Orion traz os estabelecimentos já triados. Também é a lista completa da sua base, com filtros.",
  },
  {
    id: "funil",
    alvo: "funil",
    titulo: "Funil",
    texto:
      "O quadro de onde cada Lead parou depois que você falou com ele. Arrastar o card é o que faz o Dashboard dizer a verdade sobre o seu mês.",
    recurso: "kanban",
  },
  {
    id: "agente",
    alvo: "agente",
    titulo: "Agente",
    texto:
      "Pergunte em português sobre a sua própria base: quem vale a pena hoje, o que está parado, quem nunca respondeu. Ele lê os seus Leads, não a internet.",
    recurso: "agente",
  },
  {
    id: "tarefas",
    alvo: "tarefas",
    titulo: "Tarefas",
    texto:
      "O que ficou parado e está pedindo resposta: Abordagem sem retorno, proposta esquecida. O número ao lado do item é o que já venceu.",
    recurso: "tarefas",
  },
  {
    id: "ranking",
    alvo: "ranking",
    titulo: "Ranking",
    texto:
      "O placar do mês entre os usuários — registrar venda é o que pontua. Zera todo mês.",
  },
  {
    id: "treino",
    alvo: "treino",
    titulo: "Simulador de venda",
    texto:
      "Treine a conversa com um dono de negócio simulado antes de gastar um Lead de verdade. As objeções que ele levanta são as que você vai ouvir.",
  },
  {
    id: "skills",
    alvo: "skills",
    titulo: "Skills",
    texto:
      "As aulas aplicadas ao seu caso, dentro do app. O grupo só aparece quando há skill publicada — se você não está vendo, não há nenhuma ainda.",
  },
  {
    id: "planos",
    alvo: "planos",
    titulo: "Planos",
    texto:
      "O que cada plano abre e qual é o teto de uso do seu. É para cá que o cadeado dos itens fechados leva.",
  },
  {
    id: "configuracao",
    alvo: "configuracao",
    titulo: "Configuração",
    texto: "Edite as Configurações da sua conta.",
  },
  {
    id: "primeiros-passos",
    alvo: "primeiros-passos",
    titulo: "Primeiros passos",
    texto:
      "Este botão responde a outra pergunta: em que ordem fazer — buscar, aprofundar, abordar, acompanhar — e quanto você já andou, lido da sua base. Quando bater o 'e agora?', é aqui.",
  },
];

export type PassoDoTourComEstado = PassoDoTour & {
  /** F035 — o recurso do passo está fora do plano do aluno. */
  bloqueado: boolean;
};

/**
 * Os passos com o cadeado do plano resolvido.
 *
 * Item de plano pago **não sai do tour**: ele continua no menu com cadeado
 * justamente porque ver é o que dá vontade de assinar (F035), e o tour é quem
 * tem que explicar o que aquele cadeado significa.
 *
 * Quem some é outra coisa e por outro caminho: passo cujo alvo não está no DOM
 * (Skills sem skill publicada, item renomeado) é descartado pelo componente,
 * que é quem enxerga o DOM. Aqui não há lista de exceção pra manter.
 */
export function passosDoTour(plano: Plano): PassoDoTourComEstado[] {
  return PASSOS_DO_TOUR.map((passo) => ({
    ...passo,
    bloqueado: passo.recurso ? !temRecurso(plano, passo.recurso) : false,
  }));
}

export type Retangulo = {
  top: number;
  left: number;
  largura: number;
  altura: number;
};

export type Lado = "direita" | "esquerda" | "abaixo" | "acima" | "centro";

export type Posicao = { top: number; left: number; lado: Lado };

/** Prende um valor no intervalo que mantém o balão inteiro dentro da tela. */
function preso(valor: number, tamanho: number, limite: number, margem: number) {
  const maximo = Math.max(margem, limite - tamanho - margem);
  return Math.min(Math.max(valor, margem), maximo);
}

/**
 * Onde o balão abre. Tentativa em ordem, e a **primeira que couber** vence:
 * direita → esquerda → abaixo → acima → centro.
 *
 * Não há regra por dispositivo, e é de propósito: a conta é sobre onde o alvo
 * **está**, não sobre o tamanho da tela. No desktop a sidebar mora na borda
 * esquerda e ganha "direita"; no mobile o drawer mora na borda direita e ganha
 * "esquerda". O mesmo cálculo, dois resultados certos.
 *
 * O eixo cruzado é centralizado no alvo e preso à viewport — é isso que impede
 * o balão de nascer cortado quando o alvo está no topo ou no rodapé do menu.
 */
export function posicionarBalao(
  alvo: Retangulo | null,
  balao: { largura: number; altura: number },
  viewport: { largura: number; altura: number },
  margem: number = MARGEM_BALAO,
): Posicao {
  const centro = (): Posicao => ({
    top: Math.max(margem, (viewport.altura - balao.altura) / 2),
    left: Math.max(margem, (viewport.largura - balao.largura) / 2),
    lado: "centro",
  });

  // Passo de abertura: sem alvo, o balão é o próprio assunto.
  if (!alvo) return centro();

  const meioVertical = preso(
    alvo.top + alvo.altura / 2 - balao.altura / 2,
    balao.altura,
    viewport.altura,
    margem,
  );
  const meioHorizontal = preso(
    alvo.left + alvo.largura / 2 - balao.largura / 2,
    balao.largura,
    viewport.largura,
    margem,
  );

  const direita = alvo.left + alvo.largura + margem;
  if (direita + balao.largura + margem <= viewport.largura) {
    return { top: meioVertical, left: direita, lado: "direita" };
  }

  const esquerda = alvo.left - margem - balao.largura;
  if (esquerda >= margem) {
    return { top: meioVertical, left: esquerda, lado: "esquerda" };
  }

  const abaixo = alvo.top + alvo.altura + margem;
  if (abaixo + balao.altura + margem <= viewport.altura) {
    return { top: abaixo, left: meioHorizontal, lado: "abaixo" };
  }

  const acima = alvo.top - margem - balao.altura;
  if (acima >= margem) {
    return { top: acima, left: meioHorizontal, lado: "acima" };
  }

  // Tela menor que o balão nos quatro lados: ele vai pro meio e cobre o alvo.
  // O anel do recorte continua marcando onde o item está.
  return centro();
}
