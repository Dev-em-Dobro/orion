/**
 * Prova, com o navegador, se o esqueleto de cada rota chega a aparecer.
 *
 *   npx tsx scripts/verificar-skeleton.mts
 *
 * Clica no item do menu e observa se algum `[aria-busy="true"]` entra no DOM
 * antes do conteúdo. Com a rede freada, porque contra o Postgres local a
 * resposta vem em ~30 ms e um esqueleto de 30 ms não é visível pra ninguém —
 * o que a olho nu parece "não tem esqueleto" pode ser "tem, e é rápido demais
 * pra ver".
 */

import "dotenv/config";
import { spawn, type ChildProcess } from "node:child_process";
import { createHmac, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import net from "node:net";
import { PrismaClient } from "@prisma/client";
import { chromium } from "playwright";

const PORTA = Number(process.env.SK_PORTA ?? 3129);
const BASE = `http://127.0.0.1:${PORTA}`;
const EMAIL = process.env.PERF_EMAIL ?? "devemdobro@gmail.com";
const DIST_DIR = process.env.SK_DIST_DIR ?? ".next-shots";

const prisma = new PrismaClient();

const ROTAS = [
  { nome: "Leads", caminho: "/leads" },
  { nome: "Funil", caminho: "/funil" },
  { nome: "Agente", caminho: "/agente" },
  { nome: "Tarefas", caminho: "/tarefas" },
  { nome: "Ranking", caminho: "/ranking" },
  { nome: "Simulador de venda", caminho: "/treino" },
  { nome: "Planos", caminho: "/planos" },
  { nome: "Configuração", caminho: "/configuracao" },
];

async function portaOcupada(p: number): Promise<boolean> {
  return new Promise((r) => {
    const s = net.connect({ port: p, host: "127.0.0.1" });
    s.on("connect", () => {
      s.destroy();
      r(true);
    });
    s.on("error", () => r(false));
  });
}

async function construir(): Promise<void> {
  console.log(`build em ${DIST_DIR}/…`);
  const tsconfig = "tsconfig.json";
  const original = readFileSync(tsconfig, "utf8");
  try {
    await new Promise<void>((resolve, reject) => {
      const p = spawn("npx next build", {
        env: { ...process.env, NEXT_DIST_DIR: DIST_DIR },
        stdio: "pipe",
        shell: true,
      });
      let saida = "";
      p.stdout?.on("data", (b: Buffer) => (saida += b.toString()));
      p.stderr?.on("data", (b: Buffer) => (saida += b.toString()));
      p.on("exit", (c) =>
        c === 0 ? resolve() : reject(new Error(saida.slice(-1200))),
      );
    });
  } finally {
    if (readFileSync(tsconfig, "utf8") !== original) {
      writeFileSync(tsconfig, original);
    }
  }
}

async function subir(): Promise<ChildProcess> {
  if (await portaOcupada(PORTA)) throw new Error(`porta ${PORTA} ocupada`);
  const proc = spawn(`npx next start -p ${PORTA}`, {
    env: { ...process.env, NODE_ENV: "production", NEXT_DIST_DIR: DIST_DIR },
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
  const segredo = process.env.BETTER_AUTH_SECRET!.trim();
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
  const cookie = `${token}.${createHmac("sha256", segredo).update(token).digest("base64")}`;

  await construir();
  const servidor = await subir();

  try {
    const browser = await chromium.launch();
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
    ]);
    const page = await ctx.newPage();

    // Rede freada: sem isso a resposta local chega em ~30 ms e o esqueleto
    // existe por menos tempo do que qualquer olho registra.
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 400,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    });

    console.log("\nrota            esqueleto?  ponto no menu?");
    for (const r of ROTAS) {
      await page.goto(`${BASE}/`, { waitUntil: "load" });

      const link = page.locator(`nav a:has-text("${r.nome}")`).first();
      if ((await link.count()) === 0) {
        console.log(`  ${r.nome.padEnd(22)} (item não está no menu)`);
        continue;
      }

      // Observa o DOM durante a navegação: `aria-busy` é a marca que todos os
      // esqueletos carregam, e o ponto pulsante é o `role=status` do NavLink.
      const viuEsqueleto = page
        .locator('[aria-busy="true"]')
        .first()
        .waitFor({ state: "attached", timeout: 8000 })
        .then(() => true)
        .catch(() => false);
      const viuPonto = page
        .locator('nav [role="status"]')
        .first()
        .waitFor({ state: "attached", timeout: 8000 })
        .then(() => true)
        .catch(() => false);

      await link.click();
      const [esqueleto, ponto] = await Promise.all([viuEsqueleto, viuPonto]);
      await page.waitForURL(`**${r.caminho}`, { timeout: 15_000 }).catch(() => null);

      console.log(
        `  ${r.nome.padEnd(22)} ${esqueleto ? "SIM" : "não"}         ${ponto ? "SIM" : "não"}`,
      );
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
