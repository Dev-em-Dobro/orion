"use client";

// F025 — dispara o aprofundamento em lotes e mostra o progresso.
// Spec: /specs/02-features/F025-fila-do-dia.md
//
// O laço vive aqui, no navegador: cada chamada é curta (3 Leads) e o aluno vê
// o que está acontecendo, com botão Parar. É o que substitui o worker que o
// ADR-002 não permite.

import { useCallback, useEffect, useRef, useState } from "react";
import { aprofundarLote } from "@/actions/leads/aprofundar";
import {
  APROFUNDAR_POR_COLETA,
  LOTE_APROFUNDAMENTO,
} from "@/lib/leads/aprofundamento";

type Estado = "parado" | "rodando" | "concluido";

export function AprofundarButton({
  /** Quantos Leads aprofundar antes de parar sozinho. */
  meta = APROFUNDAR_POR_COLETA,
  /** Dispara ao montar (usado logo depois da coleta). */
  automatico = false,
  rotulo = `Aprofundar próximos ${APROFUNDAR_POR_COLETA}`,
}: {
  meta?: number;
  automatico?: boolean;
  rotulo?: string;
}) {
  const [estado, setEstado] = useState<Estado>("parado");
  const [feitos, setFeitos] = useState(0);
  const [mensagem, setMensagem] = useState<string | null>(null);
  // Ref porque o laço é assíncrono: ler o state dentro dele veria o valor
  // congelado no início do ciclo.
  const pararRef = useRef(false);
  const rodouRef = useRef(false);

  const rodar = useCallback(async () => {
    setEstado("rodando");
    setMensagem(null);
    pararRef.current = false;
    let total = 0;

    while (total < meta && !pararRef.current) {
      const fd = new FormData();
      fd.set("limite", String(LOTE_APROFUNDAMENTO));
      const r = await aprofundarLote({ kind: "idle" }, fd);

      if (r.kind === "erro") {
        setMensagem(r.mensagem);
        break;
      }
      if (r.kind !== "ok") break;

      total += r.processados;
      setFeitos(total);

      if (
        r.limiteAtingido ||
        r.cotaEsgotada ||
        r.restantes === 0 ||
        r.processados === 0
      ) {
        setMensagem(r.mensagem);
        break;
      }
    }

    setEstado("concluido");
  }, [meta]);

  useEffect(() => {
    if (automatico && !rodouRef.current) {
      rodouRef.current = true;
      void rodar();
    }
  }, [automatico, rodar]);

  if (estado === "rodando") {
    const pct = Math.min(100, Math.round((feitos / meta) * 100));
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-300">
            Diagnosticando os melhores… {feitos}/{meta}
          </span>
          <button
            type="button"
            onClick={() => {
              pararRef.current = true;
            }}
            className="btn-ghost"
          >
            Parar
          </button>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => void rodar()} className="btn-ghost">
        {rotulo}
      </button>
      {estado === "concluido" && feitos > 0 && (
        <span className="text-xs text-emerald-400">
          {feitos} aprofundado(s).
        </span>
      )}
      {mensagem && <span className="text-xs text-zinc-400">{mensagem}</span>}
    </div>
  );
}
