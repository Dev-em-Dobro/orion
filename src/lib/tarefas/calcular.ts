// F031 — a Tarefa é derivada do estado, não uma tabela.
// Spec: /specs/02-features/F031-central-de-tarefas.md
//
// Puro: recebe os Leads relevantes, os adiamentos e o relógio, devolve a lista
// ordenada. Testável com relógio fixo — sem Prisma, sem Next.

import type { LeadStatus, TipoTarefa } from "@prisma/client";
import { faixaDe, PRAZOS, type FaixaUrgencia } from "./regras";

export type AbordagemParaTarefa = {
  enviado: boolean;
  enviado_em: Date | null;
  gerado_em: Date;
};

export type LeadParaTarefa = {
  id: string;
  nome: string;
  status: LeadStatus;
  status_em: Date;
  score: number;
  telefone: string | null;
  /** Mais recentes primeiro (o cálculo usa só as primeiras). */
  abordagens: AbordagemParaTarefa[];
};

export type Adiamento = {
  lead_id: string | null;
  tipo: TipoTarefa;
  marco: Date;
  adiada_ate: Date | null;
  dispensada_em: Date | null;
};

export type Tarefa = {
  tipo: TipoTarefa;
  leadId: string | null;
  leadNome: string | null;
  /** Timestamp do fato que originou a cobrança. */
  marco: Date;
  atrasoMs: number;
  faixa: FaixaUrgencia;
  /** Quantos Leads a cobrança agregada representa. */
  quantidade?: number;
};

export type EntradaTarefas = {
  leads: LeadParaTarefa[];
  /** Leads com score estimado alto esperando diagnóstico (F025). */
  aguardandoAprofundamento: number;
  adiamentos: Adiamento[];
};

/** Status que saem do jogo: não geram cobrança de tipo nenhum. */
const FORA = new Set<LeadStatus>([
  "descartado",
  "ganho",
  "perdido",
  "novo",
  "enriquecido",
  "qualificado",
]);

function ultimoEnvio(abordagens: AbordagemParaTarefa[]): Date | null {
  let maior: Date | null = null;
  for (const o of abordagens) {
    if (!o.enviado || !o.enviado_em) continue;
    if (!maior || o.enviado_em > maior) maior = o.enviado_em;
  }
  return maior;
}

function ultimaGeracaoNaoEnviada(
  abordagens: AbordagemParaTarefa[],
): Date | null {
  let maior: Date | null = null;
  for (const o of abordagens) {
    if (o.enviado) continue;
    if (!maior || o.gerado_em > maior) maior = o.gerado_em;
  }
  return maior;
}

/**
 * Candidata de um Lead. **No máximo uma por Lead**: `CONFIRMAR_RESPOSTA` e
 * `MANDAR_FOLLOWUP` são excludentes — passados 3 dias, a de 12h dá lugar à de
 * follow-up, em vez de empilhar duas cobranças do mesmo Lead.
 */
function tarefaDoLead(lead: LeadParaTarefa, agora: number): Tarefa | null {
  if (FORA.has(lead.status)) return null;

  const criar = (tipo: TipoTarefa, marco: Date): Tarefa => {
    const atrasoMs = agora - marco.getTime() - PRAZOS[tipo];
    return {
      tipo,
      leadId: lead.id,
      leadNome: lead.nome,
      marco,
      atrasoMs,
      faixa: faixaDe(atrasoMs, PRAZOS[tipo]),
    };
  };

  if (lead.status === "contatado") {
    const envio = ultimoEnvio(lead.abordagens);
    if (!envio) return null;
    const desde = agora - envio.getTime();
    if (desde >= PRAZOS.MANDAR_FOLLOWUP) return criar("MANDAR_FOLLOWUP", envio);
    if (desde >= PRAZOS.CONFIRMAR_RESPOSTA)
      return criar("CONFIRMAR_RESPOSTA", envio);
    return null;
  }

  if (lead.status === "priorizado") {
    const gerada = ultimaGeracaoNaoEnviada(lead.abordagens);
    if (!gerada) return null;
    return agora - gerada.getTime() >= PRAZOS.ENVIAR_ABORDAGEM
      ? criar("ENVIAR_ABORDAGEM", gerada)
      : null;
  }

  if (lead.status === "respondeu") {
    return agora - lead.status_em.getTime() >= PRAZOS.AVANCAR_RESPONDEU
      ? criar("AVANCAR_RESPONDEU", lead.status_em)
      : null;
  }

  if (lead.status === "proposta") {
    return agora - lead.status_em.getTime() >= PRAZOS.COBRAR_PROPOSTA
      ? criar("COBRAR_PROPOSTA", lead.status_em)
      : null;
  }

  return null;
}

/**
 * Adiada ou dispensada?
 *
 * Dispensar some com a cobrança **enquanto o fato não mudar**: o adiamento
 * guarda o `marco`, e um marco novo (nova Abordagem enviada, status alterado)
 * traz a Tarefa de volta. Sem isso, dispensar viraria silêncio permanente.
 */
function silenciada(tarefa: Tarefa, adiamentos: Adiamento[], agora: number) {
  const a = adiamentos.find(
    (x) => x.tipo === tarefa.tipo && x.lead_id === tarefa.leadId,
  );
  if (!a) return false;
  if (a.marco.getTime() !== tarefa.marco.getTime()) return false;
  if (a.dispensada_em) return true;
  return a.adiada_ate ? a.adiada_ate.getTime() > agora : false;
}

/** Tarefas do aluno, das mais atrasadas para as menos. */
export function calcularTarefas(
  entrada: EntradaTarefas,
  agora: number = Date.now(),
): Tarefa[] {
  const tarefas: Tarefa[] = [];

  for (const lead of entrada.leads) {
    const t = tarefaDoLead(lead, agora);
    if (t && !silenciada(t, entrada.adiamentos, agora)) tarefas.push(t);
  }

  // Agregada: uma só, não uma por Lead. O marco é o próprio "agora" arredondado
  // pro dia, pra que dispensar valha o dia e volte no dia seguinte.
  if (entrada.aguardandoAprofundamento > 0) {
    const marco = new Date(new Date(agora).toISOString().slice(0, 10));
    const t: Tarefa = {
      tipo: "APROFUNDAR_FILA",
      leadId: null,
      leadNome: null,
      marco,
      atrasoMs: 0,
      faixa: "hoje",
      quantidade: entrada.aguardandoAprofundamento,
    };
    if (!silenciada(t, entrada.adiamentos, agora)) tarefas.push(t);
  }

  return tarefas.sort((a, b) => b.atrasoMs - a.atrasoMs);
}
