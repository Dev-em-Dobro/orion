"use client";

import { usePathname } from "next/navigation";

export function AppShellClient({
  children,
  sidebar,
}: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
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
      <div className="md:pl-60">{children}</div>
    </>
  );
}
