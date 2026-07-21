"use client";

// Shell do app: sidebar nas rotas autenticadas; login sem chrome.

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const semChrome =
    pathname === "/login" ||
    pathname === "/termos" ||
    pathname === "/privacidade";

  if (semChrome) {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar />
      <div className="md:pl-60">{children}</div>
    </>
  );
}
