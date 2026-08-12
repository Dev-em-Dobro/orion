import { AppShellClient } from "@/components/app-shell-client";
import { SidebarWithStatus } from "@/components/sidebar-with-status";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AppShellClient sidebar={<SidebarWithStatus />}>{children}</AppShellClient>
  );
}
