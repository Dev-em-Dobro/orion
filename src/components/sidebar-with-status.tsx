// F031 / F035 — sidebar com o que muda por usuário: contador de cobranças
// vencidas e plano (pro cadeado dos itens pagos).
//
// Até 2026-08-11 isto também consultava a compra, pro cadeado do grupo
// Materiais. O grupo saiu do menu (F020), e com ele a consulta — que rodava em
// **toda** página. Nada de verificação se perde: quem chama
// `tentarAutoVerificar` é o gate das próprias rotas gateadas.

import { requireUser } from "@/lib/auth/require-user";
import { planoDoUsuario } from "@/lib/planos";
import { contarTarefas } from "@/lib/tarefas/consultar";
import { Sidebar } from "@/components/sidebar";
import type { Plano } from "@/lib/planos";

export async function SidebarWithStatus({
  /** F035 — medidor de uso, renderizado no cabeçalho do mobile. */
  medidor,
}: {
  medidor?: React.ReactNode;
} = {}) {
  let tarefasVencidas = 0;
  let plano: Plano = "free";

  try {
    const user = await requireUser();
    // Falha aqui não pode derrubar a sidebar inteira: sem contador e no plano
    // mais restrito é melhor que sem navegação.
    //
    // `Promise.all` e não dois `await` em fila: uma consulta não depende da
    // outra, e a sidebar roda em TODA página. Em sequência isso custava dois
    // ida-e-volta de banco antes do primeiro byte — sem efeito perceptível
    // contra o Postgres local (~1 ms), mas ~70 ms contra o Neon.
    [tarefasVencidas, plano] = await Promise.all([
      contarTarefas(user.id).catch(() => 0),
      planoDoUsuario(user.id).catch((): Plano => "free"),
    ]);
  } catch {
    // Sem sessão: sidebar padrão. O middleware já cuida do redirect.
  }

  return (
    <Sidebar
      tarefasVencidas={tarefasVencidas}
      plano={plano}
      medidor={medidor}
    />
  );
}
