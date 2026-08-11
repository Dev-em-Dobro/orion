/**
 * Seed de desenvolvimento — popula uma conta local com Leads em todos os
 * estados, pra dar pra ver a fila, o funil, as cobranças e os cards sem
 * precisar de chave do Google nem da OpenAI.
 *
 *   npx tsx scripts/seed-dev.mts seu@email.com
 *
 * Roda quantas vezes quiser: apaga os Leads de demonstração (place_id
 * começando com "demo-") antes de recriar.
 *
 * NUNCA rodar contra o banco de produção — ele cria usuário e marca compra.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const HORA = 3_600_000;
const DIA = 86_400_000;
const agora = Date.now();
const atras = (ms: number) => new Date(agora - ms);

type Cenario = {
  place: string;
  nome: string;
  categoria: string;
  website: string | null;
  telefone: string | null;
  avaliacoes: number;
  status:
    | "novo"
    | "enriquecido"
    | "priorizado"
    | "contatado"
    | "respondeu"
    | "proposta"
    | "ganho"
    | "perdido"
    | "descartado";
  statusHaMs: number;
  score: number;
  scoreEstimado: boolean;
  /** Diagnóstico + Dores. */
  diagnostico?: {
    temSite: boolean;
    agregador?: boolean;
    https?: boolean | null;
    performance?: number | null;
    atendimento:
      | "detectado"
      | "indicios"
      | "nao_detectado"
      | "nao_avaliado";
    evidencia?: string | null;
  };
  dores?: {
    tipo:
      | "SEM_SITE"
      | "SITE_AGREGADOR"
      | "SITE_LENTO"
      | "SEM_HTTPS"
      | "SEM_ATENDIMENTO_AUTOMATIZADO";
    severidade: "ALTA" | "MEDIA" | "BAIXA";
    detalhes: string;
  }[];
  outreach?: { geradaHaMs: number; enviadaHaMs: number | null };
  email?: string | null;
};

/** Um cenário por tela que o revamp criou. */
const CENARIOS: Cenario[] = [
  {
    place: "demo-1",
    nome: "Odonto Sorriso Batel",
    categoria: "dentist",
    website: null,
    telefone: "(41) 3333-1001",
    avaliacoes: 210,
    status: "priorizado",
    statusHaMs: 2 * HORA,
    score: 96,
    scoreEstimado: false,
    diagnostico: { temSite: false, atendimento: "nao_avaliado" },
    dores: [
      {
        tipo: "SEM_SITE",
        severidade: "ALTA",
        detalhes: "não tem site / presença digital própria",
      },
    ],
  },
  {
    place: "demo-2",
    nome: "Clínica Vida Advocacia",
    categoria: "lawyer",
    website: "http://vidaadvocacia.com.br",
    telefone: "(41) 3333-1002",
    avaliacoes: 95,
    status: "priorizado",
    statusHaMs: 5 * HORA,
    score: 78,
    scoreEstimado: false,
    email: "contato@vidaadvocacia.com.br",
    diagnostico: {
      temSite: true,
      https: false,
      performance: 31,
      atendimento: "nao_detectado",
      evidencia: "nenhum widget de chat encontrado no site",
    },
    dores: [
      {
        tipo: "SITE_LENTO",
        severidade: "MEDIA",
        detalhes: "site muito lento no celular (nota 31/100 no Google PageSpeed)",
      },
      {
        tipo: "SEM_HTTPS",
        severidade: "MEDIA",
        detalhes: "site sem HTTPS (sem cadeado de segurança)",
      },
      {
        tipo: "SEM_ATENDIMENTO_AUTOMATIZADO",
        severidade: "MEDIA",
        detalhes:
          "nenhum sinal de atendimento automatizado no site — o WhatsApp provavelmente é respondido no braço",
      },
    ],
  },
  {
    place: "demo-3",
    nome: "Pet Care Centro",
    categoria: "veterinary_care",
    website: "https://instagram.com/petcarecentro",
    telefone: "(41) 3333-1003",
    avaliacoes: 340,
    status: "priorizado",
    statusHaMs: 30 * HORA,
    score: 88,
    scoreEstimado: false,
    diagnostico: {
      temSite: true,
      agregador: true,
      https: true,
      atendimento: "nao_avaliado",
    },
    dores: [
      {
        tipo: "SITE_AGREGADOR",
        severidade: "ALTA",
        detalhes: "só tem link-in-bio / rede social, sem site próprio",
      },
    ],
    // Gerada e não enviada: vira a cobrança ENVIAR_ABORDAGEM.
    outreach: { geradaHaMs: 26 * HORA, enviadaHaMs: null },
  },
  {
    place: "demo-4",
    nome: "Barbearia do Zé",
    categoria: "barber_shop",
    website: "https://barbeariadoze.com.br",
    telefone: "(41) 3333-1004",
    avaliacoes: 48,
    status: "contatado",
    statusHaMs: 14 * HORA,
    score: 55,
    scoreEstimado: false,
    diagnostico: {
      temSite: true,
      https: true,
      performance: 72,
      atendimento: "detectado",
      evidencia: "widget ManyChat",
    },
    // Enviada há 13h: vira CONFIRMAR_RESPOSTA.
    outreach: { geradaHaMs: 14 * HORA, enviadaHaMs: 13 * HORA },
  },
  {
    place: "demo-5",
    nome: "Estúdio Pilates Mais",
    categoria: "physiotherapist",
    website: null,
    telefone: "(41) 3333-1005",
    avaliacoes: 120,
    status: "contatado",
    statusHaMs: 5 * DIA,
    score: 92,
    scoreEstimado: false,
    diagnostico: { temSite: false, atendimento: "nao_avaliado" },
    dores: [
      {
        tipo: "SEM_SITE",
        severidade: "ALTA",
        detalhes: "não tem site / presença digital própria",
      },
    ],
    // Enviada há 4 dias: vira MANDAR_FOLLOWUP e entra no painel de follow-up.
    outreach: { geradaHaMs: 5 * DIA, enviadaHaMs: 4 * DIA },
  },
  {
    place: "demo-6",
    nome: "Contabilidade Prisma",
    categoria: "accounting",
    website: "https://prismacontabil.com.br",
    telefone: "(41) 3333-1006",
    avaliacoes: 60,
    status: "respondeu",
    statusHaMs: 3 * DIA,
    score: 70,
    scoreEstimado: false,
    diagnostico: {
      temSite: true,
      https: true,
      performance: 45,
      atendimento: "nao_detectado",
      evidencia: "nenhum widget de chat encontrado no site",
    },
    outreach: { geradaHaMs: 6 * DIA, enviadaHaMs: 5 * DIA },
  },
  {
    place: "demo-7",
    nome: "Imobiliária Norte Sul",
    categoria: "real_estate_agency",
    website: "https://norteesul.com.br",
    telefone: "(41) 3333-1007",
    avaliacoes: 180,
    status: "proposta",
    statusHaMs: 4 * DIA,
    score: 84,
    scoreEstimado: false,
    diagnostico: {
      temSite: true,
      https: true,
      performance: 38,
      atendimento: "indicios",
      evidencia: "link wa.me com mensagem pré-preenchida",
    },
    outreach: { geradaHaMs: 9 * DIA, enviadaHaMs: 8 * DIA },
  },
  {
    place: "demo-8",
    nome: "Clínica Derma Plus",
    categoria: "dermatologist",
    website: "https://dermaplus.com.br",
    telefone: "(41) 3333-1008",
    avaliacoes: 260,
    status: "ganho",
    statusHaMs: 10 * DIA,
    score: 90,
    scoreEstimado: false,
    diagnostico: {
      temSite: true,
      https: true,
      performance: 55,
      atendimento: "nao_detectado",
    },
    outreach: { geradaHaMs: 20 * DIA, enviadaHaMs: 19 * DIA },
  },
  {
    place: "demo-9",
    nome: "Mercadinho da Esquina",
    categoria: "grocery_store",
    website: null,
    telefone: null,
    avaliacoes: 8,
    status: "descartado",
    statusHaMs: 2 * DIA,
    score: 42,
    scoreEstimado: false,
    diagnostico: { temSite: false, atendimento: "nao_avaliado" },
  },
  // Coletados e ainda sem Diagnóstico: alimentam a cobrança APROFUNDAR_FILA
  // e o botão "Aprofundar próximos 10".
  ...Array.from({ length: 6 }, (_, i) => ({
    place: `demo-novo-${i + 1}`,
    nome: `Consultório Odonto ${i + 1}`,
    categoria: "dentist",
    website: i % 2 === 0 ? null : "http://consultorio.exemplo.com.br",
    telefone: `(41) 3333-20${i + 10}`,
    avaliacoes: 40 + i * 30,
    status: "novo" as const,
    statusHaMs: 1 * HORA,
    score: i % 2 === 0 ? 92 : 71,
    scoreEstimado: true,
  })),
];

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    console.error("Uso: npx tsx scripts/seed-dev.mts seu@email.com");
    process.exit(1);
  }

  // Usuário: cria se não existir, pra o magic link achar no primeiro login.
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      id: `dev-${Buffer.from(email).toString("hex").slice(0, 20)}`,
      email,
      name: email.split("@")[0]!,
      emailVerified: true,
    },
  });

  // F019.1 — compra verificada, senão Materiais e Skills ficam bloqueados.
  const productId = process.env.HUBLA_PRODUCT_ID ?? "VL3e0iDO3A32SyjJWr9S";
  await prisma.hublaEntitlement.upsert({
    where: { email_product_id: { email, product_id: productId } },
    update: { status: "ativo" },
    create: { email, product_id: productId, status: "ativo" },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: {
      purchaseEmail: email,
      purchaseVerifiedAt: new Date(),
      purchaseProductId: productId,
    },
  });

  // F035 — entitlement do plano Pro, pra dar pra ver as duas experiências
  // localmente. Comente `HUBLA_PRODUCT_ID_PRO` no `.env` e o mesmo usuário
  // vira Free (Tarefas, Funil, Agente e e-mail com cadeado).
  const planoPro = process.env.HUBLA_PRODUCT_ID_PRO?.trim();
  if (planoPro) {
    await prisma.hublaEntitlement.upsert({
      where: { email_product_id: { email, product_id: planoPro } },
      update: { status: "ativo" },
      create: { email, product_id: planoPro, status: "ativo" },
    });
  }

  // Idempotente: limpa só o que este script criou.
  await prisma.lead.deleteMany({
    where: { user_id: user.id, place_id: { startsWith: "demo-" } },
  });

  for (const c of CENARIOS) {
    const lead = await prisma.lead.create({
      data: {
        user_id: user.id,
        place_id: c.place,
        nome: c.nome,
        endereco: `Rua Exemplo, ${c.place.slice(-2)} — Curitiba, PR`,
        categoria: c.categoria,
        website: c.website,
        telefone: c.telefone,
        email: c.email ?? null,
        email_origem: c.email ? "site" : null,
        nota: 4.2 + (c.avaliacoes % 7) / 10,
        num_avaliacoes: c.avaliacoes,
        status: c.status,
        status_em: atras(c.statusHaMs),
        score: c.score,
        score_estimado: c.scoreEstimado,
      },
    });

    if (c.diagnostico) {
      await prisma.diagnostico.create({
        data: {
          user_id: user.id,
          lead_id: lead.id,
          tem_site: c.diagnostico.temSite,
          site_e_agregador: c.diagnostico.agregador ?? false,
          tem_https: c.diagnostico.https ?? null,
          performance_mobile: c.diagnostico.performance ?? null,
          tempo_carregamento_ms: c.diagnostico.temSite ? 1800 : null,
          atendimento_automatizado: c.diagnostico.atendimento,
          atendimento_evidencia: c.diagnostico.evidencia ?? null,
          executado_em: atras(c.statusHaMs + HORA),
        },
      });
    }

    if (c.dores?.length) {
      await prisma.dor.createMany({
        data: c.dores.map((d) => ({
          user_id: user.id,
          lead_id: lead.id,
          tipo: d.tipo,
          severidade: d.severidade,
          detalhes: d.detalhes,
        })),
      });
    }

    if (c.outreach) {
      await prisma.outreach.create({
        data: {
          user_id: user.id,
          lead_id: lead.id,
          canal: "whatsapp",
          conteudo: `Oi! Vi que a ${c.nome} fica em Curitiba e quis falar direto com você. Reparei em um ponto no digital de vocês que dá pra resolver rápido — posso te mostrar em 5 minutos?`,
          gerado_em: atras(c.outreach.geradaHaMs),
          enviado: c.outreach.enviadaHaMs !== null,
          enviado_em:
            c.outreach.enviadaHaMs === null
              ? null
              : atras(c.outreach.enviadaHaMs),
        },
      });
    }
  }

  console.log(`Seed pronto para ${email}:`);
  console.log(`  ${CENARIOS.length} Leads de demonstração`);
  console.log("  compra verificada (Materiais e Skills liberados)");
  console.log(
    planoPro
      ? `  plano Pro (F035) — comente HUBLA_PRODUCT_ID_PRO no .env pra ver como é no Free`
      : "  plano Free (F035) — defina HUBLA_PRODUCT_ID_PRO no .env pra virar Pro",
  );
  console.log("");
  console.log("Agora: npm run dev → http://localhost:3000 → entre com esse");
  console.log("e-mail e pegue o magic link em http://127.0.0.1:8025");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
