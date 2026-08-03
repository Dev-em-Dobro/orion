// F019.1 — erros de verificação de compra.

export class CompraRequiredError extends Error {
  constructor(
    message = "Ative seu acesso informando o e-mail da compra na Hubla.",
  ) {
    super(message);
    this.name = "CompraRequiredError";
  }
}

export class CompraNaoEncontradaError extends Error {
  constructor(
    message = "Não encontramos uma compra ativa do Builders Club com esse e-mail.",
  ) {
    super(message);
    this.name = "CompraNaoEncontradaError";
  }
}

export class CompraJaVinculadaError extends Error {
  constructor(
    message = "Esse e-mail de compra já está vinculado a outra conta.",
  ) {
    super(message);
    this.name = "CompraJaVinculadaError";
  }
}
