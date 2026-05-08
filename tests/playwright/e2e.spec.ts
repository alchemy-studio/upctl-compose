import { test, expect, type Page } from "@playwright/test";
import * as crypto from "crypto";

const BASE_URL = "http://localhost:8088";

/**
 * Generate a JWT matching the dev JWT_KEY used in docker-compose.
 */
function generateJwt(): string {
  const jwtKey = process.env.JWT_KEY || "upctl-dev-jwt-key-change-in-production";
  const htyToken = {
    token_id: "e2e-test",
    hty_id: null,
    app_id: null,
    ts: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
    roles: [{ role_key: "ADMIN" }],
    tags: [],
    current_org_id: null,
    current_org_role_keys: null,
    current_department_id: null,
  };
  const now = Math.floor(Date.now() / 1000);
  const payload = { sub: JSON.stringify(htyToken), exp: now + 3600, iat: now };

  const b64 = (o: object) =>
    Buffer.from(JSON.stringify(o))
      .toString("base64url")
      .replace(/=+$/, "");

  const header = b64({ alg: "HS256", typ: "JWT" });
  const body = b64(payload);
  const sig = crypto
    .createHmac("sha256", jwtKey)
    .update(`${header}.${body}`)
    .digest("base64url")
    .replace(/=+$/, "");

  return `${header}.${body}.${sig}`;
}

async function injectAuth(page: Page) {
  const jwt = generateJwt();
  await page.evaluate((token) => {
    window.localStorage.setItem("Authorization", token);
  }, jwt);
}

test.describe("Login page", () => {
  test("renders the login page with title and form", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.locator("h1")).toContainText("工单管理系统");
    await expect(page.locator(".login-card")).toBeVisible();
  });

  test("redirects unauthenticated users to /login", async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveURL(/\/login/);
  });

  test("shows union_id input form (compose/dev mode)", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.locator("input")).toBeVisible();
    await expect(page.locator('button:has-text("登录")')).toBeVisible();
  });
});

test.describe("Ticket list", () => {
  test("loads and shows tickets with valid JWT", async ({ page }) => {
    await injectAuth(page);
    await page.goto(`${BASE_URL}/`);
    await expect(page.locator("h1")).toContainText("工单列表");
    // Should not redirect back to /login
    await expect(page).not.toHaveURL(/\/login/);
  });
});
