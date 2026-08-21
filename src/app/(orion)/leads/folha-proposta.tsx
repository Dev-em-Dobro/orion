"use client";

// F012 (emendas 2026-08-13 e 2026-08-16) — a folha A4 que sai na impressão.
// Spec: /specs/02-features/F012-gerador-de-proposta.md
//
// Fica escondida na tela (`.folha-proposta { display: none }` em globals.css) e
// só existe no papel. O estilo é inline ou vem do bloco `@media print`:
// utilitárias do Tailwind não valem aqui, porque o alvo é papel, não o tema
// escuro do app.
//
// Duas regras que o documento carrega:
//
// 1. A identidade é NEUTRA. Quem assina é o aluno (`BRAND.empresa`), então o
//    verde do Orion não entra: seria o fornecedor da ferramenta se anunciando
//    no documento comercial de outra pessoa.
// 2. NENHUMA faixa. O cliente vê preço fechado; a faixa de referência é
//    ferramenta de quem vende e morre no seletor (AC23).

import { BRAND } from "@/lib/brand";
import { MESES_MINIMOS_RECORRENCIA } from "@/lib/proposta/catalogo";
import { brl, temRecorrencia, type Selecao } from "@/lib/proposta/selecao";
import type { PropostaTexto } from "@/lib/proposta/gerarProposta";

const fmtData = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" });

/** Paleta do documento — "Trust & Authority", sem nada da marca do Orion. */
const COR = {
  tinta: "#0f172a",
  corpo: "#1e293b",
  suave: "#475569",
  acento: "#0369a1",
  painel: "#f1f5f9",
  linha: "#cbd5e1",
  claro: "#ffffff",
  claroSuave: "#cbd5e1",
  claroFraco: "#94a3b8",
} as const;

/** Capitaliza o nome da empresa quando o default genérico do brand.ts está lá. */
function titulo(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function TituloSecao({ children }: { children: string }) {
  return (
    <h2
      className="fp-rotulo"
      style={{
        color: COR.acento,
        borderBottom: `1.5pt solid ${COR.acento}`,
        paddingBottom: "2mm",
        marginBottom: "4mm",
      }}
    >
      {children}
    </h2>
  );
}

export function FolhaProposta({
  proposta,
  selecao,
  nomeDoLead,
  /** Data injetada pelo pai — no servidor e no cliente teria valores diferentes. */
  emitidaEm,
}: {
  proposta: PropostaTexto;
  selecao: Selecao;
  nomeDoLead: string;
  emitidaEm: Date;
}) {
  const mensal = temRecorrencia(selecao) && selecao.mensal > 0;

  return (
    <div className="folha-proposta" aria-hidden>
      <header className="fp-capa">
        <p className="fp-rotulo" style={{ fontSize: "8pt", color: COR.claroFraco }}>
          {titulo(BRAND.empresa)}
        </p>
        <h1
          className="fp-display"
          style={{
            fontSize: "28pt",
            lineHeight: 1.05,
            letterSpacing: "-0.01em",
            color: COR.claro,
            margin: "4mm 0 0",
          }}
        >
          Proposta comercial
        </h1>
        <p style={{ fontSize: "11pt", color: COR.claroSuave, margin: "4mm 0 0" }}>
          Preparada para{" "}
          <strong style={{ color: COR.claro, fontWeight: 600 }}>{nomeDoLead}</strong>
        </p>
        <p style={{ fontSize: "8.5pt", color: COR.claroFraco, margin: "1.5mm 0 0" }}>
          {fmtData.format(emitidaEm)}
        </p>
      </header>

      <p
        className="fp-display fp-evitar-quebra"
        style={{
          fontSize: "12.5pt",
          lineHeight: 1.55,
          color: COR.tinta,
          margin: "0 0 9mm",
        }}
      >
        {proposta.resumo}
      </p>

      <section style={{ marginBottom: "9mm" }}>
        <TituloSecao>O que está incluído</TituloSecao>
        {proposta.escopo.map((e, i) => (
          <div key={i} className="fp-evitar-quebra" style={{ marginBottom: "4mm" }}>
            <p style={{ fontSize: "10.5pt", fontWeight: 600, color: COR.tinta, margin: 0 }}>
              {e.item}
            </p>
            <p style={{ margin: "0.8mm 0 0", color: COR.suave }}>{e.descricao}</p>
          </div>
        ))}
      </section>

      {proposta.entregaveis.length > 0 && (
        <section className="fp-evitar-quebra" style={{ marginBottom: "9mm" }}>
          <TituloSecao>Você recebe</TituloSecao>
          <ul className="fp-entregaveis">
            {proposta.entregaveis.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </section>
      )}

      {(proposta.observacoes.trim() || mensal) && (
        <section
          className="fp-evitar-quebra"
          style={{
            fontSize: "9.5pt",
            color: COR.suave,
            background: COR.painel,
            padding: "5mm",
            marginBottom: "9mm",
          }}
        >
          {proposta.observacoes.trim() && <p style={{ margin: 0 }}>{proposta.observacoes.trim()}</p>}
          {mensal && (
            <p style={{ margin: proposta.observacoes.trim() ? "2mm 0 0" : 0 }}>
              Os serviços mensais têm compromisso mínimo de{" "}
              {MESES_MINIMOS_RECORRENCIA} meses.
            </p>
          )}
        </section>
      )}

      {/* Último bloco antes do rodapé, e é de propósito (AC29): o guia de
          precificação do Arsenal ensina "apresente o valor antes do preço —
          liste o que ele leva, depois o número". Preço no topo é o cliente
          lendo o número antes de saber o que compra.

          Um número, nunca faixa: faixa ancora no piso e diz que o fornecedor
          não decidiu (AC23). */}
      <section
        className="fp-evitar-quebra"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: "8mm",
          background: COR.painel,
          borderLeft: `3pt solid ${COR.acento}`,
          padding: "7mm",
          marginBottom: "9mm",
        }}
      >
        <div>
          <p className="fp-rotulo" style={{ fontSize: "8pt", color: COR.suave }}>
            Prazo estimado
          </p>
          <p style={{ fontSize: "12pt", fontWeight: 500, color: COR.tinta, margin: "1.5mm 0 0" }}>
            {selecao.prazo}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p className="fp-rotulo" style={{ fontSize: "8pt", color: COR.suave }}>
            Investimento
          </p>
          <p
            className="fp-display"
            style={{
              fontSize: "19pt",
              color: COR.tinta,
              margin: "1.5mm 0 0",
              whiteSpace: "nowrap",
            }}
          >
            {selecao.valor > 0 ? brl(selecao.valor) : `${brl(selecao.mensal)} / mês`}
          </p>
          {selecao.valor > 0 && mensal && (
            <p style={{ fontSize: "10pt", color: COR.suave, margin: "1.5mm 0 0" }}>
              + {brl(selecao.mensal)} / mês
            </p>
          )}
        </div>
      </section>


      <footer
        style={{
          borderTop: `1pt solid ${COR.linha}`,
          paddingTop: "4mm",
          fontSize: "8pt",
          color: COR.suave,
        }}
      >
        <p style={{ margin: 0 }}>
          Proposta válida por 15 dias a partir da data de emissão.
        </p>
      </footer>
    </div>
  );
}
