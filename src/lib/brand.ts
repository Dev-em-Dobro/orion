// Configuração da marca — o único lugar pra personalizar os textos gerados
// pela IA (Abordagem e Ideias de Vídeo) com a sua empresa e a sua oferta.
//
// Rodar a ferramenta NÃO exige mudar nada aqui: os valores abaixo são padrões
// genéricos que já funcionam. Edite quando quiser que as mensagens saiam com a
// sua marca. O mínimo pra usar o sistema é preencher as chaves de API no `.env`.
//
// Tipo puro, sem dependência de Next — pode ser importado por lib e por UI.

export const BRAND = {
  /** Nome da sua empresa, como aparece nas mensagens. */
  empresa: "nossa empresa",

  /**
   * O que você faz — a frase que sustenta a oferta nas mensagens.
   * Começa com verbo; completa a frase "A {empresa} ...".
   */
  descricaoEmpresa:
    "cria soluções sob medida pra captar, atender e organizar os clientes de um negócio, sem depender de trabalho manual",

  /** A oferta de entrada, de baixo atrito, que a mensagem propõe. */
  ofertaDeEntrada: "um diagnóstico gratuito, rápido e sem compromisso",

  /**
   * O que a sua empresa resolve, em poucas palavras — usado como a "ponte"
   * entre o problema detectado no Lead e a sua oferta.
   */
  propostaDeValor: "captar e atender clientes sem trabalho manual",

  /** Onde o conteúdo (Ideias de Vídeo) é publicado. */
  canalConteudo: "YouTube",

  /** Público-alvo do conteúdo. */
  publicoConteudo:
    "donos de negócio que querem atrair e atender mais clientes, mas acham que tecnologia é complicada ou cara",
} as const;
