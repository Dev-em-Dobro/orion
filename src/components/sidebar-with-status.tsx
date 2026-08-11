// F019.1 / F020 — sidebar com estado de compra para gate visual dos Materiais.
// F035 — e com o plano, para o cadeado dos itens de plano pago.

import { requireUser } from "@/lib/auth/require-user";
import { statusCompra, tentarAutoVerificar } from "@/lib/compra";
import { planoDoUsuario } from "@/lib/planos";
import { contarTarefas } from "@/lib/tarefas/consultar";
import { Sidebar } from "@/components/sidebar";
import type { Plano } from "@/lib/planos";

export async function SidebarWithStatus() {
  let materiaisLiberados = false;
  let tarefasVencidas = 0;
  let plano: Plano = "free";

  try {
    const user = await requireUser();
    await tentarAutoVerificar(user.id);
    const status = await statusCompra(user.id);
    materiaisLiberados = status.verificada;
    // Falha aqui não pode derrubar a sidebar inteira: sem contador e no plano
    // mais restrito é melhor que sem navegação.
    tarefasVencidas = await contarTarefas(user.id).catch(() => 0);
    plano = await planoDoUsuario(user.id).catch((): Plano => "free");
  } catch {
    materiaisLiberados = false;
  }

  return (
    <Sidebar
      materiaisLiberados={materiaisLiberados}
      tarefasVencidas={tarefasVencidas}
      plano={plano}
    />
  );
}
