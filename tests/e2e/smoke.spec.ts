import { test, expect } from "@playwright/test";

test("landing page shows product title", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Draftboard");
});

test("login page is reachable", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});
