"use client";

import { usePathname } from "next/navigation";

export function AppShellClient({
  children,
  sidebar,
  medidor,
}: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  /** F035 — medidor de uso da topbar (desktop). No mobile ele vai no header
   *  do próprio `Sidebar`, que já existe ali. */
  medidor?: React.ReactNode;
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
      <div className="md:pl-60">
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
