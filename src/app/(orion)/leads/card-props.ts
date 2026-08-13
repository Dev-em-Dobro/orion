// F032/F025 — monta as props do card a partir do Lead do banco.
// A lista e a Fila do dia usam o MESMO card, então o mapeamento mora aqui em
// vez de ser copiado nas duas páginas.

import type { Prisma } from "@prisma/client";
import { classificarWebsite } from "@/lib/diagnostico/agregador";
import { dorPrincipal } from "@/lib/dores/principal";
import { rotuloCategoria } from "@/lib/nichos/catalogo";
import { valor as calcularValor } from "@/lib/score/score";
import { linkWhatsapp } from "@/lib/abordagem/whatsappLink";
import type { LeadCardProps } from "./lead-card";

/** Include mínimo que o card precisa. Use nas duas queries. */
export const INCLUDE_CARD = {
  diagnosticos: { orderBy: { executado_em: "desc" }, take: 1 },
  dores: { select: { tipo: true, severidade: true, detalhes: true } },
  abordagens: { orderBy: { gerado_em: "desc" }, take: 1 },
  _count: { select: { abordagens: true } },
} satisfies Prisma.LeadInclude;

export type LeadComCard = Prisma.LeadGetPayload<{
  include: typeof INCLUDE_CARD;
}>;

export function paraCardProps(lead: LeadComCard, href: string): LeadCardProps {
  const classif = lead.website ? classificarWebsite(lead.website) : null;
  const { tier } = calcularValor({
    categoria: lead.categoria,
    num_avaliacoes: lead.num_avaliacoes,
  });
  const ultimaAbordagem = lead.abordagens[0];
  const dor = dorPrincipal(lead.dores);

  return {
    id: lead.id,
    nome: lead.nome,
    // Traduzido aqui, no servidor: mandar o catálogo inteiro de nichos pro
    // bundle só pra rotular uma linha do card não se paga.
    categoria: rotuloCategoria(lead.categoria),
    endereco: lead.endereco,
    telefone: lead.telefone,
    website: lead.website,
    nota: lead.nota,
    numAvaliacoes: lead.num_avaliacoes,
    status: lead.status,
    score: lead.score,
    scoreEstimado: lead.score_estimado,
    tier,
    ehAgregador: classif?.ehAgregador ?? false,
    agregadorTipo: classif?.ehAgregador ? classif.tipo : null,
    temDiagnostico: lead.diagnosticos.length > 0,
    dorPrincipal: dor?.detalhes ?? null,
    temAbordagem: lead._count.abordagens > 0,
    semAtendimento: lead.dores.some(
      (d) => d.tipo === "SEM_ATENDIMENTO_AUTOMATIZADO",
    ),
    abordagemEnviada: ultimaAbordagem?.enviado ?? false,
    waLink: ultimaAbordagem
      ? linkWhatsapp(lead.telefone, ultimaAbordagem.conteudo)
      : null,
    motivoDescarte: lead.motivo_descarte,
    href,
  };
}
