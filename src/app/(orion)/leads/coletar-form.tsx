"use client";

// F033 — busca estruturada: UF → município → bairro + nicho controlado.
// Spec: /specs/02-features/F033-busca-estruturada.md
//
// O nicho vem de lista fechada porque isso conserta um erro silencioso: com
// texto livre, o Places às vezes devolve um `primaryType` fora do mapa e o
// Lead cai em Tier BAIXO sem ninguém perceber.

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { coletarLeads, type ColetarState } from "@/actions/leads/coletar";
import {
  GRUPOS_NICHO,
  NICHO_OUTRO,
  NICHOS,
} from "@/lib/nichos/catalogo";
import { QUANTIDADES } from "@/lib/leads/aprofundamento";
import { UFS } from "@/lib/localidades/ufs";
import { PLANOS_NA_UI } from "@/lib/planos/exibicao";
import { ComboBox } from "@/components/combobox";

const initial: ColetarState = { kind: "idle" };

/**
 * F035 — o aviso vem **antes** da busca. Três coisas precisam estar explícitas,
 * porque as três custam algo: quanto sobrou, que o excedente é descartado, e
 * que a chamada ao Google acontece do mesmo jeito. Por isso a ação em destaque
 * é **reduzir**, não seguir.
 */
function DialogoCota({
  pedido,
  restante,
  limite,
  planoNome,
  onReduzir,
  onSeguir,
  onFechar,
}: {
  pedido: number;
  restante: number;
  limite: number;
  planoNome: string;
  onReduzir: (novo: number) => void;
  onSeguir: () => void;
  onFechar: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onFechar]);

  // Maior opção da busca que ainda cabe. Pode não existir (ex.: sobram 10 e a
  // menor opção é 20) — aí só resta seguir e deixar o servidor cortar.
  const menor = [...QUANTIDADES]
    .filter((q) => q <= restante)
    .sort((a, b) => b - a)[0];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onFechar}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-cota"
        className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl"
      >
        <h2 id="titulo-cota" className="text-base font-semibold text-zinc-100">
          Sua cota do mês não cobre essa busca
        </h2>

        <p className="mt-3 text-sm text-muted">
          Você pediu <strong className="text-zinc-200">{pedido}</strong> Leads e
          ainda pode adicionar <strong className="text-zinc-200">{restante}</strong>{" "}
          este mês ({PLANOS_NA_UI ? `plano ${planoNome}: ` : ""}
          {limite}/mês).
        </p>

        <p className="mt-3 text-sm text-muted">
          Se continuar, o Orion busca os {pedido} no Google, guarda os{" "}
          {restante} de maior potencial e{" "}
          <strong className="text-amber-300">descarta os {pedido - restante}{" "}
          restantes</strong> — eles não ficam salvos, e a consulta ao Google é
          cobrada do mesmo jeito.
        </p>

        <p className="mt-3 text-xs text-muted">
          Os Leads que já estão na sua lista não são afetados: busca nova sempre
          soma, nunca substitui.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {menor ? (
            <button
              type="button"
              onClick={() => onReduzir(menor)}
              className="btn-primary"
            >
              Buscar só {menor}
            </button>
          ) : null}
          {PLANOS_NA_UI && (
            <Link href="/planos" className="btn-ghost">
              Ver planos
            </Link>
          )}
          <button type="button" onClick={onSeguir} className="btn-ghost">
            Continuar assim mesmo
          </button>
          <button type="button" onClick={onFechar} className="btn-ghost">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export function ColetarForm({
  restante,
  limite,
  planoNome,
}: {
  /** Leads novos que ainda cabem na competência (F035). */
  restante: number;
  limite: number;
  planoNome: string;
}) {
  const [state, action, pending] = useActionState(coletarLeads, initial);
  const form = useRef<HTMLFormElement>(null);
  // Aberto quando a quantidade escolhida não cabe na cota do mês.
  const [avisoCota, setAvisoCota] = useState(false);
  const [uf, setUf] = useState("");
  const [municipios, setMunicipios] = useState<string[]>([]);
  const [carregandoMunicipios, setCarregando] = useState(false);
  // Nicho começa VAZIO: com o primeiro da lista pré-selecionado, quem não
  // reparasse no campo buscava "dentista" achando que tinha escolhido — e o
  // erro só aparecia depois de gastar a consulta no Google.
  const [nicho, setNicho] = useState("");
  const [quantidade, setQuantidade] = useState<number>(QUANTIDADES[0]);
  // Cidade e bairro controlados: `<form action>` do React limpa campo não
  // controlado quando a ação termina, e era isso que "resetava os filtros" a
  // cada busca.
  const [municipio, setMunicipio] = useState("");
  const [bairro, setBairro] = useState("");
  const [termoLivre, setTermoLivre] = useState("");

  // Municípios da UF escolhida, sob demanda: a base inteira são 5.571 nomes e
  // não pode ir pro bundle (F033 AC8).
  useEffect(() => {
    // Trocar de UF limpa a cidade escolhida: "Porto Alegre" com o estado em SP
    // é busca que não acha nada e não diz por quê.
    setMunicipio("");
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

      {restante <= 0 && (
        <p className="alert-erro mt-4">
          Você já usou os {limite} Leads novos do mês
          {PLANOS_NA_UI ? ` (plano ${planoNome})` : ""}. Buscar agora gastaria
          consulta no Google sem poder salvar nada. Zera na virada do mês.{" "}
          {PLANOS_NA_UI && (
            <Link href="/planos" className="underline underline-offset-2">
              Ver planos
            </Link>
          )}
        </p>
      )}

      <form
        ref={form}
        action={action}
        onSubmit={(e) => {
          // O aviso vem ANTES: a chamada ao Places acontece do mesmo jeito, e
          // o que passa da cota é descartado. Ver F035, "Confirmação antes de
          // estourar".
          if (quantidade > restante) {
            e.preventDefault();
            setAvisoCota(true);
          }
        }}
        className="mt-4 flex flex-col gap-3"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-400">Nicho</span>
            <select
              name="nicho"
              value={nicho}
              onChange={(e) => setNicho(e.target.value)}
              required
              className="input-base"
            >
              <option value="">Selecione o nicho</option>
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

          {/* `<label>` não embrulha mais o campo: o combobox tem `role` e
              `aria-controls` próprios, e um label envolvendo o painel faria o
              clique numa opção contar como clique no label. */}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-zinc-400">Cidade</span>
            <ComboBox
              name="municipio"
              opcoes={municipios}
              valor={municipio}
              onChange={setMunicipio}
              required
              disabled={!uf || carregandoMunicipios}
              placeholder={
                !uf
                  ? "Escolha o estado primeiro"
                  : carregandoMunicipios
                    ? "Carregando…"
                    : "Digite para filtrar"
              }
            />
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-400">Bairro (opcional)</span>
            {/* Controlado: `<form action>` do React limpa campo NÃO controlado
                depois que a ação termina, e era isso que apagava cidade e
                bairro a cada busca. */}
            <input
              name="bairro"
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
              placeholder="Batel"
              className="input-base"
            />
          </label>
        </div>

        {nicho === NICHO_OUTRO && (
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-400">
              O que buscar (texto livre)
            </span>
            <input
              name="termoLivre"
              value={termoLivre}
              onChange={(e) => setTermoLivre(e.target.value)}
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
          <span className="text-xs text-muted">
            {restante} de {limite} ainda cabem este mês
          </span>
          <button
            type="submit"
            disabled={pending || restante <= 0}
            className="btn-primary ml-auto"
          >
            {pending ? "Buscando..." : "Buscar"}
          </button>
        </div>
      </form>

      {avisoCota && (
        <DialogoCota
          pedido={quantidade}
          restante={restante}
          limite={limite}
          planoNome={planoNome}
          onReduzir={(novo) => {
            setQuantidade(novo);
            setAvisoCota(false);
            // Espera o radio refletir o valor novo antes de submeter.
            setTimeout(() => form.current?.requestSubmit(), 0);
          }}
          onSeguir={() => {
            setAvisoCota(false);
            setTimeout(() => form.current?.requestSubmit(), 0);
          }}
          onFechar={() => setAvisoCota(false)}
        />
      )}

      {/* A busca demora e o resultado chega depois; sem `aria-live` o leitor de
          tela não anuncia nada e a pessoa não sabe se achou Lead ou deu erro. */}
      <div role="status" aria-live="polite">
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
          {state.foraDaCota > 0 && (
            <p className="text-xs text-amber-300">
              <strong>{state.foraDaCota}</strong> resultado(s) não couberam no
              limite do mês e foram descartados — ficaram os de maior potencial.{" "}
              {PLANOS_NA_UI && (
                <Link href="/planos" className="underline underline-offset-2">
                  Ver planos
                </Link>
              )}
            </p>
          )}
          {state.ampliou && (
            <p className="text-xs text-amber-300">
              Nenhum resultado com o tipo exato — ampliamos a busca sem o
              filtro de categoria.
            </p>
          )}
          {/* O aprofundamento automático saiu daqui em 2026-08-14. Ele
              despejava no meio do formulário de busca o progresso de uma
              operação longa e, quando a cota do dia acabava, um aviso de
              limite — bem embaixo do campo onde o aluno acabou de buscar e
              está prestes a buscar de novo. A busca volta a terminar no
              resultado da busca.

              O aprofundamento continua onde ele é a ação principal: a Fila do
              dia (F025) e a Central de Tarefas (F031). */}
        </div>
      )}
      </div>
    </div>
  );
}
