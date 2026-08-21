/**
 * Foto do combobox de cidade aberto — o item que só se avalia com o olho.
 *
 *   npx tsx scripts/shot-combobox.mts [--sem-build]
 *
 * Escolhe uma UF, abre o campo de cidade e fotografa o painel. O `<datalist>`
 * que ele substituiu abria do lado do campo e com a altura do conteúdo inteiro;
 * o que precisa aparecer aqui é: painel ANCORADO EMBAIXO, com teto de altura e
 * rolagem.
 */

import "dotenv/config";
import { spawn, type ChildProcess } from "node:child_process";
import { createHmac, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import net from "node:net";
import { PrismaClient } from "@prisma/client";
import { chromium } from "playwright";

const PORTA = Number(process.env.CB_PORTA ?? 3131);
const BASE = `http://127.0.0.1:${PORTA}`;
const EMAIL = process.env.PERF_EMAIL ?? "devemdobro@gmail.com";
const DIST_DIR = ".next-shots";
const DESTINO = "test-results/shots";

const prisma = new PrismaClient();

async function portaOcupada(p: number) {
  return new Promise<boolean>((r) => {
    const s = net.connect({ port: p, host: "127.0.0.1" });
    s.on("connect", () => {
      s.destroy();
      r(true);
    });
    s.on("error", () => r(false));
  });
}

async function construir() {
  const tsconfig = "tsconfig.json";
  const original = readFileSync(tsconfig, "utf8");
  try {
    await new Promise<void>((resolve, reject) => {
      const p = spawn("npx next build", {
        env: { ...process.env, NEXT_DIST_DIR: DIST_DIR },
        stdio: "pipe",
        shell: true,
      });
      let s = "";
      p.stdout?.on("data", (b: Buffer) => (s += b.toString()));
      p.stderr?.on("data", (b: Buffer) => (s += b.toString()));
      p.on("exit", (c) => (c === 0 ? resolve() : reject(new Error(s.slice(-1200)))));
    });
  } finally {
    if (readFileSync(tsconfig, "utf8") !== original) writeFileSync(tsconfig, original);
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
  mkdirSync(DESTINO, { recursive: true });
  if (!process.argv.includes("--sem-build")) await construir();

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
  const segredo = process.env.BETTER_AUTH_SECRET!.trim();
  const cookie = `${token}.${createHmac("sha256", segredo).update(token).digest("base64")}`;

  const servidor = await subir();
  try {
    const browser = await chromium.launch();
    for (const tema of ["claro", "escuro"] as const) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await ctx.addCookies([
        { name: "better-auth.session_token", value: cookie, domain: "127.0.0.1", path: "/", httpOnly: true, secure: false, sameSite: "Lax" },
        { name: "orion_tema", value: tema, domain: "127.0.0.1", path: "/", secure: false, sameSite: "Lax" },
      ]);
      const page = await ctx.newPage();
      await page.goto(`${BASE}/leads`, { waitUntil: "load" });

      await page.selectOption('select[name="uf"]', "RS");
      // Espera a lista de municípios chegar da API antes de abrir o painel.
      await page.waitForFunction(
        () => !(document.querySelector('input[name="municipio"]') as HTMLInputElement)?.disabled,
        { timeout: 15_000 },
      );
      await page.click('input[name="municipio"]');
      await page.waitForSelector('[role="listbox"]', { timeout: 5000 });

      const caixa = await page.locator('input[name="municipio"]').boundingBox();
      const painel = await page.locator('[role="listbox"]').boundingBox();
      const opcoes = await page.locator('[role="option"]').count();
      console.log(
        `${tema}: campo y=${Math.round(caixa!.y)}h=${Math.round(caixa!.height)} · ` +
          `painel y=${Math.round(painel!.y)} altura=${Math.round(painel!.height)} · ` +
          `${opcoes} opções · ` +
          `${painel!.y >= caixa!.y + caixa!.height - 2 ? "ABAIXO ok" : "NÃO está abaixo"} · ` +
          `${painel!.height <= 280 ? "altura limitada ok" : "ALTURA ESTOUROU"}`,
      );

      const arq = `${DESTINO}/combobox-${tema}.png`;
      await page.screenshot({ path: arq });
      console.log(`  ${arq}`);
      await ctx.close();
    }
    await browser.close();
  } finally {
    if (servidor.pid && process.platform === "win32") {
      spawn("taskkill", ["/PID", String(servidor.pid), "/T", "/F"], { stdio: "ignore" });
    } else servidor.kill("SIGKILL");
    await new Promise((r) => setTimeout(r, 1500));
  }
}

main()
  .catch((e) => {
    console.error("FALHOU:", e instanceof Error ? e.stack : e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
