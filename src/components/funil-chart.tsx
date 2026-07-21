"use client";

// F010 — funil visual estilo Bklit (anéis, hover, legenda). Sem deps extras.

import { useId, useState } from "react";

export type FunilStage = {
  id: string;
  label: string;
  value: number;
  /** Cor sólida do segmento (hex). */
  color: string;
};

type FunilChartProps = {
  stages: FunilStage[];
  /** Vazamento lateral (perdido), fora da silhueta. */
  perdido?: { value: number; max: number };
};

function vSegmentPath(
  normStart: number,
  normEnd: number,
  segH: number,
  W: number,
  layerScale: number,
): string {
  const mx = W / 2;
  const w0 = Math.max(0.04, normStart) * W * 0.42 * layerScale;
  const w1 = Math.max(0.04, normEnd) * W * 0.42 * layerScale;
  const cy = segH * 0.55;
  const left = `M ${mx - w0} 0 C ${mx - w0} ${cy}, ${mx - w1} ${segH - cy}, ${mx - w1} ${segH}`;
  const right = `L ${mx + w1} ${segH} C ${mx + w1} ${segH - cy}, ${mx + w0} ${cy}, ${mx + w0} 0`;
  return `${left} ${right} Z`;
}

const LAYERS = 3;
const SEG_H = 52;
const GAP = 6;
const CHART_W = 320;

export function FunilChart({ stages, perdido }: FunilChartProps) {
  const uid = useId().replace(/:/g, "");
  const [hovered, setHovered] = useState<number | null>(null);

  if (stages.length === 0) return null;

  const max = Math.max(1, ...stages.map((s) => s.value));
  const norms = stages.map((s) => (s.value > 0 ? s.value / max : 0.06));
  const totalH = stages.length * SEG_H + (stages.length - 1) * GAP;

  return (
    <div className="mt-4">
      <div
        className="relative mx-auto w-full max-w-md select-none"
        style={{ height: totalH }}
        onMouseLeave={() => setHovered(null)}
      >
        {/* Bandas de fundo alternadas */}
        <div className="pointer-events-none absolute inset-0 flex flex-col" style={{ gap: GAP }}>
          {stages.map((s, i) => (
            <div
              key={`band-${s.id}`}
              className={i % 2 === 0 ? "bg-zinc-800/25" : "bg-transparent"}
              style={{ height: SEG_H, borderRadius: 8 }}
            />
          ))}
        </div>

        <div className="absolute inset-0 flex flex-col" style={{ gap: GAP }}>
          {stages.map((stage, i) => {
            const normStart = norms[i] ?? 0.06;
            const normEnd = norms[Math.min(i + 1, norms.length - 1)] ?? normStart;
            const isHovered = hovered === i;
            const dimmed = hovered !== null && hovered !== i;
            const pct = Math.round((stage.value / max) * 100);

            return (
              <div
                key={stage.id}
                className="relative shrink-0 overflow-visible transition-opacity duration-200"
                style={{
                  height: SEG_H,
                  opacity: dimmed ? 0.35 : 1,
                  zIndex: isHovered ? 10 : 1,
                  animation: `funil-enter 420ms ease-out ${i * 70}ms both`,
                }}
                onMouseEnter={() => setHovered(i)}
              >
                <svg
                  aria-hidden
                  className="absolute inset-0 h-full w-full overflow-visible"
                  viewBox={`0 0 ${CHART_W} ${SEG_H}`}
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient
                      id={`${uid}-g-${i}`}
                      x1="0%"
                      y1="0%"
                      x2="0%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor={stage.color} stopOpacity="1" />
                      <stop offset="100%" stopColor={stage.color} stopOpacity="0.75" />
                    </linearGradient>
                    <filter
                      id={`${uid}-glow-${i}`}
                      x="-20%"
                      y="-20%"
                      width="140%"
                      height="140%"
                    >
                      <feGaussianBlur stdDeviation={isHovered ? 3.5 : 1.5} />
                    </filter>
                  </defs>
                  {Array.from({ length: LAYERS }, (_, l) => {
                    const scale = 1 - (l / LAYERS) * 0.32;
                    const opacity =
                      0.16 + (l / Math.max(LAYERS - 1, 1)) * 0.72;
                    const isInner = l === LAYERS - 1;
                    const hoverBoost =
                      isHovered && !isInner ? 1 + (LAYERS - 1 - l) * 0.04 : 1;
                    return (
                      <path
                        key={l}
                        d={vSegmentPath(
                          normStart,
                          normEnd,
                          SEG_H,
                          CHART_W,
                          scale * hoverBoost,
                        )}
                        fill={
                          isInner ? `url(#${uid}-g-${i})` : stage.color
                        }
                        opacity={opacity}
                        filter={
                          l === 0 ? `url(#${uid}-glow-${i})` : undefined
                        }
                        className="origin-center transition-[d,opacity] duration-200"
                        style={{
                          transform: isHovered
                            ? `scaleX(${1 + (LAYERS - 1 - l) * 0.03})`
                            : undefined,
                          transformOrigin: "center center",
                        }}
                      />
                    );
                  })}
                </svg>

                <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-3 sm:px-4">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-zinc-100 drop-shadow">
                      {stage.label}
                    </p>
                    <p className="font-mono text-[10px] text-zinc-300/80">
                      {pct}% do pico
                    </p>
                  </div>
                  <p className="shrink-0 font-mono text-sm font-semibold text-white drop-shadow">
                    {stage.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legenda interativa */}
      <ul className="mt-5 flex flex-wrap gap-2">
        {stages.map((stage, i) => {
          const active = hovered === null || hovered === i;
          return (
            <li key={`leg-${stage.id}`}>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-zinc-900/50 px-2.5 py-1 text-xs text-zinc-300 transition-all duration-200 hover:border-zinc-500 hover:bg-zinc-800/80"
                style={{
                  opacity: active ? 1 : 0.4,
                  boxShadow:
                    hovered === i ? `0 0 0 1px ${stage.color}55` : undefined,
                }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: stage.color }}
                  aria-hidden
                />
                <span>{stage.label}</span>
                <span className="font-mono text-zinc-400">{stage.value}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {perdido && (
        <div className="mt-4 border-t border-border/60 pt-3">
          <div className="flex items-center gap-3 text-xs">
            <span className="w-16 shrink-0 text-zinc-400">Perdido</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-800/60">
              <div
                className="h-full rounded-full bg-red-500 transition-[width] duration-300"
                style={{
                  width: `${Math.max(
                    perdido.value > 0 ? 4 : 0,
                    (perdido.value / Math.max(1, perdido.max)) * 100,
                  )}%`,
                  boxShadow:
                    perdido.value > 0
                      ? "0 0 12px rgba(239,68,68,0.35)"
                      : undefined,
                }}
              />
            </div>
            <span className="w-8 shrink-0 text-right font-mono text-zinc-300">
              {perdido.value}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">
            Perdido = vazamento lateral (sai de qualquer estágio pós-contato)
          </p>
        </div>
      )}
    </div>
  );
}
