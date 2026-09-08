import { test, expect } from "@playwright/test";
test("smoke: the approval queue loads", async ({ page }) => {
  await page.goto("/approvals");
  await expect(page.getByRole("heading", { name: "Held payments" })).toBeVisible();
});
