// Grupo de rotas autenticadas do Orion (sem gate de compra global).

import { redirect } from "next/navigation";
import { AuthError } from "@/lib/auth/errors";
import { requireUser } from "@/lib/auth/require-user";

export default async function OrionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // F014 AC10 — o middleware só verifica que o cookie **existe**; validar
  // sessão no edge custaria uma consulta por requisição. Quem valida é o
  // `requireUser()`, e sem este catch o lançamento dele virava tela de erro
  // 500 em vez de mandar o aluno de volta pro login.
  //
  // O gate resolve **antes** de qualquer JSX: dentro de um <Suspense> o
  // redirect chegaria depois do shell e o status já teria sido commitado como
  // 200 (mesma armadilha de streaming da F028).
  //
  // Custo zero: `requireUser` é memoizado por request (F028 H5), então esta
  // chamada é a mesma que as páginas fazem depois.
  try {
    await requireUser();
  } catch (e) {
    if (e instanceof AuthError) {
      // Apagar o cookie é obrigatório: só redirecionar faria loop, porque o
      // middleware manda `/login` de volta pra `/` enquanto houver cookie.
      redirect("/api/auth/sessao-invalida");
    }
    throw e;
  }

  return children;
}
