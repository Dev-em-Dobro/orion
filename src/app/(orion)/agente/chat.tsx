"use client";

// F029 — chat do Agente Orion.
// Spec: /specs/02-features/F029-agente-orion.md
//
// Histórico só na sessão do navegador (não persiste — está no Fora do escopo
// da spec). Streaming via fetch + reader: a resposta aparece enquanto o loop
// de ferramentas ainda roda no servidor.

import { useRef, useState } from "react";
import { SUGESTOES } from "@/lib/agente/prompt";

type Mensagem = { role: "user" | "assistant"; content: string };

export function Chat() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [entrada, setEntrada] = useState("");
  const [pensando, setPensando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fim = useRef<HTMLDivElement>(null);

  async function enviar(texto: string) {
    const pergunta = texto.trim();
    if (!pergunta || pensando) return;

    setErro(null);
    setEntrada("");
    const historico: Mensagem[] = [
      ...mensagens,
      { role: "user", content: pergunta },
    ];
    setMensagens(historico);
    setPensando(true);

    try {
      const res = await fetch("/api/agente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagens: historico }),
      });

      if (!res.ok || !res.body) {
        const corpo = await res.json().catch(() => null);
        setErro(corpo?.erro ?? "Não consegui responder agora.");
        setPensando(false);
        return;
      }

      // Placeholder que vai sendo preenchido conforme o texto chega.
      setMensagens((m) => [...m, { role: "assistant", content: "" }]);

      const leitor = res.body.getReader();
      const decoder = new TextDecoder();
      let acumulado = "";

      for (;;) {
        const { done, value } = await leitor.read();
        if (done) break;
        acumulado += decoder.decode(value, { stream: true });
        setMensagens((m) => {
          const proximo = [...m];
          proximo[proximo.length - 1] = {
            role: "assistant",
            content: acumulado,
          };
          return proximo;
        });
        fim.current?.scrollIntoView({ behavior: "smooth" });
      }

      if (!acumulado.trim()) {
        setErro("O agente não retornou texto. Tente reformular a pergunta.");
        setMensagens((m) => m.slice(0, -1));
      }
    } catch {
      setErro("Falha de rede ao falar com o agente.");
    } finally {
      setPensando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {mensagens.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-zinc-300">
            Pergunte sobre os seus Leads. O agente consulta a sua base — não
            inventa número.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGESTOES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void enviar(s)}
                className="rounded-full border border-border px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <ul className="space-y-3">
        {mensagens.map((m, i) => (
          <li
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-xl bg-primary/15 p-3 text-sm text-zinc-100"
                : "max-w-[85%] rounded-xl border border-border bg-card p-3 text-sm whitespace-pre-wrap text-zinc-200"
            }
          >
            {m.content ||
              (pensando ? (
                <span className="text-muted">consultando os seus dados…</span>
              ) : null)}
          </li>
        ))}
      </ul>
      <div ref={fim} />

      {erro && <p className="text-sm text-red-400">{erro}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void enviar(entrada);
        }}
        className="sticky bottom-4 flex gap-2"
      >
        <input
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
          placeholder="Pergunte alguma coisa sobre os seus Leads"
          className="input-base flex-1"
          disabled={pensando}
        />
        <button
          type="submit"
          disabled={pensando || entrada.trim().length === 0}
          className="btn-primary"
        >
          {pensando ? "..." : "Enviar"}
        </button>
      </form>
    </div>
  );
}
