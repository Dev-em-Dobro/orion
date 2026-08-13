"use client";

// F032 — card de Lead. Substitui a linha da tabela (`lead-row.tsx`) e é o
// mesmo componente usado na lista, no resultado da busca e (a partir da F025)
// na Fila do dia.
// Spec: /specs/02-features/F032-interface-do-orion.md

import Link from "next/link";
import type { LeadStatus } from "@prisma/client";
import { ROTULO_ESTAGIO } from "@/lib/funil";
import { faixaDeScore, scoreBadge, STATUS_BADGE } from "./ui";

export type LeadCardProps = {
  id: string;
  nome: string;
  categoria: string;
  /**
   * F032 (revisão 2026-08-13) — o número **não** é exibido. Só interessa saber
   * se existe: sem telefone não dá pra ligar nem mandar WhatsApp, e isso muda
   * a decisão de abordar. O número em si é uso do detalhe.
   */
  telefone: string | null;
  website: string | null;
  nota: number | null;
  numAvaliacoes: number | null;
  status: LeadStatus;
  score: number;
  tier: string;
  ehAgregador: boolean;
  agregadorTipo: "agregador" | "social" | null;
  temDiagnostico: boolean;
  /** F025 — score ainda vem da Triagem (sem Diagnóstico). */
  scoreEstimado: boolean;
  temAbordagem: boolean;
  /** F026 — sem sinal de atendimento automatizado (e com telefone). */
  semAtendimento: boolean;
  abordagemEnviada: boolean;
  waLink: string | null;
  motivoDescarte: string | null;
  /** Link do detalhe já com o contexto de filtro (F032 AC8). */
  href: string;
};

function SiteBadge({
  website,
  ehAgregador,
  agregadorTipo,
}: Pick<LeadCardProps, "website" | "ehAgregador" | "agregadorTipo">) {
  if (!website)
    return <span className="badge bg-red-500/15 text-red-300">sem site</span>;
  if (ehAgregador)
    return (
      <span className="badge bg-amber-500/15 text-amber-300">
        {agregadorTipo === "social" ? "rede social" : "link-in-bio"}
      </span>
    );
  return <span className="badge bg-zinc-500/15 text-zinc-300">site</span>;
}

function Avaliacoes({
  nota,
  numAvaliacoes,
}: Pick<LeadCardProps, "nota" | "numAvaliacoes">) {
  if (numAvaliacoes === null) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        className="h-3.5 w-3.5 text-amber-400"
      >
        <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
      </svg>
      {nota !== null && <span className="font-mono">{nota.toFixed(1)}</span>}
      <span className="font-mono text-zinc-500">({numAvaliacoes})</span>
    </span>
  );
}

// O card não tem mais ação primária (2026-08-13). Diagnosticar, Gerar
// abordagem, Abrir no WhatsApp, Registrar desfecho e Restaurar viviam aqui,
// cada Lead mostrando um botão diferente conforme o estado — três botões numa
// caixa de ~320px, quebrando em duas linhas. Agora o card leva pro detalhe, que
// é onde essas ações já existem todas juntas e com contexto.

export function LeadCard({
  lead,
  selecionado = false,
  destaque = false,
  onSelecionar,
}: {
  lead: LeadCardProps;
  selecionado?: boolean;
  /**
   * Card preenchido no verde da marca. Decidido pela grade, não pelo Lead: na
   * Fila do dia **todos** ficam verdes (a lista inteira é "abordar agora"), na
   * `/leads` nenhum fica.
   */
  destaque?: boolean;
  /** Ausente = card sem checkbox (Fila do dia não tem ação em massa). */
  onSelecionar?: (id: string, marcado: boolean) => void;
}) {
  const superficie = destaque
    ? "card-destaque"
    : selecionado
      ? "border-primary/60 bg-primary/5"
      : "border-border bg-card hover:border-border-strong";

  return (
    <article
      className={`flex flex-col gap-3 rounded-xl border p-4 transition-colors ${superficie}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={lead.href}
            className="font-medium text-zinc-100 hover:text-primary hover:underline"
          >
            {lead.nome}
          </Link>
          <p className="mt-0.5 truncate text-xs text-muted">
            {lead.categoria}
            <span className="text-muted"> · {lead.tier}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* O `~` saiu em 2026-08-13. Era um símbolo sem legenda visível: a
              explicação vivia só no `title`, que não existe no toque — e a
              pergunta que ele gerava era "por que uns ficam assim?".

              O que distingue agora é o estilo: confirmado vem preenchido na cor
              da faixa e **com a palavra**; estimado vem em contorno neutro e só
              com o número. A ausência da palavra já era o sinal — o til era
              redundante e do lado errado (a convenção de "aproximadamente" é
              antes do número, não depois). */}
          <span
            className={`badge font-mono ${scoreBadge(lead.score, lead.scoreEstimado)}`}
            title={
              lead.scoreEstimado
                ? `Score ${lead.score} estimado pela Triagem — ainda sem Diagnóstico`
                : `Score ${lead.score} — faixa ${faixaDeScore(lead.score)}`
            }
          >
            {lead.score}
            {lead.scoreEstimado ? (
              // Estilo não chega em leitor de tela: sem isto o badge lê só
              // "92", indistinguível de um score confirmado.
              <span className="sr-only">
                {" "}
                — estimado pela Triagem, ainda sem Diagnóstico
              </span>
            ) : (
              <> {faixaDeScore(lead.score)}</>
            )}
          </span>
          {onSelecionar && (
            <input
              type="checkbox"
              checked={selecionado}
              onChange={(e) => onSelecionar(lead.id, e.target.checked)}
              aria-label={`Selecionar ${lead.nome}`}
              className="check-orion"
            />
          )}
        </div>
      </header>

      {/* A linha da Dor não fica no card. Tentada duas vezes em 2026-08-13 e
          retirada nas duas: em texto corrido ela é a linha mais larga da caixa,
          e numa grade de 3–4 colunas empurra o card pra altura de um parágrafo
          só pra dizer o que os badges de site já dizem em duas palavras.
          A Dor continua no detalhe (aba Diagnóstico) e é ela que alimenta a
          Abordagem e a Proposta — só não disputa espaço na varredura. */}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <SiteBadge
          website={lead.website}
          ehAgregador={lead.ehAgregador}
          agregadorTipo={lead.agregadorTipo}
        />
        {/* Era o valor cru do enum: o aluno lia "enriquecido" e "priorizado",
            termos internos que não descrevem nada do trabalho dele. O mapa vive
            em `lib/funil.ts`, junto da ordem canônica do funil. */}
        <span className={`badge ${STATUS_BADGE[lead.status]}`}>
          {ROTULO_ESTAGIO[lead.status]}
        </span>
        <Avaliacoes nota={lead.nota} numAvaliacoes={lead.numAvaliacoes} />
        {lead.semAtendimento && (
          <span
            className="badge bg-sky-500/15 text-sky-300"
            title="Nenhum sinal de atendimento automatizado no site público. Não enviamos mensagem para o WhatsApp do negócio."
          >
            WhatsApp no braço
          </span>
        )}
        {/* Não é o número: é o aviso de que não dá pra ligar nem mandar
            WhatsApp — o único bit do telefone que decide alguma coisa aqui. */}
        {!lead.telefone && (
          <span
            className="badge bg-red-500/15 text-red-300"
            title="O Places não expôs telefone. Sem ele não dá pra ligar nem abrir o WhatsApp."
          >
            sem telefone
          </span>
        )}
        {/* Evita retrabalho na varredura: esse aqui você já falou. */}
        {lead.abordagemEnviada && (
          <span className="badge bg-emerald-500/15 text-emerald-300">
            abordagem enviada
          </span>
        )}
      </div>

      {lead.motivoDescarte && (
        <p className="text-xs text-zinc-500">Descartado: {lead.motivoDescarte}</p>
      )}

      {/* Um botão só. Descartar e Restaurar individuais continuam no detalhe do
          Lead; descartar em lote segue na seleção da própria lista (F024). */}
      <footer className="mt-auto flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Link href={lead.href} className="btn-card">
          Abordar no CRM
        </Link>
      </footer>
    </article>
  );
}
