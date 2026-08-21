"use client";

// F039 — botão fixo no menu que abre a sequência do trabalho.
// Spec: /specs/02-features/F039-primeiros-passos.md
//
// O painel é o diálogo do item bloqueado da F035 (`sidebar.tsx`): mesma
// mecânica de Escape, clique fora e `aria-modal`. Não virou componente
// compartilhado ainda porque são dois — na terceira cópia vale extrair.
//
// O estado dos passos é carregado **na abertura**, não no render: consulta no
// shell é pedágio em toda rota (F028), e este painel abre uma vez por sessão.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { carregarPrimeirosPassos } from "@/actions/tutorial/primeirosPassos";
import { IconeBussola, IconeCheck } from "@/components/icones";
import { classeDoTemaDoCookie } from "@/lib/tema";
import type { EstadoDosPassos, PassoComEstado } from "@/lib/tutorial/passos";
import { EVENTO_TOUR } from "@/lib/tutorial/tour";

const TITULO = "Primeiros passos";

/** Marcador da esquerda: feito, atual ou futuro. */
function Marcador({ passo, numero }: { passo: PassoComEstado; numero: number }) {
  if (passo.feito) {
    return (
      <span
        className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
        aria-hidden
      >
        <IconeCheck className="h-3.5 w-3.5" />
      </span>
    );
  }
  return (
    <span
      className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
        passo.atual
          ? "bg-primary text-primary-foreground"
          : "border border-border text-muted"
      }`}
      aria-hidden
    >
      {numero}
    </span>
  );
}

function Passo({
  passo,
  numero,
  onNavegar,
}: {
  passo: PassoComEstado;
  numero: number;
  onNavegar: () => void;
}) {
  return (
    <li
      className={`flex gap-3 rounded-lg px-3 py-3 ${
        passo.atual ? "bg-card-raised" : ""
      }`}
    >
      <Marcador passo={passo} numero={numero} />

      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-semibold ${
            passo.feito ? "text-muted" : "text-foreground"
          }`}
        >
          {passo.titulo}
          {/* O estado vai no texto, não só na cor: quem não distingue a cor do
              marcador continua sabendo onde está. */}
          {passo.feito && <span className="sr-only"> — feito</span>}
          {passo.atual && <span className="sr-only"> — é aqui que você está</span>}
        </p>

        {/* Passo feito mostra só o número da base. O texto inteiro seria
            releitura de uma aula que ele já teve — e some da varredura visual
            justamente o que falta fazer. */}
        {!passo.feito && (
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {passo.oQueE}
          </p>
        )}
        {passo.atual && (
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">
            {passo.porQue}
          </p>
        )}
        {passo.detalhe && (
          <p className="mt-1 text-xs text-muted">{passo.detalhe}</p>
        )}

        {/* Um botão por painel, e só no passo atual: cinco botões primários é
            o oposto de dizer por onde começar. */}
        {passo.atual && (
          <Link
            href={passo.acao.href}
            onClick={onNavegar}
            className="btn-card mt-3"
          >
            {passo.acao.label}
          </Link>
        )}
      </div>
    </li>
  );
}

function Painel({
  estado,
  carregando,
  erro,
  classeTema,
  onFechar,
  onTour,
}: {
  estado: EstadoDosPassos | null;
  carregando: boolean;
  erro: string | null;
  classeTema: string;
  onFechar: () => void;
  onTour: () => void;
}) {
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onFechar]);

  // O foco entra no diálogo ao abrir: sem isso o teclado continua no gatilho,
  // atrás do overlay, e o Tab passeia pela página coberta.
  useEffect(() => {
    caixa.current?.focus();
  }, []);

  // Trava a rolagem do fundo enquanto o painel está aberto (mesma regra do
  // drawer do menu): sem isso a roda do mouse rola a página atrás do overlay
  // assim que a lista de passos chega no fim.
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center p-4 ${classeTema}`}
      // `.tema-claro` declara `background-color` pra pintar a coluna de
      // conteúdo, e aqui isso encheria a tela inteira de cinza claro por cima
      // da página. Estilo inline porque a regra do tema não está numa
      // `@layer` — uma utilitária do Tailwind perderia pra ela.
      style={{ backgroundColor: "transparent" }}
    >
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onFechar}
      />

      {/* Altura travada em 85vh e **a lista** é que rola: com os cinco passos
          abertos o painel passa da tela, e num overlay rolante o "N de 5" e o
          Fechar saem de vista — o cabeçalho é justamente o que diz onde o
          aluno está. */}
      <div
        ref={caixa}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-primeiros-passos"
        className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl border border-border bg-card p-6 shadow-2xl focus:outline-none"
      >
        <div className="flex shrink-0 items-start justify-between gap-4">
          <div>
            <h2
              id="titulo-primeiros-passos"
              className="text-lg font-semibold tracking-tight text-foreground"
            >
              {TITULO}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {estado?.concluido
                ? "Ciclo fechado. Repita a partir da busca sempre que a fila esvaziar."
                : "Do zero ao primeiro cliente, na ordem."}
            </p>
          </div>
          {estado && (
            <p className="shrink-0 text-sm text-muted">
              {estado.feitos} de {estado.total}
            </p>
          )}
        </div>

        {carregando && (
          <p className="mt-6 text-sm text-muted">consultando os seus dados…</p>
        )}

        {erro && <p className="mt-6 text-sm text-red-400">{erro}</p>}

        {estado && (
          // `-mx-1 px-1`: a barra de rolagem não corta o fundo do passo atual.
          <ol className="-mx-1 mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto px-1">
            {estado.passos.map((passo, i) => (
              <Passo
                key={passo.id}
                passo={passo}
                numero={i + 1}
                onNavegar={onFechar}
              />
            ))}
          </ol>
        )}

        {/* F040 — a outra metade da dúvida: este painel diz a ordem, o tour diz
            onde fica cada coisa. Quem chega aqui sem saber ler o menu ia embora
            com metade da resposta. */}
        <div className="mt-5 flex shrink-0 items-center justify-between gap-2">
          <button type="button" onClick={onTour} className="btn-ghost">
            Não sei o que é cada menu
          </button>
          <button type="button" onClick={onFechar} className="btn-ghost">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

export function PrimeirosPassos({
  variante = "menu",
}: {
  /** `menu`: item no rodapé da sidebar. `secundario`: ação de tela vazia. */
  variante?: "menu" | "secundario";
}) {
  const [aberto, setAberto] = useState(false);
  const [estado, setEstado] = useState<EstadoDosPassos | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Lido na abertura, nunca no render: no servidor não há `document`, e o
  // valor não muda enquanto o painel está aberto (trocar de tema recarrega).
  const [classeTema, setClasseTema] = useState("");
  const gatilho = useRef<HTMLButtonElement>(null);

  async function abrir() {
    setClasseTema(classeDoTemaDoCookie(document.cookie));
    setAberto(true);
    setErro(null);
    setCarregando(true);
    try {
      // Recarrega a cada abertura: o aluno acabou de trabalhar, e um painel
      // que ainda diz "0 Leads" depois da primeira busca ensina a coisa errada.
      setEstado(await carregarPrimeirosPassos());
    } catch {
      setErro("Não consegui carregar os seus passos agora.");
    } finally {
      setCarregando(false);
    }
  }

  function fechar() {
    setAberto(false);
    // Devolve o foco pra onde ele estava — senão o teclado volta pro topo da
    // página depois de fechar.
    gatilho.current?.focus();
  }

  // F040 — quem escuta é a `Sidebar`, que é dona do drawer do mobile: no
  // celular os itens de menu só existem no DOM com ele aberto, e este painel
  // também abre do Dashboard.
  function irProTour() {
    setAberto(false);
    window.dispatchEvent(new CustomEvent(EVENTO_TOUR));
  }

  const className =
    variante === "menu"
      ? "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-zinc-400 transition-colors duration-200 hover:bg-zinc-800/40 hover:text-zinc-200"
      : "btn-ghost px-3 py-2 text-sm";

  return (
    <>
      <button
        ref={gatilho}
        type="button"
        onClick={() => void abrir()}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        // F040 — último passo do tour: o botão que responde "e em que ordem?".
        data-tour={variante === "menu" ? "primeiros-passos" : undefined}
        className={className}
      >
        <span className={variante === "menu" ? "text-muted" : "mr-2"}>
          <IconeBussola />
        </span>
        {TITULO}
      </button>

      {aberto && (
        <Painel
          estado={estado}
          carregando={carregando}
          erro={erro}
          classeTema={classeTema}
          onFechar={fechar}
          onTour={irProTour}
        />
      )}
    </>
  );
}
