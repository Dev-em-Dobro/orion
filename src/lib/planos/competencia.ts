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

/**
 * Início e fim (exclusivo) da competência, em instantes UTC.
 *
 * O Brasil não tem horário de verão desde 2019, então o offset de São Paulo é
 * fixo em -03:00 e dá pra construir a fronteira direto. Se o DST voltar, isto
 * é o que precisa mudar — por isso está isolado numa função.
 */
export function intervaloDaCompetencia(competencia: string): {
  inicio: Date;
  fim: Date;
} {
  const [anoBruto, mesBruto] = competencia.split("-").map(Number);
  const ano = Number.isFinite(anoBruto) ? (anoBruto as number) : 1970;
  const mes =
    Number.isFinite(mesBruto) && (mesBruto as number) >= 1 && (mesBruto as number) <= 12
      ? (mesBruto as number)
      : 1;
  const inicio = new Date(
    `${String(ano).padStart(4, "0")}-${String(mes).padStart(2, "0")}-01T00:00:00-03:00`,
  );
  const proximoMes = mes === 12 ? 1 : mes + 1;
  const proximoAno = mes === 12 ? ano + 1 : ano;
  const fim = new Date(
    `${String(proximoAno).padStart(4, "0")}-${String(proximoMes).padStart(2, "0")}-01T00:00:00-03:00`,
  );
  return { inicio, fim };
}
