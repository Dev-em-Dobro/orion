// De onde o aluno veio antes de abrir o detalhe do Lead.
//
// O detalhe sempre voltava pra `/leads`, mesmo quando quem abriu foi o kanban.
// Quem estava arrastando cards no funil clicava num Lead, voltava e caía numa
// tela diferente da que tinha deixado — perdia o lugar e a rolagem.
//
// Viaja na URL (`?de=funil`) e não em estado de cliente: o link do card é um
// `<Link>` de servidor, e a volta precisa sobreviver a recarregar a página e a
// abrir em aba nova.
//
// Puro, sem dependência de Next: importável por página, componente e teste.

export const ORIGENS = ["leads", "funil", "tarefas", "home"] as const;

export type Origem = (typeof ORIGENS)[number];

/** Para onde a seta "voltar" leva, e como ela se chama. */
const DESTINO: Record<Origem, { href: string; rotulo: string }> = {
  leads: { href: "/leads", rotulo: "Leads" },
  funil: { href: "/funil", rotulo: "Funil" },
  tarefas: { href: "/tarefas", rotulo: "Tarefas" },
  home: { href: "/", rotulo: "Dashboard" },
};

export function asOrigem(raw: string | undefined | null): Origem | null {
  return ORIGENS.includes(raw as Origem) ? (raw as Origem) : null;
}

/**
 * Destino do "voltar".
 *
 * `queryDaLista` só se aplica quando a origem é a própria lista: é lá que os
 * filtros vivem. Voltar pro funil carregando `?categoria=dentista` não faria
 * nada — o kanban não filtra por isso — e sujaria a URL.
 */
export function destinoDeVolta(
  origem: Origem | null,
  queryDaLista: string,
): { href: string; rotulo: string } {
  const alvo = DESTINO[origem ?? "leads"];
  if ((origem ?? "leads") !== "leads") return alvo;
  return {
    href: queryDaLista ? `${alvo.href}?${queryDaLista}` : alvo.href,
    rotulo: alvo.rotulo,
  };
}

/** Sufixo `?de=<origem>` pra pendurar no link do detalhe. */
export function paramOrigem(origem: Origem): string {
  return `de=${origem}`;
}
