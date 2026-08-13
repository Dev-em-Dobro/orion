"use client";

// F035 — a parte interativa do medidor: botão fechado + popover.
// Spec: /specs/02-features/F035-planos-e-limites.md ("Medidor de uso")

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type ItemMensal = {
  operacao: string;
  label: string;
  usado: number;
  limite: number;
};

/** A partir daqui o medidor muda de cor e oferece o upgrade (F035). */
const AVISO = 0.8;

function corDaBarra(fracao: number, estourado: boolean): string {
  if (estourado) return "bg-red-500";
  return fracao >= AVISO ? "bg-amber-400" : "bg-primary";
}

export function MedidorUsoCliente({
  usado,
  limite,
  fracao,
  restante,
  planoNome,
  mensal,
  className,
}: {
  usado: number;
  limite: number;
  fracao: number;
  restante: number;
  planoNome: string;
  mensal: ItemMensal[];
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  const estourado = restante === 0;
  const alerta = fracao >= AVISO;
  const cor = corDaBarra(fracao, estourado);
  const pct = Math.round(fracao * 100);

  // Escape e clique fora fecham. Sem isso o popover fica preso aberto pra quem
  // navega por teclado.
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    const onClick = (e: MouseEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [aberto]);

  return (
    <div ref={caixa} className={`relative ${className ?? ""}`}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          aria-haspopup="dialog"
          aria-label={`Uso do plano: ${usado} de ${limite} Leads novos este mês. Abrir detalhe.`}
          className="inline-flex h-11 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 transition-colors duration-200 hover:bg-card-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {/* Trilho em `border-strong`, não `zinc-800`: sobre o fundo quase
              preto o zinc-800 dava 1,3:1 e a barra sumia — e com 0 usado não há
              preenchimento nenhum pra dar a pista de que ali existe um medidor.
              Largura mínima no preenchimento pelo mesmo motivo. */}
          <span
            aria-hidden
            className="h-1.5 w-16 overflow-hidden rounded-full bg-border-strong"
          >
            <span
              className={`block h-full ${cor} transition-all duration-500`}
              style={{ width: pct === 0 ? "2px" : `${pct}%` }}
            />
          </span>
          <span
            className={`font-mono text-sm ${
              estourado
                ? "text-red-300"
                : alerta
                  ? "text-amber-300"
                  : "text-foreground"
            }`}
          >
            {usado}
            {/* `zinc-500` sobre o fundo dava 4,1:1 — reprova. `muted` dá 7,7:1. */}
            <span className="text-muted">/{limite}</span>
          </span>
        </button>

        {/* O upsell mora no estado FECHADO: se só aparecesse depois do clique,
            o gatilho de 80% da F035 não existiria. */}
        {alerta && (
          <Link
            href="/planos"
            className="hidden text-sm font-medium text-primary hover:underline sm:inline"
          >
            Ver planos
          </Link>
        )}
      </div>

      {aberto && (
        <div
          role="dialog"
          aria-label="Uso do plano"
          className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-border bg-card p-4 shadow-2xl"
        >
          <p className="text-sm text-zinc-200">
            <strong className="font-mono font-semibold text-foreground">
              {usado} / {limite}
            </strong>{" "}
            Leads novos este mês
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Plano {planoNome}
          </p>

          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full ${cor} transition-all duration-500`}
              style={{ width: `${pct}%` }}
            />
          </div>

          {mensal.length > 0 && (
            <div className="mt-4 border-t border-border pt-3">
              <p className="text-xs font-medium tracking-wider text-zinc-400 uppercase">
                Este mês, no plano {planoNome}
              </p>
              <ul className="mt-2 space-y-1">
                {mensal.map((u) => (
                  <li
                    key={u.operacao}
                    className="flex items-baseline justify-between gap-3 text-sm"
                  >
                    <span className="text-muted">{u.label}</span>
                    <span
                      className={`font-mono ${
                        u.usado >= u.limite
                          ? "font-semibold text-amber-300"
                          : "text-zinc-300"
                      }`}
                    >
                      {u.usado}/{u.limite}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted">
                Tudo reseta na virada do mês (horário de Brasília).
              </p>
            </div>
          )}

          <div className="mt-4 border-t border-border pt-3">
            {estourado ? (
              <p className="text-sm text-zinc-300">
                Limite do mês atingido. Diagnosticar, abordar e o resto do
                Orion continuam funcionando.
              </p>
            ) : alerta ? (
              <p className="text-sm text-zinc-300">
                Faltam {restante} para o limite do mês.
              </p>
            ) : null}
            <Link
              href="/planos"
              onClick={() => setAberto(false)}
              className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
            >
              Ver planos →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
