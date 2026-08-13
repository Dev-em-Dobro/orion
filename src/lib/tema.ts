// Tema da interface — piloto de 2026-08-13, aplicado só na `/leads`.
//
// Guardado em **cookie**, não em `localStorage` nem no banco:
//
// - `localStorage` só existe depois que o JS roda. Como as páginas do Orion são
//   Server Components, o HTML sairia no tema errado e corrigiria no cliente —
//   o flash branco/preto clássico.
// - Coluna no `User` resolveria, mas custa migração e uma consulta por request
//   pra uma preferência que não é dado de domínio.
//
// Cookie é lido no servidor durante o render, então o HTML já sai certo.
// Sem lib nova → sem ADR.
//
// Tipo puro, sem dependência de Next: importável por lib, action e UI.

export const TEMAS = ["escuro", "claro"] as const;

export type Tema = (typeof TEMAS)[number];

/** O tema do app até aqui — o sistema visual da F032 foi desenhado pra ele. */
export const TEMA_PADRAO: Tema = "escuro";

export const TEMA_COOKIE = "orion_tema";

/** Um ano: preferência de interface não deve expirar sozinha. */
export const TEMA_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const LABEL_TEMA: Record<Tema, string> = {
  escuro: "Escuro",
  claro: "Claro",
};

export function asTema(raw: string | undefined | null): Tema {
  return TEMAS.includes(raw as Tema) ? (raw as Tema) : TEMA_PADRAO;
}

/**
 * Classe que liga o tema claro numa subárvore. Vazia no escuro, que é o padrão
 * do `:root` — o tema claro é o que precisa de escopo, não o contrário.
 */
export function classeDoTema(tema: Tema): string {
  return tema === "claro" ? "tema-claro" : "";
}
