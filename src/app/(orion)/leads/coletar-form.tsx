"use client";

// F033 — busca estruturada: UF → município → bairro + nicho controlado.
// Spec: /specs/02-features/F033-busca-estruturada.md
//
// O nicho vem de lista fechada porque isso conserta um erro silencioso: com
// texto livre, o Places às vezes devolve um `primaryType` fora do mapa e o
// Lead cai em Tier BAIXO sem ninguém perceber.

import { useActionState, useEffect, useState } from "react";
import { coletarLeads, type ColetarState } from "@/actions/leads/coletar";
import {
  GRUPOS_NICHO,
  NICHO_OUTRO,
  NICHOS,
} from "@/lib/nichos/catalogo";
import { QUANTIDADES } from "@/lib/leads/aprofundamento";
import { UFS } from "@/lib/localidades/ufs";
import { AprofundarButton } from "./aprofundar-button";

const initial: ColetarState = { kind: "idle" };

export function ColetarForm() {
  const [state, action, pending] = useActionState(coletarLeads, initial);
  const [uf, setUf] = useState("");
  const [municipios, setMunicipios] = useState<string[]>([]);
  const [carregandoMunicipios, setCarregando] = useState(false);
  const [nicho, setNicho] = useState(NICHOS[0]?.slug ?? NICHO_OUTRO);
  const [quantidade, setQuantidade] = useState<number>(QUANTIDADES[0]);

  // Municípios da UF escolhida, sob demanda: a base inteira são 5.571 nomes e
  // não pode ir pro bundle (F033 AC8).
  useEffect(() => {
    if (!uf) {
      setMunicipios([]);
      return;
    }
    let cancelado = false;
    setCarregando(true);
    fetch(`/api/localidades/${uf}`)
      .then((r) => (r.ok ? r.json() : { municipios: [] }))
      .then((j: { municipios?: string[] }) => {
        if (!cancelado) setMunicipios(j.municipios ?? []);
      })
      .catch(() => {
        if (!cancelado) setMunicipios([]);
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [uf]);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold tracking-wide text-zinc-300 uppercase">
        Buscar Leads
      </h2>
      <p className="mt-1 text-xs text-muted">
        Escolha o nicho e onde buscar. O Orion tria e diagnostica os melhores
        sozinho.
      </p>

      <form action={action} className="mt-4 flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-400">Nicho</span>
            <select
              name="nicho"
              value={nicho}
              onChange={(e) => setNicho(e.target.value)}
              className="input-base"
            >
              {GRUPOS_NICHO.map((grupo) => (
                <optgroup key={grupo.tier} label={grupo.titulo}>
                  {NICHOS.filter((n) => n.tier === grupo.tier).map((n) => (
                    <option key={n.slug} value={n.slug}>
                      {n.label}
                    </option>
                  ))}
                </optgroup>
              ))}
              <option value={NICHO_OUTRO}>Outro (digitar)</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-400">Estado</span>
            <select
              name="uf"
              value={uf}
              onChange={(e) => setUf(e.target.value)}
              required
              className="input-base"
            >
              <option value="">Selecione</option>
              {UFS.map((u) => (
                <option key={u.sigla} value={u.sigla}>
                  {u.sigla} · {u.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-400">Cidade</span>
            <input
              name="municipio"
              list="municipios-uf"
              required
              disabled={!uf || carregandoMunicipios}
              placeholder={
                !uf
                  ? "Escolha o estado primeiro"
                  : carregandoMunicipios
                    ? "Carregando…"
                    : "Digite para filtrar"
              }
              className="input-base"
            />
            <datalist id="municipios-uf">
              {municipios.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-400">Bairro (opcional)</span>
            <input name="bairro" placeholder="Batel" className="input-base" />
          </label>
        </div>

        {nicho === NICHO_OUTRO && (
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-400">
              O que buscar (texto livre)
            </span>
            <input
              name="termoLivre"
              required
              placeholder="lava-rápido"
              className="input-base"
            />
          </label>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-zinc-400">Quantidade</span>
          {QUANTIDADES.map((q) => (
            <label key={q} className="cursor-pointer">
              <input
                type="radio"
                name="quantidade"
                value={q}
                checked={quantidade === q}
                onChange={() => setQuantidade(q)}
                className="peer sr-only"
              />
              <span className="rounded-full border border-border px-3 py-1.5 text-xs text-zinc-400 peer-checked:border-primary peer-checked:bg-primary peer-checked:font-semibold peer-checked:text-primary-foreground">
                {q}
              </span>
            </label>
          ))}
          <span className="text-xs text-zinc-600">
            cada 20 = 1 consulta ao Google
          </span>

          <button
            type="submit"
            disabled={pending}
            className="btn-primary ml-auto"
          >
            {pending ? "Buscando..." : "Buscar"}
          </button>
        </div>
      </form>

      {state.kind === "erro" && (
        <p className="alert-erro mt-4">{state.mensagem}</p>
      )}

      {state.kind === "ok" && (
        <div className="mt-4 space-y-3">
          <p className="alert-ok">
            {state.criados} Lead(s) novo(s) · {state.ignorados} já existiam
            {state.comPotencial > 0 && (
              <>
                {" "}
                · <strong>{state.comPotencial} com potencial alto</strong>
              </>
            )}
          </p>
          {state.ampliou && (
            <p className="text-xs text-amber-300">
              Nenhum resultado com o tipo exato — ampliamos a busca sem o
              filtro de categoria.
            </p>
          )}
          {/* F025 — o aprofundamento dispara sozinho: a busca entrega
              trabalho pronto, não matéria-prima. */}
          {state.criados > 0 && (
            <AprofundarButton
              key={`${state.criados}-${state.comPotencial}`}
              automatico
            />
          )}
        </div>
      )}
    </div>
  );
}
