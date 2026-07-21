// F014 — erros de autenticação tratados de forma amigável nas Server Actions.

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}
