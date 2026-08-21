"use client";

// F035 — aviso do free trial Pro (3 meses). Spec AC27.
// Dismissível via localStorage: o aluno fecha uma vez e não vê de novo neste
// browser. Sem cookie no servidor — o banner não é crítico pro HTML inicial.

import { useEffect, useState } from "react";
import {
  TRIAL_PRO_MESES,
  rotuloFimTrialPro,
} from "@/lib/planos/trial";

const STORAGE_KEY = "orion-aviso-trial-pro-2026-11";

export function AvisoTrialProCliente() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      // localStorage bloqueado: mostra o aviso mesmo assim.
    }
    setVisivel(true);
  }, []);

  if (!visivel) return null;

  function fechar() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Sem persistir: some só nesta sessão de página.
    }
    setVisivel(false);
  }

  return (
    <div
      role="status"
      className="border-b border-primary/25 bg-primary/10 px-4 py-2.5 text-sm text-foreground md:px-6 lg:px-8"
    >
      <div className="flex items-start justify-between gap-3">
        <p>
          <span className="font-medium text-primary">Free trial · PRO</span>
          {" — "}
          você tem {TRIAL_PRO_MESES} meses de acesso liberado ao Pro (até{" "}
          {rotuloFimTrialPro()}). Inclui o teto de 300 Leads novos por mês.
        </p>
        <button
          type="button"
          onClick={fechar}
          className="shrink-0 rounded px-2 py-0.5 text-xs font-medium text-muted transition-colors hover:bg-card-raised hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-label="Fechar aviso do free trial"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
