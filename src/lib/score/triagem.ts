// F025 — Triagem: score na hora da coleta, sem tocar a rede.
// Spec: /specs/02-features/F025-fila-do-dia.md
//
// Usa só o que o Places já trouxe: categoria, nº de avaliações e a URL do
// site. Zero requisição, zero custo, milissegundos — por isso pode rodar em
// todos os resultados da busca, não só nos que serão diagnosticados.
//
// Não muda nenhum peso da F003: muda **quando** o score é calculado.

import { classificarWebsite } from "@/lib/diagnostico/agregador";
import { calcularScore, valor } from "./score";
import type { Tier } from "./nichos";

export type EntradaTriagem = {
  categoria: string;
  num_avaliacoes: number | null;
  website: string | null;
};

export type ResultadoTriagem = {
  score: number;
  valor: number;
  necessidade: number;
  tier: Tier;
};

/**
 * Necessidade com o que dá pra saber sem visitar o site.
 *
 * Acerta **em cheio** nos dois casos de maior Necessidade (sem site e
 * agregador) — ali não há estimativa, é fato. Só aproxima em quem tem site
 * próprio, e é justamente esse grupo que o aprofundamento resolve depois.
 */
export function necessidadeEstimada(website: string | null): number {
  if (!website || website.trim().length === 0) return 100;

  if (classificarWebsite(website).ehAgregador) return 100;

  // Mesmos termos da F003: base 20 + 25 (performance desconhecida) + 20 quando
  // a própria URL já denuncia a falta de HTTPS. URL sem esquema não conta o
  // +20 — não sabemos, e o conservador aqui é não inflar a Necessidade.
  const semHttps = /^http:\/\//i.test(website.trim());
  return Math.min(20 + 25 + (semHttps ? 20 : 0), 100);
}

/** Score estimado do Lead recém-coletado. */
export function triagem(entrada: EntradaTriagem): ResultadoTriagem {
  const { valor: v, tier } = valor({
    categoria: entrada.categoria,
    num_avaliacoes: entrada.num_avaliacoes,
  });
  const n = necessidadeEstimada(entrada.website);
  return { score: calcularScore({ valor: v, necessidade: n }), valor: v, necessidade: n, tier };
}
