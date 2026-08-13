import { AppShellClient } from "@/components/app-shell-client";
import { MedidorUso } from "@/components/medidor-uso";
import { SidebarWithStatus } from "@/components/sidebar-with-status";

export function AppShell({ children }: { children: React.ReactNode }) {
  // F035 — o mesmo medidor nos dois cabeçalhos (desktop e mobile); só um
  // aparece por viewport, e a consulta é memoizada por request.
  return (
    <AppShellClient
      sidebar={<SidebarWithStatus medidor={<MedidorUso />} />}
      medidor={<MedidorUso />}
    >
      {children}
    </AppShellClient>
  );
}
