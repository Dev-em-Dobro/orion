/**
 * Medição de carregamento de TODAS as rotas do Orion.
 *
 *   npm run build && npx tsx scripts/perf-rotas.mts
 *
 * Critério de aceite: nenhuma rota passa de 2,5 s.
 *
 * Mede duas coisas, porque uma sozinha mente:
 *
 * - **Servidor** (`fetch`): TTFB e corpo completo. É o piso — nenhum navegador
 *   pinta antes disso. Muitas amostras, barato.
 * - **Navegador** (Chromium de verdade, via Playwright): `load` e LCP. É o que
 *   o aluno sente, e inclui parse de JS, hidratação e fonte.
 *
 * Sobe o servidor de produção (`next start`) numa porta própria pra não
 * disputar com o `next dev` de quem estiver trabalhando. Modo de produção não
 * é detalhe: em `next dev` cada rota compila na primeira visita e o número
 * seria de compilador, não de aplicação.
 *
 * A sessão é forjada aqui — linha em `session` + cookie assinado no mesmo
 * formato do Better Auth. O helper `/api/e2e/session` não serve porque ele se
 * desliga sozinho quando `NODE_ENV=production`, que é justamente o modo que
 * precisamos medir.
 */

import "dotenv/config";
import { spawn, type ChildProcess } from "node:child_process";
import { createHmac, randomBytes } from "node:crypto";
import net from "node:net";
import { writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { chromium } from "playwright";
import { criarProxy } from "./perf-proxy-latencia.mts";

const PORTA = Number(process.env.PERF_PORTA ?? 3123);
const PORTA_PROXY = Number(process.env.PERF_PORTA_PROXY ?? 5433);
/** Ida-e-volta típica de um Postgres hospedado (Neon) a partir da app. */
const LATENCIA_BANCO_MS = Number(process.env.PERF_LATENCIA_BANCO ?? 35);
const BASE = `http://127.0.0.1:${PORTA}`;
const EMAIL = process.env.PERF_EMAIL ?? "devemdobro@gmail.com";
const AMOSTRAS = Number(process.env.PERF_AMOSTRAS ?? 7);
const TETO_MS = 2500;

const prisma = new PrismaClient();

/** Rotas medidas. `dinamica` recebe um id real da base do usuário. */
type Rota = { nome: string; caminho: string | ((ctx: Ctx) => string | null) };

type Ctx = { leadId: string | null; skillSlug: string | null };

const ROTAS: Rota[] = [
  { nome: "/", caminho: "/" },
  { nome: "/leads", caminho: "/leads" },
  { nome: "/leads?status=descartados", caminho: "/leads?status=descartados" },
  { nome: "/leads/[id]", caminho: (c) => (c.leadId ? `/leads/${c.leadId}` : null) },
  {
    nome: "/leads/[id]?aba=abordagem",
    caminho: (c) => (c.leadId ? `/leads/${c.leadId}?aba=abordagem` : null),
  },
  { nome: "/funil", caminho: "/funil" },
  { nome: "/agente", caminho: "/agente" },
  { nome: "/tarefas", caminho: "/tarefas" },
  { nome: "/ranking", caminho: "/ranking" },
  { nome: "/treino", caminho: "/treino" },
  { nome: "/conteudo", caminho: "/conteudo" },
  { nome: "/planos", caminho: "/planos" },
  { nome: "/configuracao", caminho: "/configuracao" },
  { nome: "/configuracao/tutorial-google", caminho: "/configuracao/tutorial-google" },
  { nome: "/skills", caminho: "/skills" },
  {
    nome: "/skills/[slug]",
    caminho: (c) => (c.skillSlug ? `/skills/${c.skillSlug}` : null),
  },
  { nome: "/entregaveis", caminho: "/entregaveis" },
  { nome: "/login", caminho: "/login" },
];

function percentil(valores: number[], p: number): number {
  if (valores.length === 0) return 0;
  const ordenado = [...valores].sort((a, b) => a - b);
  const i = Math.min(ordenado.length - 1, Math.floor((p / 100) * ordenado.length));
  return ordenado[i] ?? 0;
}

/** Cookie do Better Auth: `<token>.<HMAC-SHA256 base64 do token>`. */
function assinarCookie(token: string, segredo: string): string {
  const sig = createHmac("sha256", segredo).update(token).digest("base64");
  return `${token}.${sig}`;
}

async function criarSessao(): Promise<{ cookie: string; userId: string }> {
  const segredo = process.env.BETTER_AUTH_SECRET?.trim();
  if (!segredo) throw new Error("BETTER_AUTH_SECRET ausente no .env");

  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) {
    throw new Error(
      `Usuário ${EMAIL} não existe. Rode \`npx tsx scripts/seed-dev.mts ${EMAIL}\` ou passe PERF_EMAIL=.`,
    );
  }

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

  return {
    cookie: `better-auth.session_token=${assinarCookie(token, segredo)}`,
    userId: user.id,
  };
}

/** `true` quando alguém já está escutando a porta. */
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

/**
 * Mata a árvore inteira. `spawn(..., { shell: true })` devolve o PID do
 * `cmd.exe`, não o do Node do `next start` — e `proc.kill()` derruba só o
 * shell. O servidor do primeiro cenário sobrevivia, o segundo `next start`
 * batia em EADDRINUSE e morria calado, e as medições do cenário 2 iam todas
 * pro servidor do cenário 1. Foi assim que a primeira rodada "provou" que
 * 35 ms de latência de banco não custavam nada.
 */
async function derrubar(proc: ChildProcess, porta: number) {
  if (proc.pid) {
    if (process.platform === "win32") {
      spawn("taskkill", ["/PID", String(proc.pid), "/T", "/F"], {
        stdio: "ignore",
      });
    } else {
      proc.kill("SIGKILL");
    }
  }
  const limite = Date.now() + 20_000;
  while ((await portaOcupada(porta)) && Date.now() < limite) {
    await new Promise((r) => setTimeout(r, 300));
  }
  if (await portaOcupada(porta)) {
    throw new Error(`porta ${porta} continua ocupada — mate o processo à mão`);
  }
}

async function subirServidor(databaseUrl?: string): Promise<ChildProcess> {
  if (await portaOcupada(PORTA)) {
    throw new Error(
      `porta ${PORTA} já está ocupada antes de subir — outro servidor no ar?`,
    );
  }
  // `shell: true` no Windows: sem ele o Node recusa `npx.cmd` com EINVAL
  // desde a correção de segurança de spawn do 20.x.
  const proc = spawn("npx next start -p " + PORTA, {
    env: {
      ...process.env,
      NODE_ENV: "production",
      ...(databaseUrl ? { DATABASE_URL: databaseUrl } : {}),
    },
    stdio: "pipe",
    shell: true,
  });
  let fatal: string | null = null;
  const olhar = (b: Buffer) => {
    const t = b.toString();
    // Um `.next` meio construído sobe o servidor e devolve 500 em tudo. Sem
    // esta checagem o relatório saía cheio de "0 ms" e daria a impressão de um
    // app absurdamente rápido — o pior tipo de número errado.
    if (t.includes("Failed to prepare server") || t.includes("EADDRINUSE")) {
      fatal = t.trim().slice(0, 400);
    }
  };
  proc.stdout?.on("data", olhar);
  proc.stderr?.on("data", olhar);

  const limite = Date.now() + 90_000;
  for (;;) {
    if (fatal) throw new Error(`servidor não subiu:\n${fatal}`);
    if (Date.now() > limite) throw new Error("servidor não subiu em 90 s");
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok || r.status === 401) break;
      if (r.status >= 500) {
        throw new Error(
          `/api/health devolveu ${r.status} — build inconsistente? Rode \`rm -rf .next && npm run build\`.`,
        );
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("/api/health")) throw e;
      /* ainda subindo */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return proc;
}

type MedidaHttp = {
  rota: string;
  status: number;
  ttfb: number[];
  total: number[];
  bytes: number;
};

async function medirHttp(
  caminho: string,
  cookie: string,
): Promise<Omit<MedidaHttp, "rota">> {
  const ttfb: number[] = [];
  const total: number[] = [];
  let status = 0;
  let bytes = 0;

  // Aquecimento: a primeira visita paga conexão do Prisma e cache de módulo.
  // Medir isso seria medir o boot, não a página.
  await fetch(`${BASE}${caminho}`, { headers: { cookie }, redirect: "manual" });

  for (let i = 0; i < AMOSTRAS; i++) {
    const t0 = performance.now();
    const res = await fetch(`${BASE}${caminho}`, {
      headers: { cookie },
      redirect: "manual",
    });
    const tPrimeiroByte = performance.now() - t0;
    const corpo = await res.arrayBuffer();
    total.push(performance.now() - t0);
    ttfb.push(tPrimeiroByte);
    status = res.status;
    bytes = corpo.byteLength;
  }
  return { status, ttfb, total, bytes };
}

type MedidaBrowser = {
  rota: string;
  load: number;
  lcp: number;
  domContentLoaded: number;
};

async function medirNavegador(
  rotas: { nome: string; caminho: string }[],
  cookie: string,
  /** `true` = CPU 4× mais lenta e rede tipo 4G ruim, o perfil de um aluno real. */
  freado: boolean,
): Promise<MedidaBrowser[]> {
  const [nomeCookie, valorCookie] = cookie.split("=", 2) as [string, string];
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([
    {
      name: nomeCookie,
      value: valorCookie,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  const page = await ctx.newPage();

  // LCP só chega por PerformanceObserver. `getEntriesByType('largest-
  // contentful-paint')` devolve lista vazia — foi assim que a primeira versão
  // deste script reportou "LCP 0 ms" em TODAS as rotas, que é o tipo de número
  // que parece ótimo e não mede nada.
  await page.addInitScript(() => {
    (window as unknown as { __lcp: number }).__lcp = 0;
    new PerformanceObserver((lista) => {
      const entradas = lista.getEntries();
      const ultima = entradas[entradas.length - 1];
      if (ultima) (window as unknown as { __lcp: number }).__lcp = ultima.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
  });

  if (freado) {
    // Perfil "aluno de verdade": notebook modesto + 4G ruim. Sem isto a
    // medição roda em localhost com CPU de desktop, que não é o cenário que o
    // critério de 2,5 s está tentando proteger.
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  }

  const saida: MedidaBrowser[] = [];

  // Aquecimento do próprio Chromium (primeira navegação paga o cold start).
  await page.goto(`${BASE}/`, { waitUntil: "load" }).catch(() => null);

  for (const r of rotas) {
    let load = 0;
    let dcl = 0;
    let lcp = 0;
    // Duas passadas e fica a segunda: a primeira ainda paga download de chunk
    // e de fonte que a segunda pega do cache — e é a segunda que se parece com
    // o uso real, onde o aluno já navegou por outra tela antes.
    for (let i = 0; i < 2; i++) {
      await page.goto("about:blank");
      await page.goto(`${BASE}${r.caminho}`, {
        waitUntil: "load",
        timeout: 60_000,
      });
      // O LCP pode ser publicado logo depois do `load` — sem esta folga o
      // último candidato ainda não entrou no observer.
      await page.waitForTimeout(freado ? 600 : 200);
      const m = await page.evaluate(() => {
        const nav = performance.getEntriesByType(
          "navigation",
        )[0] as PerformanceNavigationTiming | undefined;
        return {
          load: nav ? nav.loadEventEnd - nav.startTime : 0,
          dcl: nav ? nav.domContentLoadedEventEnd - nav.startTime : 0,
          lcp: (window as unknown as { __lcp: number }).__lcp,
        };
      });
      if (i === 1 || load === 0) {
        load = m.load;
        dcl = m.dcl;
        lcp = m.lcp;
      }
    }
    saida.push({ rota: r.nome, load, lcp, domContentLoaded: dcl });
    process.stdout.write(
      `  navegador ${r.nome.padEnd(30)} load ${Math.round(load)} ms · LCP ${Math.round(lcp)} ms\n`,
    );
  }

  await browser.close();
  return saida;
}

async function main() {
  console.log(`Medindo ${BASE} · ${AMOSTRAS} amostras HTTP por rota · teto ${TETO_MS} ms\n`);

  const { cookie, userId } = await criarSessao();
  const lead = await prisma.lead.findFirst({
    where: { user_id: userId },
    orderBy: { score: "desc" },
    select: { id: true },
  });
  const { SKILLS_MENU } = await import("../src/lib/skills/catalogo.ts");
  const ctx: Ctx = {
    leadId: lead?.id ?? null,
    skillSlug: SKILLS_MENU[0]?.slug ?? null,
  };

  const alvos = ROTAS.map((r) => ({
    nome: r.nome,
    caminho: typeof r.caminho === "string" ? r.caminho : r.caminho(ctx),
  })).filter((r): r is { nome: string; caminho: string } => r.caminho !== null);

  // Dois cenários. Um só não responde a pergunta: o primeiro diz se o código
  // é rápido, o segundo diz se ele continua rápido no ambiente onde roda de
  // verdade (Neon + notebook modesto + 4G).
  const cenarios = [
    {
      id: "local",
      rotulo: "banco local + máquina rápida (piso do código)",
      atrasoBanco: 0,
      freado: false,
    },
    {
      id: "producao",
      rotulo: `banco +${LATENCIA_BANCO_MS} ms/ida-e-volta (perfil Neon) + CPU 4x + 4G ruim`,
      atrasoBanco: LATENCIA_BANCO_MS,
      freado: true,
    },
  ] as const;

  const resultados: Record<string, ReturnType<typeof montarLinhas>> = {};

  for (const cen of cenarios) {
    console.log(`\n──────── cenário: ${cen.rotulo}\n`);

    let proxy: ReturnType<typeof criarProxy> | null = null;
    let url: string | undefined;
    if (cen.atrasoBanco > 0) {
      const original = process.env.DATABASE_URL ?? "";
      const alvo = new URL(original);
      const portaReal = Number(alvo.port || 5432);
      proxy = criarProxy(PORTA_PROXY, portaReal, cen.atrasoBanco);
      alvo.port = String(PORTA_PROXY);
      alvo.hostname = "127.0.0.1";
      url = alvo.toString();
    }

    const servidor = await subirServidor(url);
    try {
      const http: MedidaHttp[] = [];
      for (const r of alvos) {
        const m = await medirHttp(r.caminho, cookie);
        http.push({ rota: r.nome, ...m });
        process.stdout.write(
          `  http      ${r.nome.padEnd(30)} ${String(m.status).padStart(3)} · TTFB p50 ${Math.round(
            percentil(m.ttfb, 50),
          )} ms · total p95 ${Math.round(percentil(m.total, 95))} ms · ${(m.bytes / 1024).toFixed(0)} kB\n`,
        );
      }
      console.log("");

      const navegador = await medirNavegador(alvos, cookie, cen.freado);
      resultados[cen.id] = montarLinhas(alvos, http, navegador);
      console.log(`\n=== ${cen.rotulo} ===\n`);
      console.table(resultados[cen.id]);
    } finally {
      await derrubar(servidor, PORTA);
      proxy?.close();
    }
  }

  const finais = resultados.producao ?? [];
  const reprovadas = finais.filter((l) => l.veredito !== "ok");
  console.log(
    reprovadas.length === 0
      ? `\nCRITÉRIO ATENDIDO: as ${finais.length} rotas ficam abaixo de ${TETO_MS} ms no cenário de produção.`
      : `\n${reprovadas.length} rota(s) acima de ${TETO_MS} ms: ${reprovadas
          .map((r) => `${r.rota} (${r.load} ms)`)
          .join(", ")}`,
  );

  writeFileSync(
    "test-results/perf-rotas.json",
    JSON.stringify(
      { base: BASE, teto: TETO_MS, amostras: AMOSTRAS, cenarios: resultados },
      null,
      2,
    ),
  );
  console.log("\nbruto em test-results/perf-rotas.json");
}

function montarLinhas(
  alvos: { nome: string; caminho: string }[],
  http: MedidaHttp[],
  navegador: MedidaBrowser[],
) {
  return alvos.map((r) => {
    const h = http.find((x) => x.rota === r.nome)!;
    const b = navegador.find((x) => x.rota === r.nome)!;
    return {
      rota: r.nome,
      status: h.status,
      ttfbP50: Math.round(percentil(h.ttfb, 50)),
      ttfbP95: Math.round(percentil(h.ttfb, 95)),
      htmlP95: Math.round(percentil(h.total, 95)),
      html_kB: Number((h.bytes / 1024).toFixed(0)),
      dcl: Math.round(b.domContentLoaded),
      load: Math.round(b.load),
      lcp: Math.round(b.lcp),
      veredito: b.load <= TETO_MS ? "ok" : "ESTOURA",
    };
  });
}

main()
  .catch((e) => {
    console.error("FALHOU:", e instanceof Error ? e.stack : e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
