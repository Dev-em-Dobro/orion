// F019.1 — ativação de acesso Builders Club pós-login.

import { NOME_PRODUTO_PARTES } from "@/lib/produto";
import { requireUser } from "@/lib/auth/require-user";
import { statusCompra, tentarAutoVerificar, urlCheckoutBuildersClub } from "@/lib/compra";
import { redirect } from "next/navigation";
import { AtivarAcessoForm } from "./ativar-form";

export const dynamic = "force-dynamic";

export default async function AtivarAcessoPage() {
  const user = await requireUser();

  await tentarAutoVerificar(user.id);
  const status = await statusCompra(user.id);
  if (status.verificada) {
    redirect("/");
  }

  const checkoutUrl = urlCheckoutBuildersClub();

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(34,197,94,0.18),transparent_55%)]"
      />

      <div className="relative w-full max-w-md space-y-8">
        <div className="space-y-3 text-center">
          <p className="text-3xl font-bold tracking-tight sm:text-4xl">
            {NOME_PRODUTO_PARTES.primaria}{" "}
            <span className="text-primary">{NOME_PRODUTO_PARTES.secundaria}</span>
          </p>
          <h1 className="text-lg font-medium text-zinc-200">
            Ative seu acesso ao Builders Club
          </h1>
          <p className="text-sm text-zinc-500">
            Confirme o e-mail usado na compra para liberar o Orion.
          </p>
        </div>

        <div className="card border-zinc-800/80">
          <AtivarAcessoForm
            emailLogin={user.email}
            emailCompra={status.purchaseEmail}
            checkoutUrl={checkoutUrl}
          />

          <div className="mt-6 space-y-2 border-t border-zinc-800 pt-4 text-xs text-zinc-500">
            <p>
              Comprou agora? Aguarde alguns minutos e clique em{" "}
              <strong className="text-zinc-400">Verificar compra</strong> de
              novo — o webhook da Hubla pode levar um instante.
            </p>
            <p>
              Problemas? Confira se o e-mail é o mesmo da nota fiscal / checkout
              Hubla ou fale com o suporte Dev em Dobro.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
