import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import {
  disconnectSeed,
  limparSeed,
  seedIsolamento,
  type IsolamentoSeed,
} from "./helpers/seed-isolamento";

const SHOT_DIR = path.join("test-results", "isolamento");

async function shot(page: Page, nome: string) {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(SHOT_DIR, `${nome}.png`),
    fullPage: true,
  });
}

/** Login via helper E2E (cookie assinado no formato Better Auth). */
async function loginComSessao(page: Page, userId: string) {
  const res = await page.request.post("/api/e2e/session", {
    data: { userId },
  });
  if (!res.ok()) {
    const body = await res.text();
    throw new Error(
      `Login e2e falhou (${res.status()}): ${body}\n` +
        "Pré-requisitos: .env com DATABASE_URL + BETTER_AUTH_*; migração F015 aplicada; " +
        "servidor com E2E_SESSION_HELPER=1 (o Playwright já sobe isso — pare qualquer " +
        "`npm run dev` na porta 3000 antes de rodar os testes); " +
        "`npx playwright install chromium` uma vez.",
    );
  }
}

test.describe("F015 — isolamento multi-tenant", () => {
  let seed: IsolamentoSeed;

  test.beforeAll(async () => {
    seed = await seedIsolamento();
  });

  test.afterAll(async () => {
    if (seed) await limparSeed(seed);
    await disconnectSeed();
  });

  test("AC3/AC4 — aluno A vê só o próprio Lead no dashboard e em /leads", async ({
    page,
  }) => {
    await loginComSessao(page, seed.alunoA.id);

    await page.goto("/leads");
    await expect(page.getByText(seed.alunoA.leadNome)).toBeVisible();
    await expect(page.getByText(seed.alunoB.leadNome)).toHaveCount(0);
    await shot(page, "01-leads-aluno-A");

    await page.goto("/");
    await expect(page.getByText(seed.alunoB.leadNome)).toHaveCount(0);
    await shot(page, "02-dashboard-aluno-A");
  });

  test("AC3/AC4 — aluno B vê só o próprio Lead (simetria)", async ({ page }) => {
    await loginComSessao(page, seed.alunoB.id);

    await page.goto("/leads");
    await expect(page.getByText(seed.alunoB.leadNome)).toBeVisible();
    await expect(page.getByText(seed.alunoA.leadNome)).toHaveCount(0);
    await shot(page, "03-leads-aluno-B");

    await page.goto("/treino");
    await expect(page.getByText(seed.alunoA.leadNome)).toHaveCount(0);
    await shot(page, "04-treino-aluno-B");
  });

  test("AC6 — /leads/{id} do outro aluno retorna 404", async ({ page }) => {
    await loginComSessao(page, seed.alunoA.id);

    const res = await page.goto(`/leads/${seed.alunoB.leadId}`);
    expect(res?.status()).toBe(404);
    await expect(page.getByText(seed.alunoB.leadNome)).toHaveCount(0);
    await shot(page, "05-lead-id-alheio-404");
  });

  test("AC6 — /leads/{id} próprio abre o Lead", async ({ page }) => {
    await loginComSessao(page, seed.alunoA.id);

    await page.goto(`/leads/${seed.alunoA.leadId}`);
    await expect(
      page.getByRole("heading", { name: seed.alunoA.leadNome }),
    ).toBeVisible();
    await shot(page, "06-lead-id-proprio");
  });
});
