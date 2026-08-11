// F014 AC10 — cookie de sessão que não vale mais não pode virar tela de erro.
//
// O middleware é otimista: só verifica que o cookie existe. Quem valida é o
// `requireUser()`, que lança. Sem o gate do layout de `(orion)`, esse
// lançamento virava 500 e o aluno ficava preso — recarregar não resolvia,
// porque o cookie continuava no navegador.
//
// Acontece de verdade: banco recriado no desenvolvimento, sessão revogada em
// outro dispositivo, `BETTER_AUTH_SECRET` trocado.

import { expect, test } from "@playwright/test";

const COOKIE_PODRE = {
  name: "better-auth.session_token",
  value: "sessao.que.nao.existe.no.banco",
  domain: "127.0.0.1",
  path: "/",
};

test.describe("F014 AC10 — cookie de sessão inválido", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("sem cookie: `/` manda pro login (comportamento que já existia)", async ({
    page,
  }) => {
    const res = await page.goto("/");
    expect(res?.status()).toBe(200);
    await expect(page).toHaveURL(/\/login/);
  });

  test("cookie inválido: `/` manda pro login, não pra tela de erro", async ({
    page,
    context,
  }) => {
    await context.addCookies([COOKIE_PODRE]);

    const res = await page.goto("/");

    // O que quebrava: 500 com "Algo deu errado".
    expect(res?.status()).toBe(200);
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText("Algo deu errado")).toHaveCount(0);
    await expect(page.getByText(/sessão expirou/i)).toBeVisible();
  });

  test("o cookie podre é apagado — senão o próximo acesso repete o loop", async ({
    page,
    context,
  }) => {
    await context.addCookies([COOKIE_PODRE]);
    await page.goto("/");

    const cookies = await context.cookies();
    const restou = cookies.find((c) => c.name === COOKIE_PODRE.name);
    expect(restou?.value ?? "").toBe("");
  });

  test("sem cookie, `/leads` preserva o destino no callbackUrl", async ({
    page,
  }) => {
    await page.goto("/leads");
    await expect(page).toHaveURL(/callbackUrl=%2Fleads/);
  });
});
