// F035 — decide se o aviso de trial Pro entra no shell (AC27).
// Spec: /specs/02-features/F035-planos-e-limites.md

import { requireUser } from "@/lib/auth/require-user";
import { planoDoUsuario } from "@/lib/planos";
import { trialProAtivoNoAmbiente } from "@/lib/planos/trial";
import { AvisoTrialProCliente } from "./aviso-trial-pro";

export async function AvisoTrialPro() {
  if (!trialProAtivoNoAmbiente()) return null;

  try {
    const user = await requireUser();
    const plano = await planoDoUsuario(user.id);
    if (plano !== "pro") return null;
  } catch {
    return null;
  }

  return <AvisoTrialProCliente />;
}
