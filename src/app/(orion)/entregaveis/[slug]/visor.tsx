"use client";

// F020 — visor do entregável.
//
// Esta rota é a única do app que não tem o que suspender: o `page.tsx` não faz
// E/S nenhuma (o catálogo é um módulo), então `loading.tsx` e `<Suspense>` não
// teriam o que esperar. Só que a espera existe do mesmo jeito — ela está no
// `<iframe>`, que baixa um bundle inteiro de material. Sem isto o aluno ficava
// olhando um retângulo vazio sem saber se travou.
//
// `onLoad` do próprio iframe, e não um timer: o esqueleto sai quando o
// conteúdo chega, não quando o relógio acha que devia ter chegado.

import { useState } from "react";
import { SkeletonPulse } from "@/components/page-skeleton";

export function Visor({ src, titulo }: { src: string; titulo: string }) {
  const [carregado, setCarregado] = useState(false);

  return (
    <div className="relative min-h-0 flex-1">
      {!carregado && (
        <div
          className="absolute inset-0 space-y-4 overflow-hidden p-6"
          aria-busy="true"
          aria-label={`Carregando ${titulo}`}
        >
          <SkeletonPulse className="h-8 w-64 max-w-full" />
          <SkeletonPulse className="h-4 w-96 max-w-full" />
          <SkeletonPulse className="h-64 w-full" />
          <SkeletonPulse className="h-32 w-full" />
        </div>
      )}
      <iframe
        src={src}
        title={titulo}
        onLoad={() => setCarregado(true)}
        // `bg-[#0b0d10]` é a cor do próprio material, que tem tema escuro
        // próprio — não é token do Orion e por isso não segue o tema claro.
        // Só aparece depois do load pra não piscar preto sobre o esqueleto.
        className={`h-full w-full border-0 transition-opacity duration-200 ${
          carregado ? "bg-[#0b0d10] opacity-100" : "opacity-0"
        }`}
        sandbox="allow-scripts allow-downloads allow-popups"
      />
    </div>
  );
}
