import { describe, expect, it } from "vitest";
import {
  PASSOS,
  passosComEstado,
  type FatosDoAluno,
  type PassoId,
} from "@/lib/tutorial/passos";

// F039 — a regra de "feito" de cada passo.
// Spec: /specs/02-features/F039-primeiros-passos.md (AC3 a AC7)

/** Conta zerada em BYOK: nada configurado, nada coletado. */
const ZERADA: FatosDoAluno = {
  chavesFaltando: 2,
  modoOrion: false,
  leads: 0,
  leadsConfirmados: 0,
  abordagensGeradas: 0,
  abordagensEnviadas: 0,
  leadsAlemDeContatado: 0,
};

function fatos(patch: Partial<FatosDoAluno>): FatosDoAluno {
  return { ...ZERADA, ...patch };
}

function idAtual(f: FatosDoAluno): PassoId | null {
  return passosComEstado(f).passos.find((p) => p.atual)?.id ?? null;
}

function passo(f: FatosDoAluno, id: PassoId) {
  const p = passosComEstado(f).passos.find((x) => x.id === id);
  if (!p) throw new Error(`passo ${id} não existe`);
  return p;
}

describe("catálogo", () => {
  it("é a ordem do trabalho, sem id repetido", () => {
    expect(PASSOS.map((p) => p.id)).toEqual([
      "chaves",
      "buscar",
      "aprofundar",
      "abordar",
      "funil",
    ]);
  });

  it("todo passo tem para onde levar", () => {
    for (const p of PASSOS) {
      expect(p.acao.href.startsWith("/")).toBe(true);
      expect(p.acao.label.length).toBeGreaterThan(0);
    }
  });
});

describe("AC3 — conta zerada em BYOK", () => {
  it("cinco passos, nenhum feito, e o atual é ligar as chaves", () => {
    const estado = passosComEstado(ZERADA);
    expect(estado.feitos).toBe(0);
    expect(estado.total).toBe(5);
    expect(estado.concluido).toBe(false);
    expect(idAtual(ZERADA)).toBe("chaves");
  });

  it("diz quantas chaves faltam", () => {
    expect(passo(ZERADA, "chaves").detalhe).toBe(
      "2 chaves essenciais faltando.",
    );
    expect(passo(fatos({ chavesFaltando: 1 }), "chaves").detalhe).toBe(
      "1 chave essencial faltando.",
    );
  });
});

describe("AC4 — modo Orion", () => {
  const orion = fatos({ chavesFaltando: 0, modoOrion: true });

  it("o passo das chaves não entra na lista, e o contador é de 4", () => {
    const estado = passosComEstado(orion);
    expect(estado.passos.map((p) => p.id)).toEqual([
      "buscar",
      "aprofundar",
      "abordar",
      "funil",
    ]);
    expect(estado.total).toBe(4);
    // Nada de "1 feito" de brinde: o aluno não fez nada ainda.
    expect(estado.feitos).toBe(0);
    expect(idAtual(orion)).toBe("buscar");
  });

  it("em BYOK o passo continua lá, e diz quando já foi resolvido", () => {
    const byok = fatos({ chavesFaltando: 0 });
    expect(passo(byok, "chaves").feito).toBe(true);
    expect(passo(byok, "chaves").detalhe).toBe("Chaves configuradas.");
    expect(passosComEstado(byok).total).toBe(5);
  });
});

describe("aprofundar", () => {
  const comLeads = fatos({ chavesFaltando: 0, leads: 20 });

  it("coletar não é aprofundar: só score confirmado conclui", () => {
    expect(passo(comLeads, "buscar").feito).toBe(true);
    expect(passo(comLeads, "aprofundar").feito).toBe(false);
    expect(passo(comLeads, "aprofundar").detalhe).toBe(
      "20 Leads esperando Diagnóstico.",
    );

    const aprofundado = { ...comLeads, leadsConfirmados: 3 };
    expect(passo(aprofundado, "aprofundar").feito).toBe(true);
    expect(passo(aprofundado, "aprofundar").detalhe).toBe(
      "3 Leads com score confirmado.",
    );
  });

  it("base descartada inteira reabre a busca", () => {
    expect(idAtual(fatos({ chavesFaltando: 0 }))).toBe("buscar");
  });
});

describe("AC5 — Abordagem gerada não é Abordagem enviada", () => {
  const base = fatos({ chavesFaltando: 0, leads: 20, leadsConfirmados: 5 });

  it("gerada e não enviada deixa o passo em aberto, e diz por quê", () => {
    const gerou = { ...base, abordagensGeradas: 2 };
    expect(passo(gerou, "abordar").feito).toBe(false);
    expect(passo(gerou, "abordar").detalhe).toBe(
      "2 Abordagens geradas e nenhuma marcada como enviada.",
    );
    expect(idAtual(gerou)).toBe("abordar");
  });

  it("marcada como enviada conclui", () => {
    const enviou = { ...base, abordagensGeradas: 2, abordagensEnviadas: 1 };
    expect(passo(enviou, "abordar").feito).toBe(true);
    expect(passo(enviou, "abordar").detalhe).toBe("1 Abordagem enviada.");
  });
});

describe("AC6 — o funil só conta se o aluno mexeu nele", () => {
  // Marcar como enviada já promove o Lead pra `contatado`, então este é o
  // estado logo depois do passo 4 — e o passo 5 tem que continuar aberto.
  const depoisDoEnvio = fatos({
    chavesFaltando: 0,
    leads: 20,
    leadsConfirmados: 5,
    abordagensGeradas: 2,
    abordagensEnviadas: 1,
    leadsAlemDeContatado: 0,
  });

  it("contatado não fecha o passo do funil", () => {
    expect(passo(depoisDoEnvio, "abordar").feito).toBe(true);
    expect(passo(depoisDoEnvio, "funil").feito).toBe(false);
    expect(idAtual(depoisDoEnvio)).toBe("funil");
  });

  it("qualquer estágio adiante fecha", () => {
    const andou = { ...depoisDoEnvio, leadsAlemDeContatado: 1 };
    expect(passo(andou, "funil").feito).toBe(true);
    expect(passo(andou, "funil").detalhe).toBe("1 Lead andou no funil.");
  });
});

describe("AC7 — passo atual", () => {
  it("é o primeiro não feito, e é único", () => {
    // Buraco no meio: chaves e busca feitas, aprofundar não, mas o aluno já
    // abordou (base importada, por exemplo). O atual é o buraco, não o fim.
    const furado = fatos({
      chavesFaltando: 0,
      leads: 10,
      leadsConfirmados: 0,
      abordagensEnviadas: 1,
      leadsAlemDeContatado: 1,
    });
    const estado = passosComEstado(furado);
    expect(estado.passos.filter((p) => p.atual)).toHaveLength(1);
    expect(idAtual(furado)).toBe("aprofundar");
    expect(estado.feitos).toBe(4);
  });

  it("passo feito não some da lista", () => {
    // BYOK com as chaves já coladas: o passo 1 fica, marcado. Some só o que
    // nunca foi passo pra aquele aluno (as chaves no modo Orion, AC4).
    const estado = passosComEstado(fatos({ chavesFaltando: 0, leads: 4 }));
    expect(estado.passos).toHaveLength(5);
    expect(estado.passos[0]?.id).toBe("chaves");
    expect(estado.passos[0]?.feito).toBe(true);
  });
});

describe("AC10 — ciclo fechado", () => {
  const completo = fatos({
    chavesFaltando: 0,
    modoOrion: true,
    leads: 47,
    leadsConfirmados: 12,
    abordagensGeradas: 8,
    abordagensEnviadas: 6,
    leadsAlemDeContatado: 2,
  });

  it("marca tudo feito e não sobra passo atual", () => {
    const estado = passosComEstado(completo);
    expect(estado.concluido).toBe(true);
    expect(estado.feitos).toBe(estado.total);
    // Modo Orion: o ciclo fecha em 4, não em 5.
    expect(estado.total).toBe(4);
    expect(estado.passos.some((p) => p.atual)).toBe(false);
  });
});
