// F016 + F017 + F018 — Configuração BYOK / Orion + provedor de IA.

import type { Metadata } from "next";
import {
  byokDisponivel,
  chavesEssenciaisFaltando,
  listarVisaoChaves,
  obterModoChave,
} from "@/lib/chaves";
import { cookies } from "next/headers";
import { obterProviderLlm } from "@/lib/llm";
import { requireTenant } from "@/lib/db/scoped";
import { asTema, TEMA_COOKIE } from "@/lib/tema";
import { obterPerfilPublico } from "@/lib/ranking";
import { requireUser } from "@/lib/auth/require-user";
import { PerfilPublicoForm } from "./perfil-publico-form";
import { ChaveCard } from "./chave-card";
import { ModoChaveForm } from "./modo-chave-form";
import { OnboardingChaves } from "./onboarding-chaves";
import { ProviderLlmForm } from "./provider-llm-form";
import { TemaForm } from "./tema-form";

export const metadata: Metadata = { title: "Configuração" };

export const dynamic = "force-dynamic";

export default async function ConfiguracaoPage() {
  const { userId } = await requireTenant();
  const tema = asTema((await cookies()).get(TEMA_COOKIE)?.value);
  const user = await requireUser();
  const perfil = await obterPerfilPublico(userId, user.name ?? null);
  const [chaves, provider, faltando, modo] = await Promise.all([
    listarVisaoChaves(userId),
    obterProviderLlm(userId),
    chavesEssenciaisFaltando(userId),
    obterModoChave(userId),
  ]);
  const chavesVisiveis = chaves.filter((c) => c.tipo !== "screenshotone");
  const modoByok = modo === "byok";
  // F035 — com a flag desligada, só quem JÁ está em BYOK vê o seletor de modo
  // e os campos de chave. Para o resto, o Orion usa as chaves da plataforma e
  // não há o que configurar.
  const mostrarByok = byokDisponivel(modo);

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Configuração</h1>
      <p className="mt-1 text-sm text-muted">
        {modoByok
          ? "Modo BYOK: cole suas chaves de API. Elas ficam cifradas no banco."
          : "Modo Orion: use as chaves incluídas, com limites diários de uso."}
      </p>

      <div className="mt-8 space-y-4">
        {mostrarByok && <ModoChaveForm atual={modo} />}
        {mostrarByok && modoByok && (
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
        )}

        <PerfilPublicoForm
          optinAtual={perfil.optin}
          nomeAtual={perfil.nomeExibicao}
        />

        <TemaForm atual={tema} />
      </div>

      <p className="mt-8 text-xs text-muted">
        {modoByok
          ? "Essenciais no BYOK: Google (coleta + diagnóstico) e a chave do provedor de IA ativo."
          : "Limites diários no modo Orion: 5 coletas, 5 propostas, 5 abordagens e 20 mensagens no simulador."}{" "}
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
