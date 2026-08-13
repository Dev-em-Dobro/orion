"use client";

// F038 — copiar o conteúdo de uma Outreach do histórico.
//
// Existe porque o roteiro de ligação não tem "Abrir no WhatsApp": sem um botão
// de copiar, a única saída seria selecionar o texto na mão dentro do textarea.

import { useState } from "react";

export function CopiarButton({
  texto,
  rotulo = "Copiar texto",
}: {
  texto: string;
  rotulo?: string;
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  }

  return (
    <button type="button" onClick={() => void copiar()} className="btn-ghost">
      {copiado ? "Copiado" : rotulo}
    </button>
  );
}
