import { cookies } from "next/headers";
import { Suspense } from "react";
import { AppShellClient } from "@/components/app-shell-client";
import { MedidorUso } from "@/components/medidor-uso";
import { SidebarWithStatus } from "@/components/sidebar-with-status";
import { asTema, classeDoTema, TEMA_COOKIE } from "@/lib/tema";

/**
 * Espaço reservado do medidor enquanto ele carrega.
 *
 * O medidor é um `async` que consulta plano e uso — duas consultas, e ele mora
 * no shell, logo TODA página esperava por elas antes do primeiro byte. Medido
 * contra um banco com latência de hospedado (35 ms/ida-e-volta), o piso de
 * TTFB de qualquer rota era ~250 ms, incluindo telas que não consultam nada.
 *
 * O `<Suspense>` tira essa espera do caminho crítico. O placeholder tem a
 * altura e a largura do medidor pronto, então nada se mexe quando ele chega —
 * o custo de trocar bloqueio por streaming aqui é zero de layout shift.
 */
function MedidorPlaceholder() {
  return <span className="inline-block h-11 w-32" aria-hidden />;
}

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
  const medidor = (
    <Suspense fallback={<MedidorPlaceholder />}>
      <MedidorUso />
    </Suspense>
  );

  return (
    <AppShellClient
      classeTema={classeDoTema(tema)}
      sidebar={<SidebarWithStatus medidor={medidor} />}
      medidor={medidor}
    >
      {children}
    </AppShellClient>
  );
}
