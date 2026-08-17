"use client";

// F012 (emenda de precificação 2026-08-16) — onde o aluno fecha o preço.
// Spec: /specs/02-features/F012-gerador-de-proposta.md
//
// Uma proposta só: marca os serviços, fecha o valor. A versão de três pacotes
// (essencial/completo/premium) foi revista e removida no mesmo dia — o guia
// ensina a técnica, mas ela dobrava a tela e o PDF pra um ganho que ninguém
// tinha pedido.
//
// A faixa de referência aparece AQUI e só aqui. Ela é ferramenta de quem
// vende: no PDF do cliente só existe número fechado (AC23).

import { useState } from "react";
import {
  CATALOGO,
  faixaDeReferencia,
  type ItemId,
} from "@/lib/proposta/catalogo";
import {
  brl,
  sugerirMensal,
  sugerirPrazo,
  sugerirValor,
  temRecorrencia,
  validar,
  type Selecao,
} from "@/lib/proposta/selecao";

export function SeletorServicos({
  selecao,
  onChange,
}: {
  selecao: Selecao;
  onChange: (s: Selecao) => void;
}) {
  // Quais campos o aluno já digitou. Enquanto ele não digita, o valor
  // acompanha o que ele marca; depois de digitar, marcar serviço nenhum
  // sobrescreve o número dele — sugestão que se impõe deixa de ser sugestão.
  const [tocados, setTocados] = useState<Set<string>>(new Set());

  function alternar(id: ItemId) {
    const tem = selecao.itens.includes(id);
    const itens = tem
      ? selecao.itens.filter((i) => i !== id)
      : [...selecao.itens, id];

    onChange({
      itens,
      valor: tocados.has("valor") ? selecao.valor : sugerirValor(itens),
      mensal: tocados.has("mensal") ? selecao.mensal : sugerirMensal(itens),
      prazo: tocados.has("prazo") ? selecao.prazo : sugerirPrazo(itens),
    });
  }

  function digitarPrazo(texto: string) {
    setTocados((t) => new Set(t).add("prazo"));
    onChange({ ...selecao, prazo: texto });
  }

  function digitar(campo: "valor" | "mensal", bruto: string) {
    setTocados((t) => new Set(t).add(campo));
    // Só dígito: "R$ 2.400" colado do WhatsApp vira 2400 em vez de NaN.
    const numero = Number(bruto.replace(/\D/g, "")) || 0;
    onChange({ ...selecao, [campo]: numero });
  }

  const problemas = validar(selecao);
  const projetos = CATALOGO.filter((i) => i.tipo === "projeto");
  const recorrentes = CATALOGO.filter((i) => i.tipo === "recorrencia");

  const grupo = (titulo: string, itens: typeof projetos, sufixo = "") => (
    <div>
      <p className="text-[10px] font-semibold tracking-wider text-muted uppercase">
        {titulo}
      </p>
      <ul className="mt-1.5 space-y-1">
        {itens.map((i) => (
          <li key={i.id}>
            <label className="flex cursor-pointer items-baseline gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-zinc-800/40">
              <input
                type="checkbox"
                checked={selecao.itens.includes(i.id)}
                onChange={() => alternar(i.id)}
                className="h-4 w-4 shrink-0 cursor-pointer accent-primary"
              />
              <span className="text-sm text-zinc-200">{i.titulo}</span>
              <span className="text-xs text-muted">
                {faixaDeReferencia(i.id)}
                {sufixo}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="w-full max-w-xl space-y-4">
      {grupo("Projeto", projetos)}
      {grupo("Recorrência", recorrentes, " / mês")}

      <div className="flex flex-wrap gap-3 border-t border-border pt-3">
        {/* Prazo antes do dinheiro, na mesma ordem em que a folha apresenta:
            o que se entrega e quando, depois quanto custa. */}
        <div>
          <label
            htmlFor="proposta-prazo"
            className="block text-[10px] font-semibold tracking-wider text-muted uppercase"
          >
            Prazo
          </label>
          <input
            id="proposta-prazo"
            value={selecao.prazo}
            onChange={(e) => digitarPrazo(e.target.value)}
            maxLength={80}
            placeholder="3 a 4 semanas"
            className="mt-1 w-44 rounded-md border border-border bg-zinc-900/70 px-2 py-1.5 text-zinc-100"
          />
        </div>

        <div>
          <label
            htmlFor="proposta-valor"
            className="block text-[10px] font-semibold tracking-wider text-muted uppercase"
          >
            Valor fechado
          </label>
          <input
            id="proposta-valor"
            inputMode="numeric"
            value={selecao.valor === 0 ? "" : brl(selecao.valor)}
            onChange={(e) => digitar("valor", e.target.value)}
            placeholder="R$ 0"
            className="mt-1 w-36 rounded-md border border-border bg-zinc-900/70 px-2 py-1.5 text-center font-mono text-zinc-100"
          />
        </div>

        {/* O campo mensal só existe quando há serviço mensal marcado: campo
            vazio pedindo número que não se aplica é convite a erro. */}
        {temRecorrencia(selecao) && (
          <div>
            <label
              htmlFor="proposta-mensal"
              className="block text-[10px] font-semibold tracking-wider text-muted uppercase"
            >
              Mensal
            </label>
            <input
              id="proposta-mensal"
              inputMode="numeric"
              value={selecao.mensal === 0 ? "" : brl(selecao.mensal)}
              onChange={(e) => digitar("mensal", e.target.value)}
              placeholder="R$ 0"
              className="mt-1 w-36 rounded-md border border-border bg-zinc-900/70 px-2 py-1.5 text-center font-mono text-zinc-100"
            />
          </div>
        )}
      </div>

      {problemas.length > 0 && (
        <ul className="space-y-1">
          {problemas.map((p, i) => (
            <li key={i} className="text-xs text-amber-300">
              {p}
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] leading-relaxed text-muted">
        As faixas são referência da tabela do Arsenal e ficam só aqui — o
        cliente recebe apenas o valor fechado.
      </p>
    </div>
  );
}
