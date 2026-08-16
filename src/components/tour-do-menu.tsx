"use client";

// F040 — o tour do menu: acende um item por vez e fala dele.
// Spec: /specs/02-features/F040-tour-do-menu.md
//
// Três camadas, todas `fixed`:
//
//   bloqueio (z-70)  transparente, come o clique da página enquanto o tour roda
//   recorte  (z-71)  do tamanho do alvo; é o `box-shadow` dele que escurece o
//                    resto da tela — o alvo não é apagado, ele fica no buraco
//   balão    (z-72)  o texto, posicionado por aritmética
//
// O alvo **não é levantado de camada**, e não por preguiça: a sidebar é `z-40`
// posicionada, logo um contexto de empilhamento, e nada de dentro dela sobe
// acima de um overlay irmão. Por isso o escuro vem de fora pra dentro.
//
// Nenhuma consulta, nenhuma Server Action: o menu é o mesmo pra todo mundo
// (tirando o cadeado do plano, que a sidebar já tem em mãos). É o único
// tutorial do app que funciona com o banco fora do ar.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { IconeCadeado } from "@/components/icones";
import type { Plano } from "@/lib/planos/catalogo";
import { classeDoTemaDoCookie } from "@/lib/tema";
import {
  AVISO_BLOQUEADO,
  LARGURA_BALAO,
  passosDoTour,
  posicionarBalao,
  type PassoDoTourComEstado,
  type Posicao,
  type Retangulo,
} from "@/lib/tutorial/tour";

/** Folga entre o anel do recorte e o item, em px. */
const FOLGA_RECORTE = 4;

/**
 * O elemento **visível** com aquele `data-tour`.
 *
 * Sidebar do desktop e drawer do mobile marcam o mesmo item com a mesma chave,
 * e só um dos dois tem caixa por vez (`hidden md:flex` de um lado, `md:hidden`
 * do outro). Quem decide é o retângulo, não a largura da janela: assim não há
 * um segundo lugar no código guardando qual é o breakpoint do menu.
 */
function alvoVisivel(chave: string): HTMLElement | null {
  const candidatos = Array.from(
    document.querySelectorAll<HTMLElement>(`[data-tour="${chave}"]`),
  );
  return (
    candidatos.find((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }) ?? null
  );
}

function retanguloDe(el: HTMLElement | null): Retangulo | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, largura: r.width, altura: r.height };
}

export function TourDoMenu({
  plano,
  onFim,
}: {
  /** F035 — decide o aviso de "fechado no seu plano". */
  plano: Plano;
  onFim: () => void;
}) {
  // Os passos são fixados na abertura, e os sem alvo no DOM caem aqui: é isto
  // que faz o tour **degradar** em vez de quebrar quando um item some do menu
  // (Skills sem skill publicada, rota renomeada). Recalcular a cada passo faria
  // o total do contador dançar no meio do tour.
  //
  // Em efeito de layout, e não no primeiro render: no mobile, quem começa o
  // tour **abre o drawer no mesmo commit**. Durante o render os itens dele
  // ainda não existem no DOM, e o filtro descartaria o menu inteiro.
  const [passos, setPassos] = useState<PassoDoTourComEstado[]>([]);
  const [indice, setIndice] = useState(0);
  const [alvo, setAlvo] = useState<Retangulo | null>(null);
  const [posicao, setPosicao] = useState<Posicao | null>(null);
  // Lido uma vez: trocar de tema recarrega a página, e o tour não sobrevive a
  // isso. No servidor não há `document`, mas este componente só é montado
  // depois de um clique.
  const [classeTema] = useState(() => classeDoTemaDoCookie(document.cookie));
  const [suave] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const balao = useRef<HTMLDivElement>(null);

  const passo = passos[indice];
  const ultimo = indice === passos.length - 1;

  useLayoutEffect(() => {
    setPassos(
      passosDoTour(plano).filter((p) => p.alvo === null || alvoVisivel(p.alvo)),
    );
  }, [plano]);

  const medir = useCallback(() => {
    const atual = passos[indice];
    if (!atual) return;
    const retangulo = retanguloDe(atual.alvo ? alvoVisivel(atual.alvo) : null);
    setAlvo(retangulo);
    setPosicao(
      posicionarBalao(
        retangulo,
        {
          largura: LARGURA_BALAO,
          // A altura do balão do passo atual: o efeito de layout roda **depois**
          // do DOM já ter o texto novo, então o que se mede aqui é o balão que
          // está prestes a aparecer, não o do passo anterior.
          altura: balao.current?.offsetHeight ?? 200,
        },
        { largura: window.innerWidth, altura: window.innerHeight },
      ),
    );
  }, [indice, passos]);

  // `useLayoutEffect` e não `useEffect`: a medição vira estado, e o estado vira
  // posição. No efeito comum o balão pintaria uma vez no lugar do passo
  // anterior antes de saltar pro novo.
  useLayoutEffect(() => {
    const atual = passos[indice];
    // A `nav` da sidebar rola por dentro: em tela baixa, "Configuração" pode
    // estar fora de vista quando o tour chega nele.
    if (atual?.alvo) {
      alvoVisivel(atual.alvo)?.scrollIntoView({ block: "nearest" });
    }
    medir();
  }, [indice, medir, passos]);

  // Rolagem em captura: o `scroll` da `nav` interna não sobe por bubbling, e é
  // justamente ela que move o alvo debaixo do recorte.
  useEffect(() => {
    window.addEventListener("resize", medir);
    window.addEventListener("scroll", medir, true);
    return () => {
      window.removeEventListener("resize", medir);
      window.removeEventListener("scroll", medir, true);
    };
  }, [medir]);

  // Trava a rolagem do fundo (mesma regra do drawer e do painel da F039).
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // O foco entra no balão a cada passo. É o que faz o leitor de tela anunciar o
  // passo novo — sem isso o teclado fica no gatilho, atrás do bloqueio.
  //
  // `visivel` na dependência e não só `indice`: antes da primeira medição o
  // balão está `visibility: hidden`, e elemento invisível **não aceita foco** —
  // o `focus()` do primeiro passo caía no vazio e o tour abria com o teclado
  // ainda na página de trás. O sinal vira `true` uma vez e não volta.
  const visivel = posicao !== null;
  useEffect(() => {
    if (visivel) balao.current?.focus();
  }, [indice, visivel]);

  const avancar = useCallback(() => {
    setIndice((i) => (i + 1 < passos.length ? i + 1 : i));
    if (ultimo) onFim();
  }, [passos.length, ultimo, onFim]);

  const voltar = useCallback(() => {
    setIndice((i) => Math.max(0, i - 1));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onFim();
        return;
      }
      // Enter com o foco num botão é do botão: senão "Próximo" andava dois
      // passos de uma vez (o clique dele e este atalho).
      const emBotao = (e.target as HTMLElement | null)?.tagName === "BUTTON";
      if ((e.key === "ArrowRight" || (e.key === "Enter" && !emBotao))) {
        e.preventDefault();
        avancar();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        voltar();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [avancar, voltar, onFim]);

  if (!passo) return null;

  return (
    // O tour cobre a tela inteira, então quem manda é o tema do app — não o
    // canto de onde ele foi aberto. `background-color` explícito porque
    // `.tema-claro` declara o fundo da coluna de conteúdo, e aqui isso seria
    // uma faixa clara no meio da página.
    <div className={classeTema} style={{ backgroundColor: "transparent" }}>
      {/* Bloqueio: enquanto o tour roda, o clique é do tour. Clicar encerra —
          mesma regra de "clique fora fecha" dos diálogos da F035 e da F039. */}
      <button
        type="button"
        aria-label="Encerrar o tour"
        onClick={onFim}
        className="fixed inset-0 z-[70] cursor-default"
        // Sem alvo (passo de abertura) não há recorte, então o escurecimento
        // tem que vir daqui.
        style={{
          backgroundColor: alvo ? "transparent" : "rgb(0 0 0 / 0.65)",
        }}
      />

      {alvo && (
        <div
          aria-hidden
          className="fixed z-[71] rounded-lg"
          style={{
            top: alvo.top - FOLGA_RECORTE,
            left: alvo.left - FOLGA_RECORTE,
            width: alvo.largura + FOLGA_RECORTE * 2,
            height: alvo.altura + FOLGA_RECORTE * 2,
            // O buraco não come clique: quem faz isso é o bloqueio, embaixo.
            pointerEvents: "none",
            // Duas sombras: o anel, e o spread que escurece o resto da tela.
            // `100vmax` cobre a viewport a partir de qualquer ponto dela.
            boxShadow:
              "0 0 0 2px var(--color-primary), 0 0 0 100vmax rgb(0 0 0 / 0.65)",
            // O deslize é o que mostra que o tour andou. Sob
            // `prefers-reduced-motion` ele salta.
            transition: suave
              ? "top 200ms ease, left 200ms ease, width 200ms ease, height 200ms ease"
              : undefined,
          }}
        />
      )}

      <div
        ref={balao}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-tour"
        className="fixed z-[72] rounded-xl border border-border bg-card p-5 shadow-2xl focus:outline-none"
        style={{
          width: LARGURA_BALAO,
          top: posicao?.top ?? 0,
          left: posicao?.left ?? 0,
          // Antes da primeira medição o balão precisa existir no DOM pra ter
          // altura — mas não pode piscar no canto da tela.
          visibility: visivel ? "visible" : "hidden",
          // Só a partir do segundo passo. No primeiro, a transição existiria
          // entre o 0,0 de antes da medição e a posição medida — o balão
          // nasceria deslizando do canto superior esquerdo da tela.
          transition:
            suave && indice > 0 ? "top 200ms ease, left 200ms ease" : undefined,
        }}
      >
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-xs font-medium tracking-wider text-muted uppercase">
            Tour do menu
          </p>
          <p className="shrink-0 text-xs text-muted">
            {indice + 1} de {passos.length}
          </p>
        </div>

        <h2
          id="titulo-tour"
          className="mt-2 text-base font-semibold tracking-tight text-foreground"
        >
          {passo.titulo}
        </h2>

        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          {passo.texto}
        </p>

        {/* F035 — o passo do item fechado não some: é ele que explica o
            cadeado que o aluno está vendo aceso na frente dele. */}
        {passo.bloqueado && (
          <p className="mt-3 flex items-start gap-2 rounded-lg border border-border bg-card-raised px-3 py-2 text-xs leading-relaxed text-muted">
            <span className="mt-0.5 shrink-0 text-primary">
              <IconeCadeado className="h-3.5 w-3.5" />
            </span>
            {AVISO_BLOQUEADO}
          </p>
        )}

        <div className="mt-5 flex items-center justify-between gap-2">
          <button type="button" onClick={onFim} className="btn-ghost">
            Pular
          </button>
          <div className="flex gap-2">
            {indice > 0 && (
              <button type="button" onClick={voltar} className="btn-ghost">
                Anterior
              </button>
            )}
            <button type="button" onClick={avancar} className="btn-primary">
              {ultimo ? "Entendi" : "Próximo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
