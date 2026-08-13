"use client";

// F012 (emenda 2026-08-13) — a folha A4 que sai na impressão.
// Spec: /specs/02-features/F012-gerador-de-proposta.md
//
// Fica escondida na tela (`.folha-proposta { display: none }` em globals.css) e
// só existe no papel. Todo o estilo é inline ou vem do bloco `@media print`:
// classes utilitárias do Tailwind não valem aqui, porque o alvo é papel branco,
// não o tema escuro do app.

import { BRAND } from "@/lib/brand";
import { faixaBRL } from "@/lib/proposta/formatar";
import type { Precificacao } from "@/lib/proposta/precos";
import type { PropostaTexto } from "@/lib/proposta/gerarProposta";

const fmtData = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" });

/** Capitaliza o nome da empresa quando o default genérico do brand.ts está lá. */
function titulo(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function FolhaProposta({
  proposta,
  precificacao,
  nomeDoLead,
  /** Data injetada pelo pai — no servidor e no cliente teria valores diferentes. */
  emitidaEm,
}: {
  proposta: PropostaTexto;
  precificacao: Precificacao;
  nomeDoLead: string;
  emitidaEm: Date;
}) {
  return (
    <div className="folha-proposta" aria-hidden>
      <header
        style={{
          borderBottom: "2px solid #111827",
          paddingBottom: "10mm",
          marginBottom: "10mm",
        }}
      >
        <p
          className="fp-sans"
          style={{
            fontSize: "9pt",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#6b7280",
            margin: 0,
          }}
        >
          {titulo(BRAND.empresa)}
        </p>
        <h1
          style={{
            fontSize: "24pt",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            margin: "3mm 0 0",
          }}
        >
          Proposta comercial
        </h1>
        <p style={{ fontSize: "12pt", margin: "2mm 0 0", color: "#374151" }}>
          Preparada para <strong>{nomeDoLead}</strong>
        </p>
        <p
          className="fp-sans"
          style={{ fontSize: "9pt", color: "#6b7280", margin: "1mm 0 0" }}
        >
          {fmtData.format(emitidaEm)}
        </p>
      </header>

      <section className="fp-evitar-quebra" style={{ marginBottom: "9mm" }}>
        <p style={{ fontSize: "12pt", lineHeight: 1.6, margin: 0 }}>
          {proposta.resumo}
        </p>
      </section>

      <section style={{ marginBottom: "9mm" }}>
        <h2
          style={{
            fontSize: "10pt",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#6b7280",
            borderBottom: "1px solid #d1d5db",
            paddingBottom: "2mm",
            margin: "0 0 4mm",
          }}
        >
          Escopo
        </h2>
        {proposta.escopo.map((e, i) => (
          <div
            key={i}
            className="fp-evitar-quebra"
            style={{ marginBottom: "4mm" }}
          >
            <p
              className="fp-sans"
              style={{ fontSize: "11pt", fontWeight: 600, margin: 0 }}
            >
              {e.item}
            </p>
            <p style={{ margin: "1mm 0 0", color: "#374151" }}>{e.descricao}</p>
          </div>
        ))}
      </section>

      {proposta.entregaveis.length > 0 && (
        <section className="fp-evitar-quebra" style={{ marginBottom: "9mm" }}>
          <h2
            style={{
              fontSize: "10pt",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#6b7280",
              borderBottom: "1px solid #d1d5db",
              paddingBottom: "2mm",
              margin: "0 0 4mm",
            }}
          >
            Você recebe
          </h2>
          <ul style={{ margin: 0, paddingLeft: "5mm" }}>
            {proposta.entregaveis.map((e, i) => (
              <li key={i} style={{ marginBottom: "1.5mm" }}>
                {e}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section
        className="fp-evitar-quebra"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: "8mm",
          border: "1px solid #111827",
          padding: "6mm",
          marginBottom: "9mm",
        }}
      >
        <div>
          <p
            className="fp-sans"
            style={{
              fontSize: "9pt",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#6b7280",
              margin: 0,
            }}
          >
            Prazo estimado
          </p>
          <p style={{ fontSize: "12pt", margin: "1mm 0 0" }}>
            {proposta.prazo_estimado}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p
            className="fp-sans"
            style={{
              fontSize: "9pt",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#6b7280",
              margin: 0,
            }}
          >
            Investimento
          </p>
          <p
            className="fp-sans"
            style={{ fontSize: "16pt", fontWeight: 700, margin: "1mm 0 0" }}
          >
            {faixaBRL(precificacao)}
          </p>
        </div>
      </section>

      {proposta.observacoes.trim() && (
        <section className="fp-evitar-quebra" style={{ marginBottom: "9mm" }}>
          <p style={{ fontSize: "10pt", color: "#374151", margin: 0 }}>
            {proposta.observacoes.trim()}
          </p>
        </section>
      )}

      <footer
        className="fp-sans"
        style={{
          borderTop: "1px solid #d1d5db",
          paddingTop: "4mm",
          fontSize: "8.5pt",
          color: "#6b7280",
        }}
      >
        <p style={{ margin: 0 }}>
          Proposta válida por 15 dias a partir da data de emissão. Os valores são
          uma faixa estimada e podem ser ajustados após o levantamento detalhado
          do escopo.
        </p>
      </footer>
    </div>
  );
}
