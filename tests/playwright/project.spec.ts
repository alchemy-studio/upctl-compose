import { test, expect, type Page } from "@playwright/test";
import * as crypto from "crypto";

const BASE_URL = "http://localhost:8088";

/** Generate a dev JWT for API calls. */
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
    Buffer.from(JSON.stringify(o)).toString("base64url").replace(/=+$/, "");
  const header = b64({ alg: "HS256", typ: "JWT" });
  const body = b64(payload);
  const sig = crypto
    .createHmac("sha256", jwtKey)
    .update(`${header}.${body}`)
    .digest("base64url")
    .replace(/=+$/, "");
  return `${header}.${body}.${sig}`;
}

/** Log in via the username/password form. */
async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector('input[placeholder="用户名"]');
  await page.locator('input[placeholder="用户名"]').fill("demo");
  await page.locator('input[placeholder="密码"]').fill("demo123");
  await page.locator('button:has-text("登录")').click();
  await page.waitForURL(/^(?!.*\/login)/, { timeout: 10_000 });
}

test.describe("Project management API", () => {
  const jwt = generateJwt();
  let projectId = "";

  test("CRUD: create, list, update, delete project", async () => {
    // Create
    const createResp = await fetch(`${BASE_URL}/api/v2/upctl/api/projects`, {
      method: "POST",
      headers: {
        Authorization: jwt,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        name: "E2E test project",
        repo_url: "https://github.com/example/test",
        memory_doc: "# E2E Test\nTest project for E2E",
      }),
    });
    expect(createResp.ok).toBeTruthy();
    const created = await createResp.json();
    expect(created.r).toBeTruthy();
    expect(created.d.name).toBe("E2E test project");
    expect(created.d.id).toBeTruthy();
    projectId = created.d.id;

    // List
    const listResp = await fetch(`${BASE_URL}/api/v2/upctl/api/projects`, {
      headers: { Authorization: jwt, Accept: "application/json" },
    });
    const listed = await listResp.json();
    expect(listed.r).toBeTruthy();
    expect(Array.isArray(listed.d)).toBeTruthy();
    expect(listed.d.some((p: any) => p.id === projectId)).toBeTruthy();

    // Update
    const updateResp = await fetch(
      `${BASE_URL}/api/v2/upctl/api/projects/${projectId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: jwt,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ name: "E2E test project (updated)" }),
      },
    );
    expect(updateResp.ok).toBeTruthy();
    const updated = await updateResp.json();
    expect(updated.r).toBeTruthy();
    expect(updated.d.name).toBe("E2E test project (updated)");

    // Delete
    const deleteResp = await fetch(
      `${BASE_URL}/api/v2/upctl/api/projects/${projectId}`,
      {
        method: "DELETE",
        headers: { Authorization: jwt, Accept: "application/json" },
      },
    );
    expect(deleteResp.ok).toBeTruthy();
    const deleted = await deleteResp.json();
    expect(deleted.r).toBeTruthy();

    // Verify deletion
    const finalList = await fetch(`${BASE_URL}/api/v2/upctl/api/projects`, {
      headers: { Authorization: jwt, Accept: "application/json" },
    });
    const finalData = await finalList.json();
    expect(finalData.d.some((p: any) => p.id === projectId)).toBeFalsy();
  });
});

test.describe("Project management page", () => {
  test("shows project page with nav link", async ({ page }) => {
    await login(page);
    // Navigate via link
    await page.locator('a:has-text("项目管理")').click();
    await expect(page).toHaveURL(/\/projects/);
    await expect(page.locator("h1")).toContainText("项目管理");
  });

  test("opens create modal", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/projects`);
    await page.locator('button:has-text("新建项目")').click();
    await expect(page.locator(".dialog h3")).toContainText("新建项目");
    await page.locator('.dialog button:has-text("取消")').click();
    await expect(page.locator(".dialog")).not.toBeVisible();
  });

  test("project selector visible on create ticket page", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/tickets/new`);
    await expect(page.locator("h1")).toContainText("新建工单");
    // Should see project section
    await expect(page.locator("text=关联项目")).toBeVisible();
  });
});
