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
    // F032 (tema claro) — o hover é **opacidade**, não outra cor. Era
    // `hover:text-white`: no escuro clareava um texto quase branco, no claro
    // pintava de branco um texto que precisa ser escuro e o link desaparecia
    // no fundo. Trocar por outro degrau da escala âmbar também não serve, já
    // que a inversão do tema troca a direção de "mais claro". Opacidade lê
    // como mudança de estado nos dois.
    <div
      className="border-b border-amber-500/30 bg-amber-500/10 px-6 py-3 text-sm text-amber-100"
      role="status"
    >
      <p>
        Para começar, configure {nomes} em{" "}
        <Link
          href="/configuracao"
          className="font-semibold text-amber-50 underline underline-offset-2 transition-opacity hover:opacity-80"
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
              className="underline underline-offset-2 transition-opacity hover:opacity-80"
            >
              Como criar a chave Google →
            </Link>
          </>
        ) : null}
      </p>
    </div>
  );
}
