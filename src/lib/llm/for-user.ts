// Resolve provider + chave BYOK do aluno → LlmClient.

import { prisma } from "@/lib/db";
import { exigirChave } from "@/lib/chaves";
import { createLlmClient, type LlmClient } from "./client";
import type { LlmProviderId } from "./tipos";
import { tipoChaveDoProvider } from "./tipos";

function asProvider(raw: string | null | undefined): LlmProviderId {
  if (raw === "openai" || raw === "gemini" || raw === "anthropic") return raw;
  return "anthropic";
}

export async function obterProviderLlm(
  userId: string,
): Promise<LlmProviderId> {
  // Raw até o client Prisma regenerar com llm_provider (migrate F017).
  const rows = await prisma.$queryRaw<{ llm_provider: string }[]>`
    SELECT "llm_provider" FROM "user_api_keys" WHERE "user_id" = ${userId} LIMIT 1
  `;
  return asProvider(rows[0]?.llm_provider);
}

export async function salvarProviderLlm(
  userId: string,
  provider: LlmProviderId,
): Promise<LlmProviderId> {
  await prisma.userApiKeys.upsert({
    where: { user_id: userId },
    create: { user_id: userId },
    update: {},
  });
  await prisma.$executeRaw`
    UPDATE "user_api_keys"
    SET "llm_provider" = CAST(${provider} AS "LlmProvider")
    WHERE "user_id" = ${userId}
  `;
  return provider;
}

/** Cliente LLM do aluno logado (provider escolhido + chave BYOK). */
export async function createLlmForUser(userId: string): Promise<LlmClient> {
  const provider = await obterProviderLlm(userId);
  const apiKey = await exigirChave(userId, tipoChaveDoProvider(provider));
  return createLlmClient(provider, apiKey);
}
