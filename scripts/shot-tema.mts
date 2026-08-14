/**
 * Screenshot das telas nos dois temas, pra conferir layout com o olho.
 *
 *   npm run build && npx tsx scripts/shot-tema.mts
 *
 * Sobe o build de produção, forja sessão (mesmo método do `perf-rotas`) e tira
 * um PNG por rota × tema em `test-results/shots/`.
 *
 * Existe porque regressão de layout não aparece em teste unitário nem em build:
 * o `md:pl-60` pintava o fundo claro embaixo da sidebar translúcida e nada
 * quebrou — só ficou feio.
 */

import "dotenv/config";
import { spawn, type ChildProcess } from "node:child_process";
import { createHmac, randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import net from "node:net";
import { PrismaClient } from "@prisma/client";
import { chromium } from "playwright";

const PORTA = Number(process.env.SHOT_PORTA ?? 3126);
const BASE = `http://127.0.0.1:${PORTA}`;
const EMAIL = process.env.PERF_EMAIL ?? "devemdobro@gmail.com";
const DESTINO = "test-results/shots";

const ROTAS = [
  { nome: "dashboard", caminho: "/" },
  { nome: "leads", caminho: "/leads" },
  { nome: "funil", caminho: "/funil" },
  { nome: "tarefas", caminho: "/tarefas" },
  { nome: "configuracao", caminho: "/configuracao" },
  { nome: "planos", caminho: "/planos" },
];

const prisma = new PrismaClient();

async function portaOcupada(porta: number): Promise<boolean> {
  return new Promise((resolve) => {
    const s = net.connect({ port: porta, host: "127.0.0.1" });
    s.on("connect", () => {
      s.destroy();
      resolve(true);
    });
    s.on("error", () => resolve(false));
  });
}

async function criarSessao(): Promise<string> {
  const segredo = process.env.BETTER_AUTH_SECRET?.trim();
  if (!segredo) throw new Error("BETTER_AUTH_SECRET ausente");
  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) throw new Error(`usuário ${EMAIL} não existe`);
  const token = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      id: randomBytes(16).toString("hex"),
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + 86_400_000),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  const sig = createHmac("sha256", segredo).update(token).digest("base64");
  return `${token}.${sig}`;
}

async function subir(): Promise<ChildProcess> {
  if (await portaOcupada(PORTA)) throw new Error(`porta ${PORTA} ocupada`);
  const proc = spawn(`npx next start -p ${PORTA}`, {
    env: { ...process.env, NODE_ENV: "production" },
    stdio: "pipe",
    shell: true,
  });
  const limite = Date.now() + 90_000;
  for (;;) {
    if (Date.now() > limite) throw new Error("servidor não subiu");
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok || r.status === 401) break;
    } catch {
      /* subindo */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return proc;
}

async function main() {
  mkdirSync(DESTINO, { recursive: true });
  const cookie = await criarSessao();
  const servidor = await subir();

  try {
    const browser = await chromium.launch();
    for (const tema of ["escuro", "claro"] as const) {
      const ctx = await browser.newContext({
        viewport: { width: 1440, height: 900 },
      });
      await ctx.addCookies([
        {
          name: "better-auth.session_token",
          value: cookie,
          domain: "127.0.0.1",
          path: "/",
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
        },
        {
          name: "orion_tema",
          value: tema,
          domain: "127.0.0.1",
          path: "/",
          secure: false,
          sameSite: "Lax",
        },
      ]);
      const page = await ctx.newPage();
      for (const r of ROTAS) {
        await page.goto(`${BASE}${r.caminho}`, { waitUntil: "load" });
        // Deixa o streaming dos blocos terminar antes do clique do obturador.
        await page.waitForTimeout(1200);
        const arquivo = `${DESTINO}/${r.nome}-${tema}.png`;
        await page.screenshot({ path: arquivo });
        console.log(`  ${arquivo}`);
      }
      await ctx.close();
    }
    await browser.close();
  } finally {
    if (servidor.pid && process.platform === "win32") {
      spawn("taskkill", ["/PID", String(servidor.pid), "/T", "/F"], {
        stdio: "ignore",
      });
    } else {
      servidor.kill("SIGKILL");
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
}

main()
  .catch((e) => {
    console.error("FALHOU:", e instanceof Error ? e.stack : e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
