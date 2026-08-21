// F013 — schemas Zod da entrada do Simulador.
// Spec: /specs/02-features/F013-simulador-de-venda.md (emenda de 2026-08-14)
//
// O que **não** está aqui é o ponto: não existe mais campo `dores`, e
// `categoria` não é mais aceita junto de um Lead. O cenário é derivado no
// servidor (`cenario.ts`); o client escolhe *qual*, não *o quê*.

import { z } from "zod";
import { MAX_CATEGORIA } from "./constantes";

export const dificuldadeSchema = z.enum(["facil", "medio", "dificil"]);

/** O que o client pode pedir: um Lead dele, ou uma categoria digitada. */
export const pedidoCenarioSchema = z.discriminatedUnion("origem", [
  z.object({
    origem: z.literal("lead"),
    lead_id: z.string().min(1).max(64),
    dificuldade: dificuldadeSchema,
  }),
  z.object({
    origem: z.literal("manual"),
    // O teto aqui é folga pro saneamento cortar; quem decide o tamanho final
    // é `sanitizarCategoria`.
    categoria: z.string().trim().min(2).max(MAX_CATEGORIA * 2),
    dificuldade: dificuldadeSchema,
  }),
]);

export const turnoSchema = z.object({
  papel: z.enum(["aluno", "dono"]),
  texto: z.string().min(1).max(2000),
  /** Só as falas do `dono` têm — e sem ela a fala é recusada. */
  assinatura: z.string().max(200).optional(),
});

export const entradaSchema = z.object({
  cenario: pedidoCenarioSchema,
  historico: z.array(turnoSchema).min(1).max(60),
});

export type PedidoCenario = z.infer<typeof pedidoCenarioSchema>;
