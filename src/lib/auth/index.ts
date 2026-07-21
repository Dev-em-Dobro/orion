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
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
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
