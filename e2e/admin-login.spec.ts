import { expect, test } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_URL } from "../playwright.config";

test.describe("admin login", () => {
  test("entra com credenciais mock e renderiza painel", async ({ page }) => {
    await page.goto(`${ADMIN_URL}/admin/`);

    await expect(page.getByRole("heading", { name: /entrar no admin/i })).toBeVisible();

    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Senha").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /^entrar$/i }).click();

    await expect(page.getByRole("button", { name: /^resumo$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^sair$/i })).toBeVisible();
  });
});
