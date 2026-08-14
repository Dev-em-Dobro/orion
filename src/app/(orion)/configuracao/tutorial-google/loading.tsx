import { DocumentoSkeleton } from "@/components/page-skeleton";

// Próprio, e não o herdado de `/configuracao`: `loading.tsx` desce pros
// segmentos filhos, então sem este arquivo o tutorial anunciava a forma dos
// cards de chave — quatro caixas de formulário pra uma página que é texto.
export default function Loading() {
  return <DocumentoSkeleton rotulo="Carregando tutorial" />;
}
