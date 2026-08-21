// Health check público (deploy / load balancer).
// Sem auth. Falha se secrets críticos ou banco estiverem ruins.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  fingerprintEnv,
  listarChecksCriticos,
} from "@/lib/seguranca/env-servidor";
import {
  DB_RTT_ALVO_MS,
  medirMs,
  regiaoDaFuncao,
} from "@/lib/observabilidade/desempenho";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const checks = listarChecksCriticos();
  const secretsOk = checks.every((c) => c.ok);

  // F028/ADR-015 — RTT função ↔ banco. É o número que separa "banco longe"
  // de "query ruim"; primeiro lugar a olhar quando alguém disser "está lento".
  let dbOk = false;
  let dbErro: string | undefined;
  let dbRttMs: number | undefined;
  try {
    const { ms } = await medirMs(() => prisma.$queryRaw`SELECT 1`);
    dbRttMs = ms;
    dbOk = true;
  } catch (e) {
    dbErro = e instanceof Error ? e.message.slice(0, 120) : "db error";
  }

  const ok = secretsOk && dbOk;
  const body = {
    ok,
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    vercel: Boolean(process.env.VERCEL),
    secrets: checks.map((c) => ({
      name: c.name,
      ok: c.ok,
      ...(c.ok ? {} : { detalhe: c.detalhe }),
      fingerprint: fingerprintEnv(c.name),
    })),
    regiao: regiaoDaFuncao(),
    database: {
      ok: dbOk,
      ...(dbOk ? {} : { detalhe: dbErro }),
      // F028 AC1 — alvo < 15ms (função e banco co-localizados).
      ...(dbRttMs === undefined
        ? {}
        : { rtt_ms: dbRttMs, rtt_alvo_ms: DB_RTT_ALVO_MS, rtt_ok: dbRttMs < DB_RTT_ALVO_MS }),
    },
    // Em produção serverless o F008 exige ScreenshotOne via BYOK (ADR-006).
    f008: {
      screenshotoneObrigatorio: Boolean(process.env.VERCEL),
    },
  };

  return NextResponse.json(body, { status: ok ? 200 : 503 });
}
