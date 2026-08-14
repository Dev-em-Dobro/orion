// F029 — ferramentas do Agente Orion. Todas **read-only** e escopadas por
// sessão. Spec: /specs/02-features/F029-agente-orion.md · ADR-014
//
// A regra que faz o isolamento não depender do modelo: `user_id` NUNCA é
// parâmetro de ferramenta. Ele vem da sessão, no servidor, e é injetado no
// handler — então não existe campo pelo qual pedir dado de outro aluno.

import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dorPrincipal } from "@/lib/dores/principal";
import { ESTAGIOS_FUNIL, ONDE_NAO_DESCARTADO, taxasDeConversao } from "@/lib/funil";
import { limiteDaJanela, whereFilaFollowUp } from "@/lib/followup";
import {
  calcularScore,
  necessidade as calcularNecessidade,
  valor as calcularValor,
} from "@/lib/score/score";
import { tarefasDoUsuario } from "@/lib/tarefas/consultar";
import { EXPLICACAO, TITULO } from "@/lib/tarefas/regras";
import type { LeadStatus } from "@prisma/client";

/** Teto de registros por chamada — resposta gigante estoura contexto e custo. */
export const LIMITE_REGISTROS = 25;
/** Teto de chamadas de ferramenta por mensagem (ADR-014). */
export const MAX_PASSOS = 6;

const STATUS = ESTAGIOS_FUNIL as [LeadStatus, ...LeadStatus[]];

export function ferramentasDoAgente(userId: string) {
  const whereUser = { user_id: userId };

  return {
    listar_leads: tool({
      description:
        "Lista os Leads do usuário com filtros. Use para responder 'quais leads...', " +
        "'quantos leads...', 'me mostra os leads que...'. Devolve no máximo 25.",
      inputSchema: z.object({
        status: z.enum(STATUS).optional().describe("Estágio do funil"),
        categoria: z.string().optional().describe("Categoria do Places"),
        score_min: z.number().min(0).max(100).optional(),
        tem_site: z.boolean().optional(),
        sem_atendimento_automatizado: z
          .boolean()
          .optional()
          .describe("Só Leads sem sinal de atendimento automatizado no site"),
        limite: z.number().min(1).max(LIMITE_REGISTROS).optional(),
      }),
      execute: async (args) => {
        const leads = await prisma.lead.findMany({
          where: {
            ...whereUser,
            ...ONDE_NAO_DESCARTADO,
            ...(args.status ? { status: args.status } : {}),
            ...(args.categoria ? { categoria: args.categoria } : {}),
            ...(args.score_min !== undefined
              ? { score: { gte: args.score_min } }
              : {}),
            ...(args.tem_site === false
              ? { OR: [{ website: null }, { website: "" }] }
              : args.tem_site === true
                ? { AND: [{ website: { not: null } }, { NOT: { website: "" } }] }
                : {}),
            ...(args.sem_atendimento_automatizado
              ? {
                  dores: {
                    some: { tipo: "SEM_ATENDIMENTO_AUTOMATIZADO" as const },
                  },
                }
              : {}),
          },
          orderBy: [{ score: "desc" }, { created_at: "desc" }],
          take: Math.min(args.limite ?? LIMITE_REGISTROS, LIMITE_REGISTROS),
          select: {
            id: true,
            nome: true,
            categoria: true,
            status: true,
            score: true,
            score_estimado: true,
            telefone: true,
            website: true,
            dores: { select: { severidade: true, detalhes: true } },
          },
        });

        return {
          total: leads.length,
          leads: leads.map((l) => ({
            id: l.id,
            nome: l.nome,
            categoria: l.categoria,
            status: l.status,
            score: l.score,
            score_estimado: l.score_estimado,
            tem_telefone: Boolean(l.telefone),
            tem_site: Boolean(l.website),
            dor_principal: dorPrincipal(l.dores)?.detalhes ?? null,
          })),
        };
      },
    }),

    detalhar_lead: tool({
      description:
        "Detalhes de UM Lead: diagnóstico, dores e histórico de abordagem. " +
        "Aceita o id ou parte do nome.",
      inputSchema: z.object({
        lead_id: z.string().optional(),
        nome: z.string().optional().describe("Parte do nome do negócio"),
      }),
      execute: async (args) => {
        if (!args.lead_id && !args.nome) {
          return { erro: "Informe lead_id ou nome." };
        }
        const lead = await prisma.lead.findFirst({
          where: {
            ...whereUser,
            ...(args.lead_id ? { id: args.lead_id } : {}),
            ...(args.nome
              ? { nome: { contains: args.nome, mode: "insensitive" as const } }
              : {}),
          },
          include: {
            diagnosticos: { orderBy: { executado_em: "desc" }, take: 1 },
            dores: true,
            abordagens: {
              // Sem o texto: o agente não precisa reproduzir a mensagem.
              select: { canal: true, enviado: true, enviado_em: true },
              orderBy: { gerado_em: "desc" },
              take: 5,
            },
          },
        });
        if (!lead) return { erro: "Lead não encontrado." };

        const diag = lead.diagnosticos[0];
        return {
          id: lead.id,
          nome: lead.nome,
          categoria: lead.categoria,
          endereco: lead.endereco,
          status: lead.status,
          score: lead.score,
          score_estimado: lead.score_estimado,
          telefone: lead.telefone,
          website: lead.website,
          email: lead.email,
          avaliacoes: lead.num_avaliacoes,
          nota: lead.nota,
          diagnostico: diag
            ? {
                tem_site: diag.tem_site,
                site_e_agregador: diag.site_e_agregador,
                tem_https: diag.tem_https,
                performance_mobile: diag.performance_mobile,
                atendimento_automatizado: diag.atendimento_automatizado,
                atendimento_evidencia: diag.atendimento_evidencia,
                executado_em: diag.executado_em,
              }
            : null,
          dores: lead.dores.map((d) => ({
            tipo: d.tipo,
            severidade: d.severidade,
            detalhes: d.detalhes,
          })),
          abordagens: lead.abordagens,
        };
      },
    }),

    explicar_score: tool({
      description:
        "Decompõe o score de um Lead: Valor (tier do nicho + porte) e " +
        "Necessidade (o que o diagnóstico achou). Use para 'por que o score é X'.",
      inputSchema: z.object({ lead_id: z.string() }),
      execute: async ({ lead_id }) => {
        const lead = await prisma.lead.findFirst({
          where: { ...whereUser, id: lead_id },
          include: {
            diagnosticos: { orderBy: { executado_em: "desc" }, take: 1 },
          },
        });
        if (!lead) return { erro: "Lead não encontrado." };

        const { valor, tier } = calcularValor({
          categoria: lead.categoria,
          num_avaliacoes: lead.num_avaliacoes,
        });
        const diag = lead.diagnosticos[0];
        if (!diag) {
          return {
            nome: lead.nome,
            score: lead.score,
            score_estimado: true,
            valor,
            tier,
            num_avaliacoes: lead.num_avaliacoes,
            observacao:
              "Score ainda estimado (Triagem): sem Diagnóstico, a Necessidade é aproximada pela URL do site.",
          };
        }

        const necessidade = calcularNecessidade({
          tem_site: diag.tem_site,
          site_e_agregador: diag.site_e_agregador,
          tem_https: diag.tem_https,
          performance_mobile: diag.performance_mobile,
          tempo_carregamento_ms: diag.tempo_carregamento_ms,
        });

        return {
          nome: lead.nome,
          score: calcularScore({ valor, necessidade }),
          score_gravado: lead.score,
          score_estimado: lead.score_estimado,
          valor,
          tier,
          num_avaliacoes: lead.num_avaliacoes,
          necessidade,
          formula: "score = round(0.55 x Valor + 0.45 x Necessidade)",
        };
      },
    }),

    resumo_do_funil: tool({
      description:
        "Contagem de Leads por estágio e as taxas de conversão do funil de venda.",
      inputSchema: z.object({}),
      execute: async () => {
        const grupos = await prisma.lead.groupBy({
          by: ["status"],
          where: { ...whereUser, ...ONDE_NAO_DESCARTADO },
          _count: { _all: true },
        });

        const porStatus = Object.fromEntries(
          ESTAGIOS_FUNIL.map((s) => [
            s,
            grupos.find((g) => g.status === s)?._count._all ?? 0,
          ]),
        ) as Record<LeadStatus, number>;

        return {
          por_status: porStatus,
          total: Object.values(porStatus).reduce((s, n) => s + n, 0),
          conversao: taxasDeConversao(porStatus).map((p) => ({
            de: p.de,
            para: p.para,
            taxa: p.taxa === null ? null : Math.round(p.taxa * 100),
          })),
        };
      },
    }),

    fila_do_dia: tool({
      description:
        "Os melhores Leads acionáveis agora: diagnosticados, priorizados e " +
        "ainda não abordados. Responde 'quem eu abordo hoje'.",
      inputSchema: z.object({}),
      execute: async () => {
        const leads = await prisma.lead.findMany({
          where: {
            ...whereUser,
            status: { in: ["priorizado", "enriquecido"] },
            score_estimado: false,
            abordagens: { none: { enviado: true } },
          },
          orderBy: [{ score: "desc" }, { status_em: "asc" }],
          take: 10,
          select: {
            id: true,
            nome: true,
            categoria: true,
            score: true,
            telefone: true,
            dores: { select: { severidade: true, detalhes: true } },
          },
        });

        return {
          total: leads.length,
          fila: leads.map((l) => ({
            id: l.id,
            nome: l.nome,
            categoria: l.categoria,
            score: l.score,
            tem_telefone: Boolean(l.telefone),
            dor_principal: dorPrincipal(l.dores)?.detalhes ?? null,
          })),
        };
      },
    }),

    tarefas_pendentes: tool({
      description:
        "O que está parado e o Orion está cobrando: follow-up atrasado, " +
        "desfecho não registrado, proposta sem decisão.",
      inputSchema: z.object({}),
      execute: async () => {
        const tarefas = await tarefasDoUsuario(userId);
        return {
          total: tarefas.length,
          tarefas: tarefas.slice(0, LIMITE_REGISTROS).map((t) => ({
            tipo: t.tipo,
            titulo: TITULO[t.tipo],
            motivo: EXPLICACAO[t.tipo],
            lead_id: t.leadId,
            lead: t.leadNome,
            faixa: t.faixa,
          })),
        };
      },
    }),

    follow_up_pendente: tool({
      description:
        "Leads abordados que passaram da janela de follow-up sem resposta.",
      inputSchema: z.object({}),
      execute: async () => {
        const leads = await prisma.lead.findMany({
          where: { ...whereUser, ...whereFilaFollowUp(limiteDaJanela()) },
          orderBy: { score: "desc" },
          take: LIMITE_REGISTROS,
          select: { id: true, nome: true, score: true, status_em: true },
        });
        return { total: leads.length, leads };
      },
    }),
  };
}
