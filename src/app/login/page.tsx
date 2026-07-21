// F014 — tela de login (Google + magic link).
// Spec: /specs/02-features/F014-autenticacao.md

import { Suspense } from "react";
import { googleAuthEnabled } from "@/lib/auth";
import { NOME_PRODUTO_PARTES } from "@/lib/produto";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      {/* Atmosfera — gradiente + trama suave (marca verde do app). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(34,197,94,0.18),transparent_55%),radial-gradient(ellipse_50%_40%_at_100%_100%,rgba(34,197,94,0.06),transparent_50%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M0 0h1v1H0V0zm20 20h1v1h-1v-1z'/%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative w-full max-w-md space-y-8">
        <div className="space-y-3 text-center">
          <p className="text-3xl font-bold tracking-tight sm:text-4xl">
            {NOME_PRODUTO_PARTES.primaria}{" "}
            <span className="text-primary">
              {NOME_PRODUTO_PARTES.secundaria}
            </span>
          </p>
          <h1 className="text-lg font-medium text-zinc-200">
            Entre na sua conta de aluno
          </h1>
          <p className="text-sm text-zinc-500">
            {googleAuthEnabled
              ? "Google ou link por e-mail — sem senha."
              : "Link enviado por e-mail — sem senha."}
          </p>
        </div>

        <div className="card border-zinc-800/80 shadow-[0_0_0_1px_rgba(34,197,94,0.06)]">
          <Suspense
            fallback={
              <p className="text-sm text-zinc-500">Carregando formulário…</p>
            }
          >
            <LoginForm googleEnabled={googleAuthEnabled} />
          </Suspense>
        </div>

        <p className="text-center text-xs text-zinc-600">
          Ao entrar, você configura as suas próprias chaves de API e prospecta
          só os seus Leads.
        </p>
        <p className="text-center text-xs text-zinc-600">
          <a href="/termos" className="hover:text-zinc-400 hover:underline">
            Termos de Uso
          </a>
          {" · "}
          <a
            href="/privacidade"
            className="hover:text-zinc-400 hover:underline"
          >
            Privacidade
          </a>
        </p>
      </div>
    </main>
  );
}
