"use server";

// F012 — Gerador de Proposta. O aluno fecha o preço; a IA escreve a prosa.
// Spec: /specs/02-features/F012-gerador-de-proposta.md
//
// Emenda de precificação (2026-08-16): a seleção chega PRONTA do cliente —
// serviços marcados e valores digitados. Aqui não se calcula preço, só se
// valida e se gera o texto. NÃO muda status nem persiste: a promoção a
// `proposta` é o botão "Proposta" existente (registrarDesfecho, F006/F010).
//
// Nada de export que não seja função async: arquivo "use server" só exporta
// função, e uma constante exportada aqui derruba o módulo inteiro em runtime
// — sem o build nem o typecheck acusarem. Já aconteceu uma vez.

import { mensagemEscopo, requireTenant } from "@/lib/db/scoped";
import { detectarDores } from "@/lib/dores";
import { CATALOGO, type ItemId } from "@/lib/proposta/catalogo";
import {
  itensOrdenados,
  validar,
  type Selecao,
} from "@/lib/proposta/selecao";
import { formatarPropostaTexto } from "@/lib/proposta/formatar";
import {
  gerarProposta as gerarPropostaLib,
  type PropostaTexto,
} from "@/lib/proposta/gerarProposta";
import { prisma } from "@/lib/db";
import { z } from "zod";

const IDS = CATALOGO.map((i) => i.id) as [ItemId, ...ItemId[]];

const selecaoSchema = z.object({
  itens: z.array(z.enum(IDS)),
  // Teto de R$ 1 milhão: não é regra de negócio, é freio contra dedo escorregado
  // no teclado virando um PDF com sete dígitos na frente do cliente.
  valor: z.number().int().min(0).max(1_000_000),
  mensal: z.number().int().min(0).max(1_000_000),
  // Texto curto: é uma frase de prazo, não um campo de observação disfarçado.
  prazo: z.string().trim().min(1).max(80),
});

const schema = z.object({
  lead_id: z.string().cuid("lead_id inválido"),
  selecao: selecaoSchema,
});

export type GerarPropostaState =
  | { kind: "idle" }
  | {
      kind: "ok";
      proposta: PropostaTexto;
      selecao: Selecao;
      textoCopiavel: string;
    }
  | { kind: "erro"; mensagem: string };

export async function gerarPropostaAction(
  _prev: GerarPropostaState,
  formData: FormData,
): Promise<GerarPropostaState> {
  let selecaoCrua: unknown;
  try {
    selecaoCrua = JSON.parse(String(formData.get("selecao") ?? ""));
  } catch {
    return { kind: "erro", mensagem: "Input inválido" };
  }

  const parsed = schema.safeParse({
    lead_id: formData.get("lead_id"),
    selecao: selecaoCrua,
  });
  if (!parsed.success) {
    return { kind: "erro", mensagem: "Input inválido" };
  }

  // Validação de domínio ANTES do gate de plano e da chamada de IA: proposta
  // sem valor é erro do aluno, e errar de graça é parte do desenho.
  const selecao = parsed.data.selecao as Selecao;
  const problemas = validar(selecao);
  if (problemas.length > 0) {
    return { kind: "erro", mensagem: problemas[0]! };
  }

  try {
    const { userId } = await requireTenant();
    // A Proposta não tem limite nenhum desde 2026-08-16: nem cota diária
    // (F018), nem teto de plano (F035). Custa R$0 porque é montada em código, e
    // limitar a última etapa antes do `ganho` é limitar a capacidade de fechar
    // — o teto do produto mora na entrada, em `lead_novo`.
    const lead = await prisma.lead.findFirst({
      where: { id: parsed.data.lead_id, user_id: userId },
      include: {
        diagnosticos: { orderBy: { executado_em: "desc" }, take: 1 },
        dores: true,
      },
    });
    if (!lead) {
      return { kind: "erro", mensagem: "Lead não encontrado" };
    }

    const diag = lead.diagnosticos[0];
    if (!diag) {
      return {
        kind: "erro",
        mensagem: "Diagnostique o Lead antes de gerar a Proposta",
      };
    }

    // Dores estruturadas, não os textos: o montador escolhe a abertura do
    // resumo pelo `tipo` da Dor de maior severidade.
    const dores =
      lead.dores.length > 0 ? lead.dores : detectarDores(diag, lead.website);

    const itens = itensOrdenados(selecao);

    const proposta: PropostaTexto = gerarPropostaLib({
      nome: lead.nome,
      categoria: lead.categoria,
      dores,
      itens,
    });

    return {
      kind: "ok",
      proposta,
      selecao,
      textoCopiavel: formatarPropostaTexto(proposta, selecao),
    };
  } catch (e) {
    const escopo = mensagemEscopo(e);
    if (escopo) return { kind: "erro", mensagem: escopo };
    throw e;
  }
}
