// F011 (emenda 2026-08-13) — catálogo curado de objeções comuns.
// Spec: /specs/02-features/F011-assistente-de-objecoes.md
//
// Conteúdo é comportamento: mexer aqui é mexer no que o aluno fala com o
// cliente → atualizar a spec antes.
//
// Escrito à mão, e não gerado: são as mesmas oito objeções que todo dono de
// negócio local dá. Pagar latência e cota de IA pra redescobri-las a cada
// conversa é desperdício, e o resultado varia de aluno pra aluno quando o
// certo é a turma inteira ter o mesmo repertório revisável em PR.
//
// Sem dep de Next: a UI importa, e o teste também.

import { BRAND } from "../brand";

export type RespostaPronta = {
  /** Rótulo curto da tática — o aluno aprende o porquê, não só o texto. */
  tatica: string;
  /** Pronta pra colar. `{negocio}` vira o nome do Lead na renderização. */
  texto: string;
};

export type ObjecaoComum = {
  id: string;
  /** Como o dono do negócio fala, nas palavras dele. */
  rotulo: string;
  /** O que está por trás — quase nunca é o que ele disse. */
  porQue: string;
  /** A pergunta que devolve a conversa pro seu lado. */
  perguntaChave: string;
  respostas: RespostaPronta[];
};

/**
 * Ordem = frequência real na prospecção de negócio local. "Já tenho site" é a
 * primeira de propósito: é a mais comum e a mais fácil de responder errado.
 */
export const OBJECOES_COMUNS: ObjecaoComum[] = [
  {
    id: "ja-tenho-site",
    rotulo: "Já tenho site",
    porQue:
      "Ele ouviu 'você precisa de um site' e respondeu o óbvio: já tem um. A conversa só anda se sair de TER site pra o site TRAZER cliente — que é outra pergunta, e uma que ele quase nunca sabe responder.",
    perguntaChave:
      "Dos clientes que entraram esse mês, você consegue dizer quantos vieram pelo site?",
    respostas: [
      {
        tatica: "Separar ter de funcionar",
        texto:
          "Vi sim, {negocio}. Minha pergunta nem é sobre ter site — é sobre ele trazer cliente. Dos atendimentos do mês passado, você consegue dizer quantos vieram por ele?",
      },
      {
        tatica: "Expor a falta de medição",
        texto:
          "Faz sentido. Deixa eu perguntar diferente: hoje você tem como saber quantas pessoas entraram no site e quantas viraram cliente? A maioria dos sites de negócio local não mede isso — e aí ninguém sabe se está funcionando ou só existindo.",
      },
      {
        tatica: "Reposicionar a oferta",
        texto:
          "Então talvez eu nem precise te fazer um site — precise te fazer um que traga demanda, que é coisa diferente. Posso te mostrar em 10 minutos o que o seu está deixando passar hoje?",
      },
    ],
  },
  {
    id: "quanto-custa",
    rotulo: "Quanto custa?",
    porQue:
      "Perguntar preço no primeiro contato quase nunca é interesse — é atalho pra encerrar. Dar um número agora te transforma em orçamento sem contexto, e você perde pro mais barato.",
    perguntaChave:
      "Antes do preço: o que você precisa que aconteça pra esse investimento valer a pena?",
    respostas: [
      {
        tatica: "Ancorar antes de precificar",
        texto:
          "Varia bastante com o que você precisa. Pra eu não te dar número no chute: o que precisaria acontecer pra esse investimento valer a pena pra você? Com isso eu te falo o valor certo, não um genérico.",
      },
      {
        tatica: "Trocar preço por diagnóstico",
        texto:
          "Te falo sim, mas ia ser chute agora. O que eu faço primeiro é {oferta} — aí eu te mostro o que dá pra resolver e quanto custa cada parte. Pode ser?",
      },
    ],
  },
  {
    id: "ta-caro",
    rotulo: "Achei caro",
    porQue:
      "'Caro' é comparação, não valor absoluto — ele está comparando com algo que não disse. Quase sempre com um preço de mercado que não entrega a mesma coisa, ou com fazer nada.",
    perguntaChave: "Caro comparado com o quê?",
    respostas: [
      {
        tatica: "Descobrir a âncora",
        texto:
          "Entendo. Caro comparado com o quê? Pergunto de verdade — se o que você viu mais barato entrega a mesma coisa, eu te falo com sinceridade que vale a pena ir nele.",
      },
      {
        tatica: "Quebrar no contexto do negócio",
        texto:
          "Faz sentido pensar no custo. Só pra dimensionar: quanto vale um cliente novo pra {negocio}, na média? Se o site trouxer um por mês, em quanto tempo ele se paga?",
      },
      {
        tatica: "Reduzir escopo, não preço",
        texto:
          "Dá pra começar menor. Em vez do projeto inteiro, a gente faz a parte que resolve o problema mais caro primeiro e você vê o resultado antes de decidir o resto. Quer que eu monte assim?",
      },
    ],
  },
  {
    id: "sem-verba",
    rotulo: "Agora não dá / não tenho verba",
    porQue:
      "Pode ser verdade, pode ser 'não é prioridade'. São coisas diferentes e pedem respostas diferentes — vale descobrir qual antes de insistir.",
    perguntaChave: "É questão de momento ou de prioridade?",
    respostas: [
      {
        tatica: "Separar momento de prioridade",
        texto:
          "Tranquilo. Só pra eu entender: é o momento mesmo ou é que não é prioridade agora? Se for o momento, eu te procuro mais pra frente e a gente não perde a conversa.",
      },
      {
        tatica: "Manter a porta aberta com data",
        texto:
          "Sem problema. Te chamo daqui a 30 dias então? Enquanto isso te deixo {oferta} — sem custo e sem compromisso, pra você ter o mapa quando decidir mexer nisso.",
      },
    ],
  },
  {
    id: "ja-tenho-quem-faz",
    rotulo: "Tenho um sobrinho / já tem quem cuida",
    porQue:
      "Raramente existe alguém cuidando de verdade. Existe alguém que fez uma vez. Atacar essa pessoa te queima — o caminho é perguntar por manutenção e responsabilidade.",
    perguntaChave: "Quando o site dá problema, em quanto tempo ele volta?",
    respostas: [
      {
        tatica: "Perguntar por responsabilidade",
        texto:
          "Ótimo ter alguém de confiança. Só uma coisa: quando o site cai ou para de aparecer no Google, em quanto tempo ele resolve? É onde a maioria trava — o site existe, mas ninguém é dono do resultado.",
      },
      {
        tatica: "Não competir, complementar",
        texto:
          "Não quero tomar o lugar de ninguém, {negocio}. Eu faço {oferta} e te entrego o que achei — se ele conseguir resolver, ótimo, você ganhou de graça. Se não, a gente conversa. Justo?",
      },
    ],
  },
  {
    id: "so-indicacao",
    rotulo: "Meus clientes vêm por indicação",
    porQue:
      "É verdade e é um bom sinal — o negócio é bom. O problema é que indicação tem teto e não tem torneira: ele não consegue aumentar quando precisa.",
    perguntaChave: "E quando você quer acelerar, o que você faz?",
    respostas: [
      {
        tatica: "Reconhecer e achar o teto",
        texto:
          "Isso é ótimo sinal — quer dizer que o serviço é bom. A pergunta é: num mês fraco, o que você faz pra trazer cliente? Indicação não tem torneira, e é aí que o resto entra.",
      },
      {
        tatica: "Mostrar o cliente que já procurou",
        texto:
          "Faz sentido. Só que quem te indicam também te pesquisa antes de ligar — e o que ele acha nessa hora decide se ele liga ou não. É essa parte que eu olho em {oferta}. Posso te mostrar?",
      },
    ],
  },
  {
    id: "so-instagram",
    rotulo: "Eu só uso Instagram / WhatsApp",
    porQue:
      "Funciona até parar de funcionar. Ele está construindo em terreno alugado: não é dono do público, não é dono do alcance, e não aparece pra quem busca no Google.",
    perguntaChave:
      "Se o perfil cair amanhã, você consegue falar com os seus clientes?",
    respostas: [
      {
        tatica: "Terreno alugado",
        texto:
          "Instagram funciona bem mesmo. Só que o público é da plataforma, não seu: se o perfil cair ou o alcance despencar, você fica sem canal. Já pensou em ter um lugar que é seu, ligado no que você já faz por lá?",
      },
      {
        tatica: "Quem busca não acha",
        texto:
          "Entendo. Mas quem procura '{categoria} perto de mim' no Google não te acha pelo Instagram — vai cair no concorrente. É esse cliente que você não vê que eu queria te mostrar em {oferta}.",
      },
    ],
  },
  {
    id: "ja-tentei",
    rotulo: "Já tentei isso e não deu resultado",
    porQue:
      "Ele foi queimado antes e está te avisando. Insistir na oferta é confirmar a desconfiança; o caminho é investigar o que foi feito.",
    perguntaChave: "O que exatamente foi feito, e como você mediu?",
    respostas: [
      {
        tatica: "Investigar antes de propor",
        texto:
          "Já ouvi isso bastante e quase sempre por um bom motivo. Me conta: o que fizeram, e como você acompanhou o resultado? Se foi site parado sem ninguém olhando, faz sentido não ter dado.",
      },
      {
        tatica: "Diferenciar pelo critério",
        texto:
          "Justo desconfiar. A diferença aqui é que a gente combina antes o que é resultado — quantos contatos por mês, medidos. Se não der, você sabe rápido. Topa eu te mostrar o que dá pra medir hoje?",
      },
    ],
  },
  {
    id: "me-manda-depois",
    rotulo: "Me manda por WhatsApp / depois eu vejo",
    porQue:
      "Educado pra encerrar. Mandar material sem compromisso é jogar no vácuo — vale trocar por um micro-compromisso com data.",
    perguntaChave: "Te chamo quinta pra saber o que achou?",
    respostas: [
      {
        tatica: "Micro-compromisso com data",
        texto:
          "Mando sim. Só pra não ficar no vácuo: te chamo quinta pra saber o que achou? Se não fizer sentido, você me fala e eu paro de te incomodar.",
      },
      {
        tatica: "Trocar material por 5 minutos",
        texto:
          "Posso mandar, mas é mais rápido eu te mostrar: são 5 minutos e você já sai sabendo o que está deixando passar. Amanhã de manhã ou de tarde é melhor?",
      },
    ],
  },
  {
    id: "preciso-pensar",
    rotulo: "Preciso pensar / falar com meu sócio",
    porQue:
      "Ou tem um decisor de verdade, ou é 'não' com educação. Descobrir qual é a única coisa útil agora.",
    perguntaChave: "O que ainda ficou em aberto pra você?",
    respostas: [
      {
        tatica: "Achar a dúvida real",
        texto:
          "Claro. Só me ajuda numa coisa: o que ficou em aberto? Se for preço, prazo ou confiança, eu já te respondo agora e você pensa com tudo na mão.",
      },
      {
        tatica: "Incluir o decisor",
        texto:
          "Perfeito, decisão de dois é melhor mesmo. Quer que eu mande num formato que ele consiga ler em 2 minutos? E se rolar, participo da conversa pra tirar dúvida na hora.",
      },
    ],
  },
];

export const OBJECAO_POR_ID = new Map(OBJECOES_COMUNS.map((o) => [o.id, o]));

/**
 * Troca os marcadores do texto pelos dados reais. Feito aqui, e não no
 * componente, pra o texto **copiado** sair igual ao exibido (AC13).
 *
 * Marcador sem dado vira algo neutro em vez de vazar `{negocio}` pro cliente.
 */
export function personalizar(
  texto: string,
  dados: { negocio?: string | null; categoria?: string | null },
): string {
  return texto
    .replaceAll("{negocio}", dados.negocio?.trim() || "vocês")
    .replaceAll("{categoria}", dados.categoria?.trim().toLowerCase() || "serviço")
    .replaceAll("{oferta}", BRAND.ofertaDeEntrada);
}
