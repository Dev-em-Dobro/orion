// F030 — mesmo gate dos Materiais (F019.1): Skills exigem compra verificada.

import { redirectSeCompraPendente } from "@/lib/compra/gate";

export default async function SkillsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await redirectSeCompraPendente();
  return children;
}
