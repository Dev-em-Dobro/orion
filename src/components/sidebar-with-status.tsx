// F019.1 / F020 — sidebar com estado de compra para gate visual dos Materiais.

import { requireUser } from "@/lib/auth/require-user";
import { statusCompra, tentarAutoVerificar } from "@/lib/compra";
import { Sidebar } from "@/components/sidebar";

export async function SidebarWithStatus() {
  let materiaisLiberados = false;

  try {
    const user = await requireUser();
    await tentarAutoVerificar(user.id);
    const status = await statusCompra(user.id);
    materiaisLiberados = status.verificada;
  } catch {
    materiaisLiberados = false;
  }

  return <Sidebar materiaisLiberados={materiaisLiberados} />;
}
