"use client";

import { usePathname } from "next/navigation";

export function AppShellClient({
  children,
  sidebar,
  medidor,
  classeTema,
}: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  /** F035 — medidor de uso da topbar (desktop). No mobile ele vai no header
   *  do próprio `Sidebar`, que já existe ali. */
  medidor?: React.ReactNode;
  /** F032 — `tema-claro` ou vazio, decidido no servidor pelo cookie. */
  classeTema?: string;
}) {
  const pathname = usePathname();
  const semChrome =
    pathname === "/login" ||
    pathname === "/ativar-acesso" ||
    pathname === "/termos" ||
    pathname === "/privacidade";

  if (semChrome) {
    return <>{children}</>;
  }

  return (
    <>
      {sidebar}
      {/* O tema veste a **coluna de conteúdo**, não o `<html>`: a sidebar
          escura é parte da referência do tema claro, não um pedaço que ficou
          pra trás. `min-h-svh` é o que garante o fundo claro até o rodapé
          quando a página é curta — sem isso o `body` escuro aparecia embaixo.

          A topbar entra junto porque ela mora nesta coluna: barra escura
          colada num conteúdo claro era uma costura no meio da tela. */}
      <div className={`${classeTema ?? ""} min-h-svh md:pl-60`}>
        {/* Topbar do desktop: mesma altura da faixa da marca na sidebar, pra
            as duas linhas fecharem. z abaixo da sidebar (z-40) e do drawer. */}
        <header className="sticky top-0 z-30 hidden h-14 items-center justify-end gap-3 border-b border-border bg-background/95 px-6 backdrop-blur md:flex lg:px-8">
          {medidor}
        </header>
        {children}
      </div>
    </>
  );
}
