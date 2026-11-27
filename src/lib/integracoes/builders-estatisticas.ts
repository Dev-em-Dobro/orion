// F044 — estatísticas de prospecção (só contagens) para o Builders Club.
// Spec: /specs/02-features/F044-estatisticas-builders.md
// Domínio puro: sem Prisma nem Next. A consulta fica em `./builders-repositorio`.

import { timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const MAX_EMAILS = 500;
export const MAX_DIAS_JANELA = 120;
export const ESTAGIOS_FUNIL = ["respondeu", "qualificado", "proposta", "ganho"] as const;

type EstagioFunil = (typeof ESTAGIOS_FUNIL)[number];
export type Funil = Record<EstagioFunil, number>;
export type Dia = { data: string; abordagens: number; retornos: number };
export type Resultado = { email: string; encontrado: boolean; dias: Dia[]; funil: Funil };

const DIA_MS = 86_400_000;
const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((valor) => {
  const parsed = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === valor;
});

export const corpoSchema = z.object({
  emails: z.array(z.string().trim().toLowerCase().email().max(320)).min(1).max(MAX_EMAILS),
  desde: data,
  ate: data,
}).refine(({ desde, ate }) => desde <= ate, { message: "desde deve ser ≤ ate" })
  .refine(({ desde, ate }) => (Date.parse(ate) - Date.parse(desde)) / DIA_MS < MAX_DIAS_JANELA, {
    message: `janela de no máximo ${MAX_DIAS_JANELA} dias`,
  })
  .transform((corpo) => ({ ...corpo, emails: [...new Set(corpo.emails)] }));

export type Corpo = z.infer<typeof corpoSchema>;

/** `Authorization: Bearer <segredo>` comparado em tempo constante. */
export function autorizado(header: string | null, segredo: string): boolean {
  const recebido = header?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!recebido) return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(segredo);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Lead conta no estágio atual e em todos os anteriores do caminho de venda. */
export function funilDoStatus(contagens: { status: string; total: number }[]): Funil {
  const funil: Funil = { respondeu: 0, qualificado: 0, proposta: 0, ganho: 0 };
  for (const { status, total } of contagens) {
    const nivel = ESTAGIOS_FUNIL.indexOf(status as EstagioFunil);
    for (let i = 0; i <= nivel; i++) funil[ESTAGIOS_FUNIL[i]!] += total;
  }
  return funil;
}

/**
 * Monta um resultado por e-mail pedido. `usuarios` mapeia e-mail (minúsculo)
 * → user_id; `dias` e `funil` já vêm agregados por user_id.
 */
export function montarResultados(
  emails: string[],
  usuarios: Map<string, string>,
  dias: (Dia & { userId: string })[],
  funil: { userId: string; status: string; total: number }[],
): Resultado[] {
  return emails.map((email) => {
    const userId = usuarios.get(email);
    if (!userId) return { email, encontrado: false, dias: [], funil: funilDoStatus([]) };
    return {
      email,
      encontrado: true,
      dias: dias
        .filter((dia) => dia.userId === userId)
        .map(({ data: d, abordagens, retornos }) => ({ data: d, abordagens, retornos }))
        .sort((a, b) => a.data.localeCompare(b.data)),
      funil: funilDoStatus(funil.filter((linha) => linha.userId === userId)),
    };
  });
}
