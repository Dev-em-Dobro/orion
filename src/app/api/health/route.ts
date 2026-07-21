// Health check público (deploy / load balancer).
// Sem auth. Falha se secrets críticos ou banco estiverem ruins.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  fingerprintEnv,
  listarChecksCriticos,
} from "@/lib/seguranca/env-servidor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const checks = listarChecksCriticos();
  const secretsOk = checks.every((c) => c.ok);

  let dbOk = false;
  let dbErro: string | undefined;
  try {
    await prisma.$queryRaw`SELECT 1`;
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
    database: { ok: dbOk, ...(dbOk ? {} : { detalhe: dbErro }) },
    // Em produção serverless o F008 exige ScreenshotOne via BYOK (ADR-006).
    f008: {
      screenshotoneObrigatorio: Boolean(process.env.VERCEL),
    },
  };

  return NextResponse.json(body, { status: ok ? 200 : 503 });
}
