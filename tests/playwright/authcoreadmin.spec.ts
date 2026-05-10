import { test, expect, type Page } from "@playwright/test";

const AUTH_ADMIN_URL = "http://localhost:8089";

/** Log in via the username/password form. */
async function login(page: Page) {
  await page.goto(`${AUTH_ADMIN_URL}/login`);
  await page.waitForSelector('input[placeholder="用户名"]');
  await page.locator('input[placeholder="用户名"]').fill("demo");
  await page.locator('input[placeholder="密码"]').fill("demo123");
  await page.locator('button:has-text("登录")').click();
  await page.waitForURL(/^(?!.*\/login)/, { timeout: 10_000 });
}

test.describe("AuthCoreAdmin — App management", () => {
  test("navigates to apps page from dashboard", async ({ page }) => {
    await login(page);
    // Should see dashboard
    await expect(page.locator("h1")).toContainText("AuthCore");
    // Click app management quick link
    await page.locator('a:has-text("应用管理")').first().click();
    await expect(page).toHaveURL(/\/apps/);
  });

  test("shows app list after login", async ({ page }) => {
    await login(page);
    await page.goto(`${AUTH_ADMIN_URL}/apps`);
    await expect(page.locator("h1")).toContainText("应用管理");
    // Should show the "新增应用" button
    await expect(page.locator('button:has-text("新增应用")')).toBeVisible();
  });

  test("opens and closes create app modal", async ({ page }) => {
    await login(page);
    await page.goto(`${AUTH_ADMIN_URL}/apps`);
    await page.locator('button:has-text("新增应用")').click();
    // Modal should open
    await expect(page.locator(".dialog h3")).toContainText("新增应用");
    // Close
    await page.locator('.dialog button:has-text("取消")').click();
    await expect(page.locator(".dialog")).not.toBeVisible();
  });
});

test.describe("AuthCoreAdmin — Navigation", () => {
  test("navigation links work between pages", async ({ page }) => {
    await login(page);
    await page.goto(`${AUTH_ADMIN_URL}/`);

    // Click nav links
    await page.locator('nav a:has-text("用户")').click();
    await expect(page).toHaveURL(/\/users/);
    await expect(page.locator("h1")).toContainText("用户管理");

    await page.locator('nav a:has-text("应用")').click();
    await expect(page).toHaveURL(/\/apps/);
    await expect(page.locator("h1")).toContainText("应用管理");

    await page.locator('nav a:has-text("首页")').click();
    await expect(page).toHaveURL(/\/$/);
  });
});
