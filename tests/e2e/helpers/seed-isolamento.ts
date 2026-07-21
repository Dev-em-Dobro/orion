// Seed de isolamento F015 — dois alunos com Leads próprios + sessão Better Auth.

import { createHash, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export type IsolamentoSeed = {
  alunoA: { id: string; email: string; leadId: string; leadNome: string; token: string };
  alunoB: { id: string; email: string; leadId: string; leadNome: string; token: string };
};

function newId(prefix: string): string {
  return `${prefix}_${randomBytes(10).toString("hex")}`;
}

function sessionToken(): string {
  return randomBytes(32).toString("hex");
}

async function upsertAluno(params: {
  email: string;
  name: string;
  leadNome: string;
  placeSuffix: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: params.email } });
  const userId = existing?.id ?? newId("user");

  if (!existing) {
    await prisma.user.create({
      data: {
        id: userId,
        name: params.name,
        email: params.email,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  await prisma.session.deleteMany({ where: { userId } });
  await prisma.lead.deleteMany({ where: { user_id: userId } });

  const token = sessionToken();
  await prisma.session.create({
    data: {
      id: newId("sess"),
      token,
      userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const lead = await prisma.lead.create({
    data: {
      user_id: userId,
      nome: params.leadNome,
      endereco: "Rua E2E, 100 — Curitiba PR",
      categoria: "barbershop",
      place_id: `e2e_place_${params.placeSuffix}_${createHash("sha1").update(userId).digest("hex").slice(0, 8)}`,
      status: "novo",
      score: 10,
    },
  });

  return { id: userId, email: params.email, leadId: lead.id, leadNome: lead.nome, token };
}

export async function seedIsolamento(): Promise<IsolamentoSeed> {
  const stamp = Date.now().toString(36);
  const alunoA = await upsertAluno({
    email: `e2e-a-${stamp}@isolamento.test`,
    name: "Aluno A E2E",
    leadNome: `Lead-Exclusivo-A-${stamp}`,
    placeSuffix: `a_${stamp}`,
  });
  const alunoB = await upsertAluno({
    email: `e2e-b-${stamp}@isolamento.test`,
    name: "Aluno B E2E",
    leadNome: `Lead-Exclusivo-B-${stamp}`,
    placeSuffix: `b_${stamp}`,
  });
  return { alunoA, alunoB };
}

export async function limparSeed(seed: IsolamentoSeed): Promise<void> {
  for (const u of [seed.alunoA, seed.alunoB]) {
    await prisma.session.deleteMany({ where: { userId: u.id } });
    await prisma.lead.deleteMany({ where: { user_id: u.id } });
    await prisma.user.deleteMany({ where: { id: u.id } });
  }
}

export async function disconnectSeed(): Promise<void> {
  await prisma.$disconnect();
}
