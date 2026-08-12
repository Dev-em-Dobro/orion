// F020 — entregáveis exigem compra Builders Club verificada (F019.1).

import { redirectSeCompraPendente } from "@/lib/compra/gate";

export default async function EntregaveisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await redirectSeCompraPendente();
  return children;
}
