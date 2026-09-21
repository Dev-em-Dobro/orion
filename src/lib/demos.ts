// Mapa leve place_id → site de amostra (demo). Os demos vivem num repo separado
// (pasta demos/), servidos por demos/serve.mjs na porta 4321 — FORA da engine.
// Acoplamento solto de propósito: aqui só guardamos o ponteiro. Quando um demo
// novo for gerado, basta adicionar o place_id → slug aqui.

const DEMO_SLUG: Record<string, string> = {
  "ChIJzVxe3jB3GZURZ7vWSj-8S1Q": "ono-clinica", // Ono Clínica Estética
  "ChIJA8potsR5GZURLdAgQYkJ-Mk": "el-cartel", // El Cartel Barbearia
  "ChIJbRwXFjl4GZURnej0v50ZVro": "bruno-mattos", // Bruno Mattos Barbeiro
  "ChIJCSq6iR95GZUROFMpsoAj7VE": "kerols-co", // Kerols & Co
  "ChIJNauS7_J5GZURV_dhpl8uFMg": "dra-ellen", // Dra. Ellen Santa Cruz
};

/**
 * Base dos demos, ou `null` quando `DEMOS_BASE_URL` não está definida.
 *
 * O default antigo era `http://localhost:4321` — o endereço do `serve.mjs` na
 * máquina de quem desenvolve. Em produção esse endereço não fica só na tela: o
 * `demoUrl` entra no prompt da Abordagem (`actions/leads/gerarAbordagem.ts`) e
 * sai no texto que o aluno manda pro cliente dele, apontando pro localhost de
 * quem lê. O runbook de produção já descrevia o comportamento certo — "ausente
 * → o link não aparece, nasce sem a feature"; era o código que inventava base.
 *
 * Em desenvolvimento, definir `DEMOS_BASE_URL=http://localhost:4321` no `.env`
 * devolve o comportamento antigo.
 */
function baseDosDemos(
  raw: string | undefined = process.env.DEMOS_BASE_URL,
): string | null {
  // Barra final some: senão a URL sai com `//` no meio e o demo 404.
  const limpo = (raw ?? "").trim().replace(/\/+$/, "");
  return limpo || null;
}

/** URL do site de amostra do Lead, ou null se ainda não houver demo. */
export function demoUrlFor(placeId: string): string | null {
  const base = baseDosDemos();
  if (!base) return null;
  const slug = DEMO_SLUG[placeId];
  return slug ? `${base}/${slug}` : null;
}
