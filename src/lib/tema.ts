// Tema da interface — nasceu como piloto da `/leads` em 2026-08-13 e virou
// preferência do app inteiro no mesmo dia.
//
// Quem aplica é o **shell** (`AppShell` → `AppShellClient`), numa classe só na
// coluna de conteúdo. Enquanto cada página carregava a classe no próprio
// `<main>`, três coisas ficavam de fora e não tinham como entrar:
//
// - as telas que ninguém tinha convertido ainda (funil, agente, planos…);
// - o `loading.tsx` de cada rota, que é irmão da página e não descendente dela
//   — o esqueleto pintava escuro e a página chegava clara, um flash a cada
//   clique no menu;
// - o `BannerChaves`, que mora **acima** do `<main>`.
//
// A sidebar continua escura de propósito: a referência do tema claro é sidebar
// escura + fundo claro + cards brancos.
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

/**
 * A mesma classe, a partir de um `document.cookie` — pro cliente.
 *
 * Quem pinta o tema é o shell, e só na **coluna de conteúdo**: a sidebar é
 * escura de propósito. Overlay que cobre a tela inteira não pertence a nenhuma
 * das duas, e sai com a cor do canto de onde foi aberto se não perguntar — o
 * mesmo diálogo escuro pelo gatilho da sidebar e claro pelo do Dashboard.
 * Então ele lê o cookie, que é a mesma fonte que o servidor leu.
 *
 * Pura, e recebe a string em vez de ler `document`: dá pra testar, e não
 * impede o módulo de ser importado no servidor. Chamada apenas de dentro de
 * handler ou efeito de cliente — nunca no render.
 */
export function classeDoTemaDoCookie(cookie: string): string {
  const valor = cookie
    .split("; ")
    .find((c) => c.startsWith(`${TEMA_COOKIE}=`))
    ?.split("=")[1];
  return classeDoTema(asTema(valor));
}
