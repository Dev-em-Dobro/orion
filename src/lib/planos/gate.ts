// F035 — gate de recurso por plano.
// Spec: /specs/02-features/F035-planos-e-limites.md ("Gate de feature")
//
// Esconder botão não é gate. Toda Server Action e todo route handler de
// recurso pago chama `exigirRecurso` no servidor; a UI só decide se mostra
// cadeado ou botão.

import { redirect } from "next/navigation";
import { temRecurso, type Recurso } from "./catalogo";
import { RecursoDoPlanoError } from "./erros";
import { planoDoUsuario } from "./resolver";

export async function podeUsar(
  userId: string,
  recurso: Recurso,
): Promise<boolean> {
  return temRecurso(await planoDoUsuario(userId), recurso);
}

/** Lança `RecursoDoPlanoError` — vira mensagem de UI via `mensagemEscopo`. */
export async function exigirRecurso(
  userId: string,
  recurso: Recurso,
): Promise<void> {
  const plano = await planoDoUsuario(userId);
  if (!temRecurso(plano, recurso)) {
    throw new RecursoDoPlanoError(recurso, plano);
  }
}

/**
 * Versão para páginas: manda pra `/planos` com o recurso na query, pra a
 * página explicar **o que** o aluno tentou abrir. Mesmo padrão do
 * `redirectSeCompraPendente` da F019.1.
 */
export async function redirectSeRecursoBloqueado(
  userId: string,
  recurso: Recurso,
): Promise<void> {
  if (!(await podeUsar(userId, recurso))) {
    redirect(`/planos?recurso=${recurso}`);
  }
}
