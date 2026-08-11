// F035 — competência mensal do medidor, no fuso America/Sao_Paulo.
//
// Puro e com relógio injetado: o AC8 ("virada de mês zera") tem que ser
// testável sem esperar setembro. E o fuso importa — às 22h de 31/08 em São
// Paulo já é 01/09 em UTC, e o aluno perderia o mês inteiro de crédito.

const FUSO = "America/Sao_Paulo";

const fmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "2026-08" para a data dada, no fuso de São Paulo. */
export function competenciaDe(agora: Date): string {
  // en-CA formata como AAAA-MM-DD, então o corte é posicional e estável.
  return fmt.format(agora).slice(0, 7);
}

/** Rótulo humano: "agosto de 2026". */
export function rotuloCompetencia(competencia: string): string {
  const [ano, mes] = competencia.split("-").map(Number);
  if (!ano || !mes) return competencia;
  const nome = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(ano, mes - 1, 1)));
  return `${nome} de ${ano}`;
}
