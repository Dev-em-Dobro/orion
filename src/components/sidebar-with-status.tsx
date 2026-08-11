// F019.1 / F020 — sidebar com estado de compra para gate visual dos Materiais.

import { requireUser } from "@/lib/auth/require-user";
import { statusCompra, tentarAutoVerificar } from "@/lib/compra";
import { contarTarefas } from "@/lib/tarefas/consultar";
import { Sidebar } from "@/components/sidebar";

export async function SidebarWithStatus() {
  let materiaisLiberados = false;
  let tarefasVencidas = 0;

  try {
    const user = await requireUser();
    await tentarAutoVerificar(user.id);
    const status = await statusCompra(user.id);
    materiaisLiberados = status.verificada;
    // F031 — badge de cobranças vencidas. Falha aqui não pode derrubar a
    // sidebar inteira: sem contador é melhor que sem navegação.
    tarefasVencidas = await contarTarefas(user.id).catch(() => 0);
  } catch {
    materiaisLiberados = false;
  }

  return (
    <Sidebar
      materiaisLiberados={materiaisLiberados}
      tarefasVencidas={tarefasVencidas}
    />
  );
}
