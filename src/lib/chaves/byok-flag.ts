// F035 (2026-08-13) — fim do BYOK para novos alunos.
// Spec: /specs/02-features/F035-planos-e-limites.md ("Fim do BYOK")
//
// Feature flag, não remoção de código: quem já configurou as próprias chaves
// continua funcionando, e reabrir pra todo mundo é mudar uma env — sem deploy.
//
//   BYOK_NOVOS_ALUNOS=1  → o modo BYOK aparece pra todo mundo (comportamento antigo)
//   qualquer outro valor → só quem **já está** em BYOK continua vendo

import type { KeyMode } from "@prisma/client";

/** A flag global. Desligada por padrão desde 2026-08-13. */
export function byokAbertoParaNovos(): boolean {
  return process.env.BYOK_NOVOS_ALUNOS?.trim() === "1";
}

/**
 * Este aluno pode usar/ver BYOK?
 *
 * Grandfathering: com a flag desligada, quem tem `key_mode = "byok"` continua
 * podendo gerenciar as chaves dele. Desligar por baixo quebraria quem depende
 * disso hoje — e a chave é dele, não nossa.
 */
export function byokDisponivel(modoAtual: KeyMode): boolean {
  return byokAbertoParaNovos() || modoAtual === "byok";
}

/**
 * Uma vez fora do BYOK, com a flag desligada, não dá pra voltar. A UI precisa
 * avisar isso **antes** da troca, senão o aluno perde o acesso sem entender.
 */
export function trocaEhIrreversivel(modoAtual: KeyMode): boolean {
  return modoAtual === "byok" && !byokAbertoParaNovos();
}
