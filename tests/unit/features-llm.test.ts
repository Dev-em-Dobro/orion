import { describe, expect, it, vi } from "vitest";
import { LlmError, type LlmClient } from "@/lib/llm";
import { MAX_TURNOS } from "@/lib/simulador/constantes";
import {
  montarTranscript,
  systemPromptPersona,
} from "@/lib/simulador/prompt";
import { avaliarSimulacao } from "@/lib/simulador/avaliar";
import { simularTurno, SimuladorError } from "@/lib/simulador/simular";
// Abordagem e Proposta saíram deste arquivo em 2026-08-16: as duas deixaram de
// usar LLM. A cobertura delas vive em `abordagem-montagem.test.ts`,
// `abordagem-ligacao.test.ts` e `proposta-montagem.test.ts`.
import { montarContextoObjecao } from "@/lib/objecoes/prompt";
import { responderObjecao, ObjecaoError } from "@/lib/objecoes/responderObjecao";
import { montarTema } from "@/lib/conteudo/prompt";
import { sugerirVideos, ConteudoError } from "@/lib/conteudo/sugerirVideos";
import { analisarUx, AnaliseUxError } from "@/lib/diagnostico-ux/analisarUx";

function fakeLlm(partial: Partial<LlmClient> = {}): LlmClient {
  return {
    provider: "anthropic",
    generateText: vi.fn(),
    generateStructured: vi.fn(),
    generateVisionStructured: vi.fn(),
    ...partial,
  };
}

describe("prompts (builders)", () => {
  it("objecao / conteudo / simulador", () => {
    expect(
      montarContextoObjecao({
        nome: "A",
        categoria: "cafe",
        dores: [],
        mensagemDoLead: "tá caro",
      }),
    ).toContain("tá caro");

    expect(montarTema("prospecção local")).toContain("Tema/foco");

    const cenario = {
      categoria: "dentist",
      dores: ["sem site"],
      dificuldade: "medio" as const,
    };
    expect(systemPromptPersona(cenario, false)).toContain("ROLEPLAY");
    expect(systemPromptPersona(cenario, true)).toMatch(/fecho educado/);
    expect(
      montarTranscript(cenario, [
        { papel: "aluno", texto: "oi" },
        { papel: "dono", texto: "fala" },
      ]),
      // Tag fechada, não prefixo solto: `TREINANDO:` o aluno digitava dentro
      // da própria fala e forjava linha (emenda de 2026-08-14).
    ).toContain("<treinando>oi</treinando>");
    expect(MAX_TURNOS).toBe(20);
  });
});

describe("wrappers LLM (mock client)", () => {
  const lead = {
    nome: "Clínica",
    categoria: "dentist",
    endereco: "Rua",
    dores: ["sem site"],
  };

  it("responderObjecao / sugerirVideos / analisarUx", async () => {
    const llm = fakeLlm({
      generateStructured: vi.fn().mockResolvedValue({
        respostas: [{ abordagem: "preço", texto: "entendo" }],
      }),
    });
    expect(
      await responderObjecao(
        { ...lead, mensagemDoLead: "caro" },
        llm,
      ),
    ).toMatchObject({ respostas: [{ texto: "entendo" }] });

    const llmC = fakeLlm({
      generateStructured: vi.fn().mockResolvedValue({
        ideias: [
          {
            titulo: "t",
            formato: "short",
            atrai: "a",
            etapa: "topo",
            cta: "c",
            roteiro: ["1"],
          },
        ],
      }),
    });
    expect(await sugerirVideos("tema", llmC)).toHaveLength(1);

    const llmV = fakeLlm({
      generateVisionStructured: vi.fn().mockResolvedValue({
        resumo: "ok",
        problemas: [],
        pontos_positivos: [],
      }),
    });
    expect(
      await analisarUx(
        {
          nome: "X",
          categoria: "cafe",
          desktopB64: "aa",
          mobileB64: "bb",
        },
        llmV,
      ),
    ).toMatchObject({ resumo: "ok" });

    const fail = fakeLlm({
      generateStructured: vi
        .fn()
        .mockRejectedValue(new LlmError(500, "fail")),
    });
    await expect(
      responderObjecao({ ...lead, mensagemDoLead: "x" }, fail),
    ).rejects.toBeInstanceOf(ObjecaoError);
    await expect(sugerirVideos("t", fail)).rejects.toBeInstanceOf(
      ConteudoError,
    );
    await expect(
      analisarUx(
        { nome: "X", categoria: "y", desktopB64: "a", mobileB64: "b" },
        fakeLlm({
          generateVisionStructured: vi
            .fn()
            .mockRejectedValue(new LlmError(500, "fail")),
        }),
      ),
    ).rejects.toBeInstanceOf(AnaliseUxError);
  });

  it("simularTurno e avaliarSimulacao", async () => {
    const cenario = {
      categoria: "cafe",
      dores: [],
      dificuldade: "facil" as const,
    };
    const hist = [{ papel: "aluno" as const, texto: "oi" }];
    const llm = fakeLlm({
      generateText: vi.fn().mockResolvedValue("olá"),
      generateStructured: vi.fn().mockResolvedValue({
        competencias: [],
        nota_geral: 7,
        pontos_fortes: [],
        o_que_melhorar: ["x"],
      }),
    });
    expect(await simularTurno(cenario, hist, llm)).toEqual({
      mensagem: "olá",
    });
    expect(await avaliarSimulacao(cenario, hist, llm)).toMatchObject({
      nota_geral: 7,
    });

    const bad = fakeLlm({
      generateText: vi.fn().mockRejectedValue(new LlmError(0, "x")),
    });
    await expect(simularTurno(cenario, hist, bad)).rejects.toBeInstanceOf(
      SimuladorError,
    );
  });
});
