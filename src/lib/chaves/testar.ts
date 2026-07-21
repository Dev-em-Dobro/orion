// Pings baratos por provedor pra validar a chave (AC2).

import Anthropic from "@anthropic-ai/sdk";
import { textSearch } from "@/lib/places/textSearch";
import { obterChave } from "./resolver";
import { atualizarStatusChave } from "./repositorio";
import { ChaveOperacaoError } from "./erros";
import type { TipoChave } from "./tipos";

export type ResultadoTeste = {
  ok: boolean;
  mensagem: string;
};

async function pingGoogle(apiKey: string): Promise<ResultadoTeste> {
  try {
    await textSearch("cafe", apiKey);
    return { ok: true, mensagem: "Google OK — Places respondeu" };
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 200) : "falha";
    return { ok: false, mensagem: `Google inválida: ${msg}` };
  }
}

async function pingAnthropic(apiKey: string): Promise<ResultadoTeste> {
  try {
    const client = new Anthropic({ apiKey });
    await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 16,
      messages: [{ role: "user", content: "responda só: ok" }],
    });
    return { ok: true, mensagem: "Anthropic OK" };
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 200) : "falha";
    return { ok: false, mensagem: `Anthropic inválida: ${msg}` };
  }
}

async function pingOpenAI(apiKey: string): Promise<ResultadoTeste> {
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      return {
        ok: false,
        mensagem: `OpenAI inválida (HTTP ${res.status})`,
      };
    }
    return { ok: true, mensagem: "OpenAI OK" };
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 200) : "falha";
    return { ok: false, mensagem: `OpenAI inválida: ${msg}` };
  }
}

async function pingGemini(apiKey: string): Promise<ResultadoTeste> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) {
      return {
        ok: false,
        mensagem: `Gemini inválida (HTTP ${res.status})`,
      };
    }
    return { ok: true, mensagem: "Gemini OK" };
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 200) : "falha";
    return { ok: false, mensagem: `Gemini inválida: ${msg}` };
  }
}

async function pingScreenshotOne(apiKey: string): Promise<ResultadoTeste> {
  try {
    const params = new URLSearchParams({
      access_key: apiKey,
      url: "https://example.com",
      viewport_width: "320",
      viewport_height: "240",
      format: "jpg",
      image_quality: "40",
      timeout: "15",
    });
    const res = await fetch(`https://api.screenshotone.com/take?${params}`, {
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) {
      return {
        ok: false,
        mensagem: `ScreenshotOne inválida (HTTP ${res.status})`,
      };
    }
    return { ok: true, mensagem: "ScreenshotOne OK" };
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 200) : "falha";
    return { ok: false, mensagem: `ScreenshotOne inválida: ${msg}` };
  }
}

async function ping(tipo: TipoChave, apiKey: string): Promise<ResultadoTeste> {
  switch (tipo) {
    case "google":
      return pingGoogle(apiKey);
    case "anthropic":
      return pingAnthropic(apiKey);
    case "openai":
      return pingOpenAI(apiKey);
    case "gemini":
      return pingGemini(apiKey);
    case "screenshotone":
      return pingScreenshotOne(apiKey);
  }
}

/** Testa a chave já salva do aluno e atualiza o status. */
export async function testarChaveSalva(
  userId: string,
  tipo: TipoChave,
): Promise<ResultadoTeste> {
  const apiKey = await obterChave(userId, tipo);
  if (!apiKey) {
    throw new ChaveOperacaoError("Salve a chave antes de testar");
  }

  const resultado = await ping(tipo, apiKey);
  await atualizarStatusChave(
    userId,
    tipo,
    resultado.ok ? "configurada" : "invalida",
  );
  return resultado;
}
