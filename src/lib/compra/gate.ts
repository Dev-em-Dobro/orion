// F019.1 — redirect de layout para usuários sem compra verificada.

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { usuarioTemCompraVerificada } from "./servico";

export async function redirectSeCompraPendente(): Promise<void> {
  const user = await requireUser();
  const ok = await usuarioTemCompraVerificada(user.id);
  if (!ok) {
    redirect("/ativar-acesso");
  }
}
