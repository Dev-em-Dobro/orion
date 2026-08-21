// Ícone de informação com balão de explicação.
// Spec: /specs/02-features/F025-fila-do-dia.md (emenda 2026-08-13)
//
// CSS puro: `group-hover` cobre o mouse e `group-focus-within` cobre teclado e
// toque, onde hover não existe. Sem estado, sem `"use client"` — funciona
// dentro de Server Component. **Sem lib nova, sem ADR.**
//
// Não é `title=`: o tooltip nativo abre ~1s depois, some sozinho, não quebra
// linha, não estiliza e não existe no toque.
//
// O texto vai inteiro no `aria-label` do gatilho e o balão é `aria-hidden`.
// Fonte única, e o leitor de tela recebe a explicação sem depender de o balão
// estar aberto (o par `aria-describedby` + `id` exigiria um id único por
// instância, e `useId` obrigaria o componente a virar client).

import { IconeInfo } from "@/components/icones";

export function Dica({
  titulo,
  texto,
  className = "",
}: {
  /** Pergunta curta no topo do balão. Ex.: "O que é aprofundar?" */
  titulo: string;
  /** A explicação. Texto puro: balão é pra ler, não pra formatar. */
  texto: string;
  className?: string;
}) {
  return (
    <span className={`group relative inline-flex ${className}`}>
      <button
        type="button"
        aria-label={`${titulo} ${texto}`}
        className="inline-flex h-6 w-6 cursor-help items-center justify-center rounded-full text-muted transition-colors duration-200 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <IconeInfo className="h-4 w-4" />
      </button>

      {/* `absolute` + `pointer-events-none`: não empurra o layout ao abrir e
          não intercepta clique no que estiver embaixo. `right-0` ancora pela
          direita porque o gatilho fica na ponta direita do cabeçalho — pela
          esquerda o balão sairia do card. */}
      <span
        aria-hidden="true"
        className="pointer-events-none invisible absolute top-full right-0 z-20 mt-2 w-64 rounded-lg border border-border bg-card-raised p-3 text-xs leading-relaxed text-zinc-300 opacity-0 shadow-lg transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
      >
        <span className="block font-semibold text-zinc-100">{titulo}</span>
        <span className="mt-1 block">{texto}</span>
      </span>
    </span>
  );
}
