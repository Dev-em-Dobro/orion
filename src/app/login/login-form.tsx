"use client";

// F014 — formulário de login: Google OAuth + magic link.

import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth/client";

type Estado =
  | { kind: "idle" }
  | { kind: "enviando" }
  | { kind: "enviado"; email: string }
  | { kind: "erro"; mensagem: string };

function mensagemErroCallback(code: string | null): string | null {
  if (!code) return null;
  const mapa: Record<string, string> = {
    INVALID_TOKEN: "Link inválido ou já usado. Solicite um novo.",
    EXPIRED_TOKEN: "Link expirado. Solicite um novo pelo e-mail.",
    TOKEN_EXPIRED: "Link expirado. Solicite um novo pelo e-mail.",
  };
  return (
    mapa[code] ??
    "Não foi possível concluir o login. Tente de novo ou use outro método."
  );
}

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const erroCallback = useMemo(
    () => mensagemErroCallback(searchParams.get("error")),
    [searchParams],
  );

  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<Estado>(
    erroCallback
      ? { kind: "erro", mensagem: erroCallback }
      : { kind: "idle" },
  );

  async function entrarComGoogle() {
    setEstado({ kind: "enviando" });
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: callbackUrl,
      errorCallbackURL: `/login?error=oauth&callbackUrl=${encodeURIComponent(callbackUrl)}`,
    });
    if (error) {
      setEstado({
        kind: "erro",
        mensagem: error.message || "Falha ao iniciar login com Google.",
      });
    }
  }

  async function enviarMagicLink(e: FormEvent) {
    e.preventDefault();
    const destino = email.trim();
    if (!destino) {
      setEstado({ kind: "erro", mensagem: "Informe um e-mail válido." });
      return;
    }

    setEstado({ kind: "enviando" });
    const { error } = await authClient.signIn.magicLink({
      email: destino,
      callbackURL: callbackUrl,
      errorCallbackURL: `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`,
    });

    if (error) {
      setEstado({
        kind: "erro",
        mensagem: error.message || "Não foi possível enviar o link.",
      });
      return;
    }

    setEstado({ kind: "enviado", email: destino });
  }

  if (estado.kind === "enviado") {
    return (
      <div className="space-y-4">
        <div className="alert-ok" role="status">
          <p className="font-medium">Link enviado</p>
          <p className="mt-1">
            Enviamos um link para <strong>{estado.email}</strong>. Abra o e-mail
            e clique no link para entrar. O link expira em breve e só pode ser
            usado uma vez.
          </p>
        </div>
        <p className="text-xs text-zinc-500">
          Não chegou? Confira spam/lixo eletrônico ou aguarde um minuto e
          solicite de novo.
        </p>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setEstado({ kind: "idle" })}
        >
          Usar outro e-mail
        </button>
      </div>
    );
  }

  const ocupado = estado.kind === "enviando";

  return (
    <div className="space-y-6">
      {estado.kind === "erro" ? (
        <div className="alert-erro" role="alert">
          {estado.mensagem}
        </div>
      ) : null}

      {googleEnabled ? (
        <>
          <button
            type="button"
            className="btn-primary w-full gap-2"
            disabled={ocupado}
            onClick={() => void entrarComGoogle()}
          >
            <GoogleIcon />
            Entrar com Google
          </button>

          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <div className="h-px flex-1 bg-border" />
            ou continue com e-mail
            <div className="h-px flex-1 bg-border" />
          </div>
        </>
      ) : null}

      <form onSubmit={(e) => void enviarMagicLink(e)} className="space-y-3">
        <label className="block space-y-1.5">
          <span className="text-sm text-zinc-300">E-mail</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@email.com"
            className="input-base"
            disabled={ocupado}
          />
        </label>
        <button type="submit" className="btn-primary w-full" disabled={ocupado}>
          {ocupado ? "Enviando…" : "Enviar link de acesso"}
        </button>
      </form>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
