import { cookies } from "next/headers";
import { AppShellClient } from "@/components/app-shell-client";
import { MedidorUso } from "@/components/medidor-uso";
import { SidebarWithStatus } from "@/components/sidebar-with-status";
import { asTema, classeDoTema, TEMA_COOKIE } from "@/lib/tema";

export async function AppShell({ children }: { children: React.ReactNode }) {
  // Tema lido no servidor: o cookie chega junto com o request, então o HTML já
  // sai na cor certa — sem o flash de trocar de tema depois da hidratação.
  //
  // Aqui e não em cada página: o `loading.tsx` é **irmão** do `page.tsx`, não
  // descendente dele. Com a classe no `<main>` da página, o esqueleto de cada
  // rota pintava sempre no tema escuro e a página chegava clara logo em
  // seguida — um flash por clique no menu.
  const tema = asTema((await cookies()).get(TEMA_COOKIE)?.value);

  // F035 — o mesmo medidor nos dois cabeçalhos (desktop e mobile); só um
  // aparece por viewport, e a consulta é memoizada por request.
  return (
    <AppShellClient
      classeTema={classeDoTema(tema)}
      sidebar={<SidebarWithStatus medidor={<MedidorUso />} />}
      medidor={<MedidorUso />}
    >
      {children}
    </AppShellClient>
  );
}
