import { expect, test } from "@playwright/test";
import { SITE_URL } from "../playwright.config";

test.describe("pedido de oracao", () => {
  test("envia pedido pelo formulario publico", async ({ page }) => {
    await page.goto(`${SITE_URL}/#contato`);

    const form = page.locator("form.prayer-form");
    await expect(form).toBeVisible();

    await form.getByLabel("Nome").fill("Maria do Teste");
    await form.getByLabel("Contato").fill("maria@example.com");
    await form.getByLabel("Pedido").fill("Oracao pelo lar e pela familia.");

    await form.getByRole("button", { name: /enviar pedido/i }).click();

    await expect(page.getByText(/recebemos seu pedido/i)).toBeVisible();
    await expect(form.getByLabel("Nome")).toHaveValue("");
    await expect(form.getByLabel("Pedido")).toHaveValue("");
  });
});
