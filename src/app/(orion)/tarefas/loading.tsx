import { RotaSkeleton } from "@/components/page-skeleton";

// `larga` = o `max-w-4xl` da própria `/tarefas`.
export default function Loading() {
  return <RotaSkeleton largura="larga" rotulo="Carregando tarefas" />;
}
