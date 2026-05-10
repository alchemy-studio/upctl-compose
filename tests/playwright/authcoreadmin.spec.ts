import { test, expect, type Page } from "@playwright/test";

const BASE = "http://localhost:8088";
const AUTH_ADMIN_URL = `${BASE}/admin`;

/** Navigate using Vue Router (SPA) to preserve user roles in the store. */
async function spaNavigate(page: Page, path: string) {
  await page.evaluate((p) => {
    const app = (document.querySelector("#app") as any)?.__vue_app__;
    if (app?.config?.globalProperties?.$router) {
      app.config.globalProperties.$router.push(p);
    } else {
      window.location.href = `/admin${p.startsWith("/") ? p : "/" + p}`;
    }
  }, path);
}

/** Log in via the username/password form. */
async function login(page: Page, destination?: string) {
  await page.goto(`${AUTH_ADMIN_URL}/login`, { waitUntil: "networkidle" });
  await page.waitForSelector('input[placeholder="用户名"]');
  await page.locator('input[placeholder="用户名"]').fill("demo");
  await page.locator('input[placeholder="密码"]').fill("demo123");
  await page.locator('button:has-text("登录")').click();
  // Wait for JWT stored AND navigation away from login to complete
  // (loginWithPassword → read() → router.push('/') — all synchronous chain)
  await page.waitForFunction(
    () => !!window.localStorage.getItem("Authorization"),
    { timeout: 15_000 },
  );
  // Wait for the SPA's own redirect to finish (read() populated currentUser,
  // router.push('/') completed, dashboard mounted)
  await page.waitForURL(/\/admin/, { timeout: 10_000 });
  // Navigate to desired page via SPA to preserve user roles in the store
  if (destination) {
    await spaNavigate(page, destination);
  }
}

test.describe("AuthCoreAdmin — App management", () => {
  test("navigates to apps page from dashboard", async ({ page }) => {
    await login(page);
    await expect(page.locator("h1")).toContainText("AuthCore");
    await page.locator('a:has-text("应用管理")').first().click();
    await expect(page).toHaveURL(/\/apps/);
  });

  test("shows app list after login", async ({ page }) => {
    await login(page, "/apps");
    await expect(page.locator("h1")).toContainText("应用管理");
    await expect(page.locator('button:has-text("新增应用")')).toBeVisible();
  });

  test("opens and closes create app modal", async ({ page }) => {
    await login(page, "/apps");
    await page.locator('button:has-text("新增应用")').click();
    await expect(page.locator(".dialog h3")).toContainText("新增应用");
    await page.locator('.dialog button:has-text("取消")').click();
    await expect(page.locator(".dialog")).not.toBeVisible();
  });
});

test.describe("AuthCoreAdmin — Navigation", () => {
  test("navigation links work between pages", async ({ page }) => {
    await login(page);

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
