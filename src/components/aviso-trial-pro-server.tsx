// F035 — decide se o aviso de trial Pro entra no shell (AC27).
// Spec: /specs/02-features/F035-planos-e-limites.md

import { requireUser } from "@/lib/auth/require-user";
import { planoDoUsuario } from "@/lib/planos";
import { fimCortesiaProDoUsuario } from "@/lib/planos/cortesia-pro";
import {
  TRIAL_PRO_FIM_ISO,
  rotuloDuracaoCortesia,
  rotuloFimTrialPro,
  trialProAtivoNoAmbiente,
} from "@/lib/planos/trial";
import { AvisoTrialProCliente } from "./aviso-trial-pro";

export async function AvisoTrialPro() {
  if (!trialProAtivoNoAmbiente()) return null;

  try {
    const user = await requireUser();
    const plano = await planoDoUsuario(user.id);
    if (plano !== "pro") return null;
    const fimIso =
      (await fimCortesiaProDoUsuario(user.id)) ?? TRIAL_PRO_FIM_ISO;
    return (
      <AvisoTrialProCliente
        duracao={rotuloDuracaoCortesia()}
        fimRotulo={rotuloFimTrialPro(fimIso)}
      />
    );
  } catch {
    return null;
  }
}
