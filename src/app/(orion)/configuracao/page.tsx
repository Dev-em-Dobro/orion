// F016 + F017 + F018 — Configuração BYOK / Orion + provedor de IA.

import {
  chavesEssenciaisFaltando,
  listarVisaoChaves,
  obterModoChave,
} from "@/lib/chaves";
import { obterProviderLlm } from "@/lib/llm";
import { requireTenant } from "@/lib/db/scoped";
import { ChaveCard } from "./chave-card";
import { ModoChaveForm } from "./modo-chave-form";
import { OnboardingChaves } from "./onboarding-chaves";
import { ProviderLlmForm } from "./provider-llm-form";

export const dynamic = "force-dynamic";

export default async function ConfiguracaoPage() {
  const { userId } = await requireTenant();
  const [chaves, provider, faltando, modo] = await Promise.all([
    listarVisaoChaves(userId),
    obterProviderLlm(userId),
    chavesEssenciaisFaltando(userId),
    obterModoChave(userId),
  ]);
  const chavesVisiveis = chaves.filter((c) => c.tipo !== "screenshotone");
  const modoByok = modo === "byok";

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Configuração</h1>
      <p className="mt-1 text-sm text-muted">
        {modoByok
          ? "Modo BYOK: cole suas chaves de API. Elas ficam cifradas no banco."
          : "Modo Orion: use as chaves incluídas, com limites diários de uso."}
      </p>

      <div className="mt-8 space-y-4">
        <ModoChaveForm atual={modo} />
        {modoByok ? (
          <>
            <OnboardingChaves
              chaves={chaves}
              faltando={faltando}
              provider={provider}
            />
            <ProviderLlmForm atual={provider} />
            {chavesVisiveis.map((c) => (
              <ChaveCard key={c.tipo} inicial={c} />
            ))}
          </>
        ) : (
          <section className="card">
            <h2 className="text-sm font-semibold text-zinc-100">
              Chaves incluídas
            </h2>
            <p className="mt-2 text-sm text-muted">
              Google Places (coleta) e <strong className="text-zinc-300">OpenAI</strong>{" "}
              (Outreach, proposta, simulador…) vêm da Orion.{" "}
              <strong className="text-zinc-300">Gemini não entra no modo Orion</strong>
              — para usar sua chave Gemini: ative BYOK, escolha Gemini como
              provedor e salve/teste a chave abaixo.
            </p>
          </section>
        )}
      </div>

      <p className="mt-8 text-xs text-zinc-500">
        {modoByok
          ? "Essenciais no BYOK: Google (coleta + diagnóstico) e a chave do provedor de IA ativo."
          : "Limites diários no modo Orion: 5 coletas, 5 propostas, 5 outreaches e 20 mensagens no simulador."}{" "}
        Ver{" "}
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
