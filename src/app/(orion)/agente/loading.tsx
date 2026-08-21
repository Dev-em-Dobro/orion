import { RotaSkeleton } from "@/components/page-skeleton";

// `media` = o `max-w-3xl` da própria `/agente`.
export default function Loading() {
  return <RotaSkeleton largura="media" blocos={2} rotulo="Carregando agente" />;
}
