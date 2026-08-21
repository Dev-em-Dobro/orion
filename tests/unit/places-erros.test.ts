import { describe, expect, it } from "vitest";
import { mensagemDeErroPlaces } from "@/lib/places/erros";
import { PlacesError } from "@/lib/places/textSearch";

// O corpo que o Google devolveu de verdade quando o catálogo mandava
// `includedType: "psychologist"` — e que o aluno leu na tela, em vermelho,
// dentro do card de busca.
const CORPO_400 = JSON.stringify({
  error: {
    code: 400,
    message:
      "Invalid included_type: 'psychologist'. See full list of supported types at https://developers.google.com/maps/documentation/places/web-service/supported_types#table1",
    status: "INVALID_ARGUMENT",
  },
});

describe("mensagem de erro do Places (F033 AC16)", () => {
  it("nunca vaza o corpo cru do Google pra tela", () => {
    const status = [400, 401, 403, 429, 500, 503, 418];
    for (const s of status) {
      for (const modo of ["orion", "byok"] as const) {
        const { mensagem } = mensagemDeErroPlaces(
          new PlacesError(s, CORPO_400),
          modo,
        );
        expect(mensagem).not.toContain("INVALID_ARGUMENT");
        expect(mensagem).not.toContain("{");
        expect(mensagem).not.toContain("developers.google.com");
        expect(mensagem).not.toContain("included_type");
      }
    }
  });

  it("400 é bug nosso: não culpa o aluno e vai pro Sentry", () => {
    const r = mensagemDeErroPlaces(new PlacesError(400, CORPO_400), "orion");
    expect(r.reportar).toBe(true);
    // Tentar de novo com os mesmos campos dá no mesmo — a mensagem precisa
    // dizer isso, senão o aluno queima tentativas achando que foi ele.
    expect(r.mensagem).toMatch(/Orion/);
    expect(r.mensagem).toMatch(/outro nicho/i);
  });

  it("403 em BYOK manda conferir a chave; no modo Orion, não", () => {
    const byok = mensagemDeErroPlaces(new PlacesError(403, "..."), "byok");
    expect(byok.mensagem).toMatch(/Configuração/);
    expect(byok.reportar).toBe(false);

    // No modo Orion a chave não é do aluno: mandar ele conferir é mandar
    // consertar o que ele não tem acesso.
    const orion = mensagemDeErroPlaces(new PlacesError(403, "..."), "orion");
    expect(orion.mensagem).not.toMatch(/Configuração/);
    expect(orion.reportar).toBe(true);
  });

  it("429 fala da cota de quem é dono da chave", () => {
    expect(
      mensagemDeErroPlaces(new PlacesError(429, "..."), "byok").mensagem,
    ).toMatch(/sua chave/i);
    expect(
      mensagemDeErroPlaces(new PlacesError(429, "..."), "orion").mensagem,
    ).toMatch(/Orion/);
  });

  it("5xx é do Google e não vira alerta nosso", () => {
    const r = mensagemDeErroPlaces(new PlacesError(503, "..."), "orion");
    expect(r.mensagem).toMatch(/Google/);
    expect(r.reportar).toBe(false);
  });

  it("status 0 (chave ausente) mantém a mensagem que já ensina o caminho", () => {
    const original =
      "Google (Places + PageSpeed) não configurada — configure em /configuracao";
    const r = mensagemDeErroPlaces(new PlacesError(0, original), "byok");
    expect(r.mensagem).toBe(original);
    expect(r.reportar).toBe(false);
  });
});
