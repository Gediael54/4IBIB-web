import { expect, test, type Page } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_URL } from "../playwright.config";

async function login(page: Page) {
  await page.goto(`${ADMIN_URL}/admin/`);
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Senha").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /^entrar$/i }).click();
  await expect(page.getByRole("button", { name: /^resumo$/i })).toBeVisible();
}

test.describe("admin schedule", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("cria item de programacao novo", async ({ page }) => {
    await page.getByRole("button", { name: /^programacao$/i }).click();

    await expect(page.getByRole("heading", { name: /^programacao$/i })).toBeVisible();

    const form = page.locator("form.editor-form");
    await expect(form).toBeVisible();

    const uniqueTitle = `Culto de teste ${Date.now()}`;
    const ministry = "Louvor";

    await form.getByLabel("Titulo").fill(uniqueTitle);
    await form.getByLabel("Ministerio").fill(ministry);

    await form.getByRole("button", { name: /^salvar$/i }).click();

    await expect(page.locator(".item-row").filter({ hasText: uniqueTitle })).toBeVisible();
  });
});
