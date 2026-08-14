/**
 * Prova que o servidor **que está rodando agora** enxerga as chaves do modo
 * Orion — não só que elas estão no `.env`.
 *
 *   npx tsx scripts/verificar-chaves-no-app.mts
 *
 * A distinção importa: o Next lê o `.env` ao subir. Mexer no arquivo com o
 * `next dev` já de pé é o caso em que "a chave está lá" e "o app tem a chave"
 * deixam de ser a mesma frase. Aqui a pergunta é feita ao processo vivo.
 *
 * Cria uma sessão de verdade no banco (o mesmo cookie que o navegador usa) e
 * chama `/api/agente`. Gasta 1 mensagem da cota do mês — é o preço de testar
 * o caminho real em vez de um parecido.
 *
 * Nunca imprime a chave.
 */

import "dotenv/config";
import { createHmac, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const BASE = process.env.APP_BASE ?? "http://127.0.0.1:3000";
const EMAIL = process.env.PERF_EMAIL ?? "devemdobro@gmail.com";

const prisma = new PrismaClient();

async function criarCookie(): Promise<string> {
  const segredo = process.env.BETTER_AUTH_SECRET?.trim();
  if (!segredo) throw new Error("BETTER_AUTH_SECRET ausente no .env");

  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) throw new Error(`usuário ${EMAIL} não existe`);

  const token = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      id: randomBytes(16).toString("hex"),
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + 3_600_000),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  const assinatura = createHmac("sha256", segredo)
    .update(token)
    .digest("base64");
  return `better-auth.session_token=${token}.${assinatura}`;
}

async function main() {
  const cookie = await criarCookie();

  const res = await fetch(`${BASE}/api/agente`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({
      mensagens: [{ role: "user", content: "Responda só: ok" }],
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) {
    const corpo = await res.text();
    console.log(`agente: HTTP ${res.status} — ${corpo.slice(0, 300)}`);
    process.exitCode = 1;
    return;
  }

  // Streaming: ler até o fim é o que prova que o provider respondeu mesmo.
  const texto = (await res.text()).trim();
  console.log(`agente: HTTP 200 — respondeu ${JSON.stringify(texto.slice(0, 120))}`);
  if (!texto) {
    console.log("  (stream vazio — o provider não completou)");
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error("FALHOU:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
