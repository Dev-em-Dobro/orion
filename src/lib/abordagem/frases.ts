// F005/F006/F038 — os textos da Abordagem, escritos à mão.
// Spec: F005-abordagem-whatsapp.md ("Emenda 2026-08-16 — a Abordagem sai da IA")
//
// Este arquivo substitui `prompt.ts` como **fonte única da estratégia de
// mensagem**. A diferença é que playbook em prompt é pedido e playbook aqui é
// garantia: o limite de palavras, o CTA único e a ausência de emoji viraram
// propriedades testáveis do pool.
//
// Mudar texto aqui é mudança de comportamento → editar a spec antes.
//
// REGRA DE ESCRITA: `{negocio}` NUNCA vem precedido de artigo.
//
// Nome de negócio tem gênero imprevisível — "a Padaria do Bairro", "o Salão da
// Rua 9", "a Clínica Vet". Qualquer artigo fixo erra em metade dos Leads, e
// "o Padaria do Bairro" é a marca registrada de texto gerado por máquina: é o
// tipo de erro que um humano não comete, então denuncia a automação na
// primeira linha — exatamente onde a tática 1 estava tentando provar o
// contrário. Por isso "Vi {negocio}", "site de {negocio}", "sobre {negocio}",
// e nunca "o {negocio}" / "do {negocio}" / "no {negocio}".
//
// Há um teste que falha se um artigo voltar a colar no marcador.
//
// COMO CRESCER OS POOLS. O espaço de mensagens é o produto dos slots:
// 4 aberturas × 3 pontes × 3 CTAs = 36 por Dor. Se a colisão entre alunos virar
// problema medido, acrescentar UMA abertura por Dor leva o espaço a 45 (+25%) —
// é o slot com melhor retorno, porque é a primeira linha que o dono lê.

import type { TipoDor } from "@prisma/client";
import { BRAND } from "../brand";

/** Chave dos pools: os 6 `TipoDor` mais o caso "nenhuma Dor detectada". */
export type ChaveAbertura = TipoDor | "SEM_DOR";

/**
 * Aberturas por Dor. Cada uma cita `{negocio}` **uma vez** (tática 6) e abre com
 * a observação concreta (tática 1) — nunca com saudação genérica, que é o que
 * faz a mensagem parecer disparo.
 *
 * Elas são escritas do ponto de vista de quem OLHOU: "abri", "testei",
 * "procurei". É o que prova que houve trabalho antes da mensagem, e é a única
 * coisa que separa isto de spam aos olhos de quem recebe.
 */
export const ABERTURAS: Record<ChaveAbertura, readonly string[]> = {
  SEM_SITE: [
    "Oi! Vi {negocio} no Google e reparei que vocês não têm um site próprio.",
    "Oi! Procurei {negocio} na internet e achei só o cadastro do Google, sem site.",
    "Oi! Dei uma olhada em {negocio} e vi que ainda não tem um site de vocês no ar.",
    "Oi! Fui procurar {negocio} pra ver os serviços e não encontrei site nenhum.",
  ],
  SITE_AGREGADOR: [
    "Oi! Vi que {negocio} usa só link na bio, sem um site próprio.",
    "Oi! Procurei {negocio} e achei só a rede social, nenhum site de vocês.",
    "Oi! Dei uma olhada em {negocio} e vi que a presença de vocês para no perfil.",
    "Oi! Reparei que quem procura {negocio} cai na rede social, não num site.",
  ],
  SITE_LENTO: [
    "Oi! Abri o site de {negocio} no celular e ele demorou bastante pra carregar.",
    "Oi! Testei o site de {negocio} pelo celular e ele está bem lento pra abrir.",
    "Oi! Dei uma olhada no site de {negocio} no celular e a página demora pra aparecer.",
    "Oi! Reparei que o site de {negocio} trava um pouco pra carregar no celular.",
  ],
  SEM_HTTPS: [
    "Oi! Abri o site de {negocio} e o navegador avisa que a conexão não é segura.",
    "Oi! Reparei que o site de {negocio} aparece sem o cadeado de segurança.",
    "Oi! Dei uma olhada no site de {negocio} e ele está sem certificado de segurança.",
    "Oi! Vi que quem abre o site de {negocio} recebe um aviso de site não seguro.",
  ],
  SEM_RESPOSTA_REVIEWS: [
    "Oi! Vi as avaliações de {negocio} no Google e várias ficaram sem resposta.",
    "Oi! Dei uma olhada nas avaliações de {negocio} e a maioria não teve retorno.",
    "Oi! Reparei que {negocio} tem avaliações no Google que ninguém respondeu.",
    "Oi! Olhei o perfil de {negocio} e vi avaliações de clientes esperando resposta.",
  ],
  SEM_ATENDIMENTO_AUTOMATIZADO: [
    "Oi! Dei uma olhada em {negocio} e vi que o atendimento é todo manual.",
    "Oi! Reparei que {negocio} não tem nada automático pra responder fora do horário.",
    "Oi! Vi que quem chama {negocio} depende de alguém estar livre pra responder.",
    "Oi! Olhei {negocio} e não achei atendimento automático pra primeira resposta.",
  ],
  // Sem Dor detectada a mensagem NÃO inventa problema (tática 7 / AC15): ela
  // troca a observação por um convite honesto de conversa.
  SEM_DOR: [
    "Oi! Dei uma olhada em {negocio} e fiquei com uma ideia pra te passar.",
    "Oi! Vi {negocio} no Google e queria te falar de uma coisa rápida.",
    "Oi! Olhei {negocio} e acho que dá pra facilitar o lado de captar cliente.",
    "Oi! Vi {negocio} por aqui e queria trocar uma ideia rápida com você.",
  ],
};

/**
 * A ponte problema → oferta (tática 2). Lê `BRAND.propostaDeValor`, então muda
 * junto com a marca do aluno sem tocar em código.
 */
export const PONTES: readonly string[] = [
  `Isso costuma custar cliente sem ninguém perceber — e é o que a gente resolve: ${BRAND.propostaDeValor}.`,
  `Na prática isso faz cliente desistir antes de falar com vocês. Meu trabalho é ${BRAND.propostaDeValor}.`,
  `É o tipo de coisa que trava cliente na porta. A gente cuida disso: ${BRAND.propostaDeValor}.`,
];

/** CTA único, de sim/não (tática 3). Nunca dois pedidos na mesma mensagem. */
export const CTAS: readonly string[] = [
  `Quer que eu te mande ${BRAND.ofertaDeEntrada}?`,
  `Posso te mandar ${BRAND.ofertaDeEntrada}?`,
  `Te mando ${BRAND.ofertaDeEntrada}?`,
];

/**
 * Follow-up: pool **inteiramente separado** do da primeira mensagem. É isso que
 * garante a AC12 (o 2º toque nunca repete o 1º) por construção — no desenho
 * antigo isso era instrução de prompt, e o modelo sequer via a mensagem
 * anterior pra poder obedecer.
 */
export const RETOMADAS: readonly string[] = [
  "Oi! Passando rápido aqui sobre {negocio}.",
  "Oi! Só retomando o que te falei sobre {negocio}.",
  "Oi! Voltando aqui sobre aquilo de {negocio}.",
  "Oi! Sem querer insistir, só retomando sobre {negocio}.",
];

/** Gancho curto do follow-up: uma frase, só pra lembrar do quê se tratava. */
export const GANCHOS_FOLLOWUP: Record<ChaveAbertura, string> = {
  SEM_SITE: "Era sobre vocês não terem um site próprio.",
  SITE_AGREGADOR: "Era sobre a presença de vocês parar na rede social.",
  SITE_LENTO: "Era sobre o site demorar pra abrir no celular.",
  SEM_HTTPS: "Era sobre o aviso de site não seguro.",
  SEM_RESPOSTA_REVIEWS: "Era sobre as avaliações sem resposta no Google.",
  SEM_ATENDIMENTO_AUTOMATIZADO: "Era sobre o atendimento ser todo manual.",
  SEM_DOR: "Era sobre facilitar o lado de captar cliente.",
};

/** Fecho do follow-up: saída fácil, sem cobrança (tática 3 + F006). */
export const FECHOS_FOLLOWUP: readonly string[] = [
  "O diagnóstico é rápido e não custa nada. Quer que eu mande?",
  "Segue de pé o diagnóstico gratuito, se fizer sentido. Te mando?",
  "Se quiser, te mando o diagnóstico gratuito. Leva poucos minutos. Topa?",
];

// ---------------------------------------------------------------------------
// F038 — roteiro falado
//
// Pool próprio de propósito (ver a emenda da F038): texto que vai ser DITO tem
// prosódia diferente de texto que vai ser lido. Frase curta, sem subordinada
// longa, e uma pausa marcada antes do pedido — que é o que impede o aluno de
// atropelar o CTA, o erro nº 1 de quem está começando a ligar.
// ---------------------------------------------------------------------------

/** Marcador de pausa. Fica no texto porque o roteiro é lido pelo aluno. */
export const PAUSA = "(pausa)";

export const OBSERVACOES_FALADAS: Record<ChaveAbertura, readonly string[]> = {
  SEM_SITE: [
    "eu vi que vocês não têm um site próprio ainda.",
    "reparei que na internet só aparece o cadastro de vocês no Google.",
    "notei que não tem um site de vocês no ar.",
  ],
  SITE_AGREGADOR: [
    "vi que vocês usam só a rede social, sem um site próprio.",
    "reparei que quem procura vocês no Google cai no perfil, não num site.",
    "notei que a presença de vocês para na rede social.",
  ],
  SITE_LENTO: [
    "abri o site de vocês no celular e ele demorou pra carregar.",
    "testei o site pelo celular e ele está lento pra abrir.",
    "notei que o site de vocês trava um pouco no celular.",
  ],
  SEM_HTTPS: [
    "abri o site de vocês e apareceu um aviso de conexão insegura.",
    "reparei que o site está sem o cadeado de segurança.",
    "notei que o site de vocês aparece como não seguro pro visitante.",
  ],
  SEM_RESPOSTA_REVIEWS: [
    "vi que tem avaliações no Google de vocês sem resposta.",
    "reparei que vários clientes avaliaram e não tiveram retorno.",
    "notei que as avaliações de vocês estão sem resposta.",
  ],
  SEM_ATENDIMENTO_AUTOMATIZADO: [
    "vi que o atendimento de vocês é todo manual.",
    "reparei que não tem nada automático respondendo fora do horário.",
    "notei que quem chama vocês precisa esperar alguém ficar livre.",
  ],
  SEM_DOR: [
    "fiquei com uma ideia que pode ajudar vocês.",
    "queria te passar uma ideia rápida.",
    "achei que valia trocar uma ideia com você.",
  ],
};

export const PONTES_FALADAS: readonly string[] = [
  `Isso costuma custar cliente sem a gente perceber. Eu trabalho com ${BRAND.propostaDeValor}.`,
  `Isso faz cliente desistir antes de falar com vocês. O que eu faço é ${BRAND.propostaDeValor}.`,
];

export const CTAS_FALADOS: readonly string[] = [
  `Faz sentido eu te mandar ${BRAND.ofertaDeEntrada}?`,
  `Posso te preparar ${BRAND.ofertaDeEntrada}?`,
];

/** Abertura do roteiro. `{empresa}` sai do BRAND; o nome quem diz é o aluno. */
export const SAUDACAO_FALADA = `Oi, tudo bem? Aqui é da ${BRAND.empresa}.`;

/** Retomada do roteiro falado no 2º toque. */
export const RETOMADA_FALADA = "Oi, tudo bem? Te liguei semana passada, é rapidinho.";
