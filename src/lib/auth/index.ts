// F014 — Better Auth + adapter Prisma (ADR-007) + magic link (ADR-010).
// Spec: /specs/02-features/F014-autenticacao.md

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { magicLink } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/db";
import { sendMagicLinkEmail } from "@/lib/email";
import { NOME_PRODUTO } from "@/lib/produto";
import { loadAuthEnv } from "./env";

const env = loadAuthEnv();

export const auth = betterAuth({
  appName: NOME_PRODUTO,
  secret: env.secret,
  baseURL: env.baseURL,
  // Em produção é `[baseURL]`, que já era o default implícito. Em Preview da
  // Vercel entram também a URL da branch e a do deploy — sem isso o login lá
  // morria em "Invalid origin". Ver a emenda de 2026-08-16 na spec da F014.
  trustedOrigins: env.trustedOrigins,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  rateLimit: {
    enabled: true,
    window: 60,
    max: 20,
  },
  socialProviders: env.google
    ? {
        google: {
          clientId: env.google.clientId,
          clientSecret: env.google.clientSecret,
          prompt: "select_account",
        },
      }
    : {},
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },
  // F028 (H5) / ADR-015 — sessão assinada no cookie por 5 minutos: corta uma
  // consulta ao banco em toda navegação. O middleware já checava o cookie
  // antes; agora a validação também para de ir ao banco no caminho comum.
  // Custo aceito: até 5 min de defasagem se a sessão for revogada em outro
  // dispositivo. Logout local limpa o cookie na hora.
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  plugins: [
    magicLink({
      expiresIn: 60 * 5,
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLinkEmail({ to: email, url });
      },
    }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
export type AuthUser = Session["user"];

/** Preferir isto na UI — evita revalidar env no client. */
export const googleAuthEnabled = env.google !== null;
