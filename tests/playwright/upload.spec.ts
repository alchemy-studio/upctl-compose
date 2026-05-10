import { test, expect, type Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const BASE_URL = "http://localhost:8088";

const MINI_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

/** Log in via the username/password form and return JWT. */
async function loginViaForm(page: Page, username = "demo", password = "demo123") {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector('input[placeholder="用户名"]');
  await page.locator('input[placeholder="用户名"]').fill(username);
  await page.locator('input[placeholder="密码"]').fill(password);
  await page.locator('button:has-text("登录")').click();
  // Wait for JWT to be stored (login API succeeded)
  await page.waitForFunction(
    () => !!window.localStorage.getItem("Authorization"),
    { timeout: 10_000 },
  );
}

/** Navigate using Vue Router (SPA) to preserve user roles in the store. */
async function spaNavigate(page: Page, path: string) {
  await page.evaluate((p) => {
    const app = (document.querySelector("#app") as any)?.__vue_app__;
    if (app?.config?.globalProperties?.$router) {
      app.config.globalProperties.$router.push(p);
    } else {
      window.location.href = p;
    }
  }, path);
}

test.describe("Image upload", () => {
  let tmpDir: string;

  test.beforeEach(() => {
    tmpDir = fs.mkdtempSync("upload-test-");
  });

  test.afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("uploads image when creating a ticket", async ({ page }) => {
    const pngPath = path.join(tmpDir, "test.png");
    fs.writeFileSync(pngPath, MINI_PNG);

    await loginViaForm(page);
    await spaNavigate(page, "/tickets/new");
    await expect(page.locator("h1")).toContainText("新建工单");

    // Fill title
    const title = `E2E upload test ${Date.now()}`;
    await page.locator('input[placeholder="请输入工单标题"]').fill(title);

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(pngPath);

    // Wait for upload to complete and markdown to appear in body
    await expect(page.locator("textarea")).toHaveValue(/!\[image]\(/, { timeout: 10_000 });

    // Submit
    await page.locator('button:has-text("提交")').click();

    // Should navigate to ticket detail
    await expect(page).toHaveURL(/\/tickets\/\d+/);
    await expect(page.locator(".ticket-title")).toContainText(title);

    // Verify image rendered
    const images = page.locator(".ticket-body img");
    await expect(images).toHaveCount(1);
    await expect(images.first()).toBeVisible();
  });

  test("uploads image in comment", async ({ page }) => {
    const pngPath = path.join(tmpDir, "comment.png");
    fs.writeFileSync(pngPath, MINI_PNG);

    await loginViaForm(page);

    // First create a ticket via API
    const jwt = await page.evaluate(() => window.localStorage.getItem("Authorization") || "");
    const createResp = await page.evaluate(
      async ({ url, jwt }) => {
        const resp = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: jwt,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            title: `E2E comment upload ${Date.now()}`,
            body: "test body",
          }),
        });
        const data = await resp.json();
        return data?.d?.number || 0;
      },
      { url: `${BASE_URL}/api/v2/upctl/api/tickets`, jwt },
    );
    expect(createResp).toBeGreaterThan(0);

    // Navigate to ticket detail via SPA (preserves user roles)
    await spaNavigate(page, `/tickets/${createResp}`);

    // Upload image in comment section
    const fileInputs = page.locator(".reply-section input[type='file']");
    await fileInputs.setInputFiles(pngPath);

    // Wait for markdown to appear
    await expect(page.locator(".reply-section textarea")).toHaveValue(/!\[image]\(/, { timeout: 10_000 });

    // Send comment
    await page.locator(".reply-section button:has-text('发送')").click();

    // Wait for comment to appear
    await expect(page.locator(".comment-card")).toBeVisible();
    const images = page.locator(".comment-body img");
    await expect(images).toHaveCount(1);
    await expect(images.first()).toBeVisible();
  });

  test("shows error message on upload failure", async ({ page }) => {
    const pngPath = path.join(tmpDir, "fail.png");
    fs.writeFileSync(pngPath, MINI_PNG);

    await loginViaForm(page);
    await spaNavigate(page, "/tickets/new");

    // Override fetch to simulate failure
    await page.evaluate(() => {
      const orig = window.fetch;
      window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (url.includes("upload_attachment")) {
          return Promise.resolve(
            new Response(JSON.stringify({ r: false, e: "Upload failed" }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }),
          );
        }
        return orig(input, init);
      };
    });

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(pngPath);

    // Should NOT add image markdown
    await page.waitForTimeout(500);
    const bodyText = await page.locator("textarea").inputValue();
    expect(bodyText).not.toContain("![image](");
  });
});
