import Link from "next/link";
import {
  LABEL_CHAVE,
  chavesEssenciaisFaltando,
  type TipoChave,
} from "@/lib/chaves";
import { requireTenant } from "@/lib/db/scoped";

/** Banner de onboarding quando faltam chaves essenciais (F016). */
export async function BannerChaves() {
  const { userId } = await requireTenant();
  const faltando = await chavesEssenciaisFaltando(userId);
  if (faltando.length === 0) return null;

  const nomes = faltando.map((t: TipoChave) => LABEL_CHAVE[t]).join(" e ");
  const precisaGoogle = faltando.includes("google");

  return (
    <div
      className="border-b border-amber-500/30 bg-amber-500/10 px-6 py-3 text-sm text-amber-100"
      role="status"
    >
      <p>
        Para começar, configure {nomes} em{" "}
        <Link
          href="/configuracao"
          className="font-semibold text-amber-50 underline underline-offset-2 hover:text-white"
        >
          Configuração
        </Link>
        .
        {precisaGoogle ? (
          <>
            {" "}
            Sem a chave Google, a coleta de Leads não roda.{" "}
            <Link
              href="/configuracao/tutorial-google"
              className="underline underline-offset-2 hover:text-white"
            >
              Como criar a chave Google →
            </Link>
          </>
        ) : null}
      </p>
    </div>
  );
}
