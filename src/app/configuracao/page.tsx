// F016 + F017 — Configuração BYOK + provedor de IA + onboarding (UI beta).

import { chavesEssenciaisFaltando, listarVisaoChaves } from "@/lib/chaves";
import { obterProviderLlm } from "@/lib/llm";
import { requireTenant } from "@/lib/db/scoped";
import { AvisoScreenshotOne } from "./aviso-screenshotone";
import { ChaveCard } from "./chave-card";
import { OnboardingChaves } from "./onboarding-chaves";
import { ProviderLlmForm } from "./provider-llm-form";

export const dynamic = "force-dynamic";

export default async function ConfiguracaoPage() {
  const { userId } = await requireTenant();
  const [chaves, provider, faltando] = await Promise.all([
    listarVisaoChaves(userId),
    obterProviderLlm(userId),
    chavesEssenciaisFaltando(userId),
  ]);

  const serverless =
    Boolean(process.env.VERCEL) || process.env.NODE_ENV === "production";
  const screenshot = chaves.find((c) => c.tipo === "screenshotone");

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Configuração</h1>
      <p className="mt-1 text-sm text-muted">
        Cole as suas chaves de API e escolha o provedor de IA. Elas ficam
        cifradas no banco; o valor em claro nunca volta pra tela.
      </p>

      <div className="mt-8 space-y-4">
        <OnboardingChaves
          chaves={chaves}
          faltando={faltando}
          provider={provider}
        />
        <AvisoScreenshotOne
          screenshot={screenshot}
          obrigatorioEmProd={serverless}
        />
        <ProviderLlmForm atual={provider} />
        {chaves.map((c) => (
          <ChaveCard key={c.tipo} inicial={c} />
        ))}
      </div>

      <p className="mt-8 text-xs text-zinc-500">
        Essenciais: Google (coleta + diagnóstico) e a chave do provedor de IA
        ativo. ScreenshotOne é opcional em local; em produção serverless
        (Vercel), necessária pro Diagnóstico UX — ver{" "}
        <a href="/termos" className="underline underline-offset-2">
          Termos
        </a>{" "}
        e{" "}
        <a href="/privacidade" className="underline underline-offset-2">
          Privacidade
        </a>
        .
      </p>
    </main>
  );
}
