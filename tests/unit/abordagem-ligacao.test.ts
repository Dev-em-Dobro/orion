import { describe, expect, it } from "vitest";
import { ehRoteiroFalado, ROTULO_CANAL } from "@/lib/abordagem/canais";
import {
  gerarAbordagem,
  gerarRoteiroLigacao,
  type ContextoLead,
} from "@/lib/abordagem/gerarAbordagem";

// F038 — abordagem por voz. Spec: /specs/02-features/F038-abordagem-por-voz.md
//
// Emenda de 2026-08-16: estes testes olhavam o **system prompt** ("o prompt
// contém a frase 'nunca dite a URL'"), que era o máximo que dava pra verificar
// quando a saída vinha de um modelo. Com a montagem em código eles passam a
// olhar **a saída**. É a diferença entre testar o pedido e testar o resultado.
const CTX: ContextoLead = {
  nome: "Clínica Vet Amigo",
  categoria: "veterinary_care",
  endereco: "Rua X, 100",
  dores: [
    {
      tipo: "SITE_LENTO",
      severidade: "ALTA",
      detalhes: "site muito lento no celular (nota 31/100)",
    },
  ],
  seed: "clh1x2y3z4a5b6c7d8e9f0",
};

describe("canais", () => {
  it("só `ligacao` é roteiro falado — é o que tira o wa.me da UI (AC4)", () => {
    expect(ehRoteiroFalado("ligacao")).toBe(true);
    expect(ehRoteiroFalado("whatsapp")).toBe(false);
  });

  it("todo canal do enum tem rótulo em PT", () => {
    expect(ROTULO_CANAL.ligacao).toBe("Ligação ou áudio");
    expect(ROTULO_CANAL.whatsapp).toBe("WhatsApp");
  });

  // `email` saiu do enum em 2026-08-13 junto com o resto da F027. Quem garante
  // que nenhum canal fica sem rótulo é o `Record<Canal, string>` no tipo — este
  // teste só trava a contagem, pra canal novo não entrar sem passar por aqui.
  it("não sobrou canal órfão nem legado", () => {
    expect(Object.keys(ROTULO_CANAL).sort()).toEqual(["ligacao", "whatsapp"]);
  });
});

describe("roteiro falado (F038)", () => {
  const url = "https://demos.exemplo.com/vet-amigo";

  it("nunca leva URL, nem quando o Lead tem demo (AC3)", () => {
    // Antes isto era uma instrução no prompt e uma torcida. Agora o montador
    // do roteiro simplesmente não lê `demoUrl`.
    const { mensagem } = gerarRoteiroLigacao({ ...CTX, demoUrl: url });
    expect(mensagem).not.toContain(url);
    expect(mensagem).not.toContain("http");
  });

  it("marca as pausas, porque quem lê é o aluno (AC3)", () => {
    const { mensagem } = gerarRoteiroLigacao(CTX);
    expect(mensagem).toContain("(pausa)");
  });

  it("o follow-up falado é mais curto que o primeiro contato", () => {
    const primeira = gerarRoteiroLigacao(CTX, "primeira").mensagem;
    const followup = gerarRoteiroLigacao(CTX, "followup").mensagem;
    expect(followup.length).toBeLessThan(primeira.length);
  });

  it("não é o mesmo texto da mensagem escrita — o tom é outro", () => {
    expect(gerarRoteiroLigacao(CTX).mensagem).not.toBe(
      gerarAbordagem(CTX).mensagem,
    );
  });
});

describe("site de amostra na mensagem escrita (F038 / F005 AC16)", () => {
  const url = "https://demos.exemplo.com/vet-amigo";

  it("sem demo, nenhuma URL: não há link pra inventar", () => {
    const { mensagem } = gerarAbordagem(CTX);
    expect(mensagem).not.toContain("http");
    expect(mensagem).toContain("Clínica Vet Amigo");
  });

  it("com demo, a URL entra crua e em linha própria no fim", () => {
    const { mensagem } = gerarAbordagem({ ...CTX, demoUrl: url });
    expect(mensagem.endsWith(url)).toBe(true);
    // Crua: reescrever link é a forma mais fácil de entregar link quebrado.
    expect(mensagem).toContain(url);
  });

  it("demoUrl null é tratado como ausente", () => {
    expect(gerarAbordagem({ ...CTX, demoUrl: null }).mensagem).not.toContain(
      "http",
    );
  });
});
