"use client";

// Campo de escolha com busca — substitui `<input list>` + `<datalist>`.
//
// O `<datalist>` parecia a escolha certa (nativo, zero JS), mas quem desenha o
// painel dele é o navegador, e com centenas de opções — a lista de municípios
// de uma UF passa de 800 — o Chrome abre um painel do tamanho do conteúdo,
// encostado onde couber, às vezes ao LADO do campo. Não há CSS que alcance:
// `datalist` não é estilizável.
//
// Aqui o painel é nosso: abre embaixo do campo, com teto de altura e rolagem.
//
// Sem lib de combobox (seria dependência nova → ADR, e não se justifica por um
// campo). O comportamento de teclado segue o padrão de combobox da WAI-ARIA:
// setas navegam, Enter escolhe, Escape fecha.

import { useEffect, useId, useMemo, useRef, useState } from "react";

export function ComboBox({
  name,
  opcoes,
  valor,
  onChange,
  placeholder,
  disabled,
  required,
  /** Quantas opções desenhar. Teto pra lista gigante não custar render. */
  maxVisiveis = 60,
}: {
  name: string;
  opcoes: string[];
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  maxVisiveis?: number;
}) {
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const caixa = useRef<HTMLDivElement>(null);
  const listaId = useId();

  const filtradas = useMemo(() => {
    const termo = valor.trim().toLowerCase();
    const base = termo
      ? opcoes.filter((o) => o.toLowerCase().includes(termo))
      : opcoes;
    return base.slice(0, maxVisiveis);
  }, [opcoes, valor, maxVisiveis]);

  // Clique fora fecha. Sem isso o painel fica aberto por cima do resto do
  // formulário depois que a pessoa desiste dele.
  useEffect(() => {
    if (!aberto) return;
    const onClick = (e: MouseEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [aberto]);

  function escolher(v: string) {
    onChange(v);
    setAberto(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setAberto(false);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!aberto) {
        setAberto(true);
        return;
      }
      const passo = e.key === "ArrowDown" ? 1 : -1;
      setAtivo((i) => {
        const proximo = i + passo;
        if (proximo < 0) return filtradas.length - 1;
        if (proximo >= filtradas.length) return 0;
        return proximo;
      });
      return;
    }
    if (e.key === "Enter" && aberto && filtradas[ativo]) {
      // `preventDefault` senão o Enter envia o formulário junto com a escolha.
      e.preventDefault();
      escolher(filtradas[ativo]);
    }
  }

  return (
    <div ref={caixa} className="relative">
      <input
        name={name}
        value={valor}
        onChange={(e) => {
          onChange(e.target.value);
          setAberto(true);
          setAtivo(0);
        }}
        onFocus={() => setAberto(true)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={aberto}
        aria-controls={listaId}
        aria-autocomplete="list"
        autoComplete="off"
        className="input-base"
      />

      {aberto && filtradas.length > 0 && (
        <ul
          id={listaId}
          role="listbox"
          // `max-h-64 overflow-auto`: o ponto todo do componente. `top-full`
          // ancora embaixo do campo, e `z-20` passa por cima dos campos
          // vizinhos sem cobrir modal (que é z-[60]).
          className="absolute top-full right-0 left-0 z-20 mt-1 max-h-64 overflow-auto rounded-lg border border-border bg-card py-1 shadow-lg"
        >
          {filtradas.map((o, i) => (
            <li key={o}>
              <button
                type="button"
                role="option"
                aria-selected={i === ativo}
                // `onMouseDown` e não `onClick`: o clique tira o foco do input
                // antes, e o `mousedown` de fora fecharia o painel na frente
                // da escolha.
                onMouseDown={(e) => {
                  e.preventDefault();
                  escolher(o);
                }}
                onMouseEnter={() => setAtivo(i)}
                className={`block w-full px-3 py-1.5 text-left text-sm ${
                  i === ativo
                    ? "bg-card-raised text-zinc-100"
                    : "text-zinc-300"
                }`}
              >
                {o}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
