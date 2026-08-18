// F016 (2026-08-17) — fim do BYOK, agora para todos.
// Spec: /specs/02-features/F016-configuracao-de-chaves.md ("Encerramento")
//
// Histórico: em 2026-08-13 a F035 fechou o BYOK só para **novos** alunos, e
// quem já tinha chave continuou (grandfathering). Isso acabou: o modelo de
// plano não fecha com dois tipos de aluno — um que custa por volume e outro que
// não custa nada. Agora é um caminho só, com as chaves da plataforma, e quem
// precisa de mais volume sobe de plano.
//
// Feature flag, não remoção de código (mesmo padrão do `PLANOS_NA_UI`):
//
//   BYOK_NOVOS_ALUNOS=1  → o modo BYOK volta pra todo mundo
//   qualquer outro valor → não existe BYOK, pra ninguém
//
// A flag devolve a **tela**; não devolve as **chaves**, que a migração de
// 2026-08-17 apagou. Reabrindo, cada aluno cola a dele de novo.

/** A flag global. Desligada por padrão desde 2026-08-13. */
export function byokAbertoParaNovos(): boolean {
  return process.env.BYOK_NOVOS_ALUNOS?.trim() === "1";
}

/**
 * Existe BYOK pra este aluno?
 *
 * Não recebe mais o `key_mode`: desde 2026-08-17 a resposta não depende de quem
 * pergunta. O grandfathering morreu aqui — era ele que fazia esta função ter
 * argumento.
 */
export function byokDisponivel(): boolean {
  return byokAbertoParaNovos();
}
