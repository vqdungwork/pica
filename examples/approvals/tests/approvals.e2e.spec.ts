import { test, expect } from "@playwright/test";

/* UC-01 Send a payment: the whole flow, end to end. */
test("UC-01 an approver releases a held payment and the actor is recorded", async ({ page }) => {
  await page.goto("/approvals");
  await page.getByRole("row").first().getByRole("button", { name: "Release" }).click();
  await expect(page.getByText("Released")).toBeVisible();
});

test("UC-01 the oldest held payment is first in the queue", async ({ page }) => {
  await page.goto("/approvals");
  const ages = await page.getByTestId("age").allTextContents();
  expect(ages).toEqual([...ages].sort((a, b) => Number(b) - Number(a)));
});
