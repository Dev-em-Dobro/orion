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

export async function SidebarWithStatus() {
  let tarefasVencidas = 0;
  let plano: Plano = "free";

  try {
    const user = await requireUser();
    // Falha aqui não pode derrubar a sidebar inteira: sem contador e no plano
    // mais restrito é melhor que sem navegação.
    tarefasVencidas = await contarTarefas(user.id).catch(() => 0);
    plano = await planoDoUsuario(user.id).catch((): Plano => "free");
  } catch {
    // Sem sessão: sidebar padrão. O middleware já cuida do redirect.
  }

  return <Sidebar tarefasVencidas={tarefasVencidas} plano={plano} />;
}
