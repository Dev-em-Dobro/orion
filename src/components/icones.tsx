// Ícones de UI. SVG, nunca emoji: emoji muda de desenho por sistema
// operacional, não herda `currentColor` e não aceita `aria-hidden` de forma
// confiável — o leitor de tela lê "cadeado fechado" no meio de um botão.
//
// `viewBox` fixo em 24 e tamanho pela classe: o chamador decide, e não dá pra
// um ícone sair de escala em relação ao vizinho.

export function Icone({
  d,
  className = "h-4 w-4",
}: {
  d: React.ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      {d}
    </svg>
  );
}

/** Gatilho da `Dica` (F025 emenda 2026-08-13). */
export function IconeInfo({ className }: { className?: string }) {
  return (
    <Icone
      className={className}
      d={
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 16v-4" />
          {/* Ponto do "i": traço de comprimento zero com ponta redonda. */}
          <path d="M12 8h.01" />
        </>
      }
    />
  );
}

/** F039 — passo já feito no tutorial. */
export function IconeCheck({ className }: { className?: string }) {
  return <Icone className={className} d={<path d="m4 12 5 5L20 6" />} />;
}

/** F039 — gatilho dos Primeiros passos: a bússola de "por onde eu começo". */
export function IconeBussola({ className }: { className?: string }) {
  return (
    <Icone
      className={className}
      d={
        <>
          <circle cx="12" cy="12" r="9" />
          {/* Ponteiro: o losango da rosa dos ventos, apontando pro nordeste. */}
          <path d="m15.5 8.5-2 5-5 2 2-5z" />
        </>
      }
    />
  );
}

/** F040 — gatilho do Tour do menu: a placa de "onde fica o quê". */
export function IconeMapa({ className }: { className?: string }) {
  return (
    <Icone
      className={className}
      d={
        <>
          {/* Poste, e duas placas apontando pra lados opostos. */}
          <path d="M12 3v18" />
          <path d="M12 5h6l2 2.5L18 10h-6z" />
          <path d="M12 13H6l-2 2.5L6 18h6z" />
        </>
      }
    />
  );
}

/** F035 — recurso fora do plano. Nunca 🔒. */
export function IconeCadeado({ className }: { className?: string }) {
  return (
    <Icone
      className={className}
      d={
        <>
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </>
      }
    />
  );
}
