import { test, expect, type Page } from "@playwright/test";
import * as crypto from "crypto";
import * as cp from "child_process";
import * as path from "path";

/** Root of the docker-compose project (contains docker-compose.yml). */
const COMPOSE_DIR = path.resolve(__dirname, "..", "..");

function triggerPickAndProcess(): void {
  try {
    cp.execSync(
      `docker compose exec -T ai-agent python3 -c "import sys; sys.path.insert(0, '/app'); from poll_worker import pick_and_process; pick_and_process()"`,
      { cwd: COMPOSE_DIR, timeout: 120_000, stdio: "pipe" },
    );
  } catch (e: unknown) {
    // If docker is unavailable, the test will wait for the daemon poll cycle.
    console.warn("triggerPickAndProcess failed — falling back to daemon poll:", e);
  }
}

const BASE_URL = "http://localhost:8088";

function generateJwt(): string {
  const jwtKey = process.env.JWT_KEY || "upctl-dev-jwt-key-change-in-production";
  const now = Math.floor(Date.now() / 1000);
  const ts = new Date().toISOString().replace(/\.\d+Z$/, ""); // no trailing Z
  const htyToken = {
    token_id: "e2e-pipeline-test",
    hty_id: null,
    app_id: null,
    ts,
    roles: [{ role_key: "ADMIN" }],
    tags: [],
    current_org_id: null,
    current_org_role_keys: null,
    current_department_id: null,
  };
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

async function injectAuth(page: Page) {
  const jwt = generateJwt();
  await page.goto(`${BASE_URL}/login`);
  await page.evaluate((token) => {
    window.localStorage.setItem("Authorization", token);
  }, jwt);
}

const hasDeepSeekKey = !!process.env.DEEPSEEK_API_KEY;

test.describe("Full pipeline", () => {
  test("create approved ticket, ai-agent processes, verify via browser", async ({ page }) => {
    test.setTimeout(300_000); // 5 min — covers daemon poll cycle + trigger fallback
    test.skip(!hasDeepSeekKey, "DEEPSEEK_API_KEY not set — ai-agent cannot process");

    const jwt = generateJwt();
    const uniqueId = Date.now().toString(36);
    const title = `E2E Playwright pipeline test ${uniqueId}`;
    const body = "Please reply with exactly: PLAYWRIGHT-PIPE-OK";

    // 1. Login via JWT injection (same pattern as e2e.spec.ts)
    await injectAuth(page);

    // 2. Create an approved ticket via browser-side fetch (UI has no create form)
    const ticketNum: number = await page.evaluate(
      async ({ url, jwt, title, body }) => {
        const resp = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: jwt,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ title, body, labels: ["approved"] }),
        });
        const data = await resp.json();
        return data?.d?.number || 0;
      },
      {
        url: `${BASE_URL}/api/v2/ts/tickets`,
        jwt,
        title,
        body,
      },
    );
    expect(ticketNum).toBeGreaterThan(0);

    // 3. Navigate to ticket detail page and confirm it's displayed correctly
    await page.goto(`${BASE_URL}/tickets/${ticketNum}`);
    await expect(page.locator("h1")).toContainText(`#${ticketNum}`);
    await expect(page.locator(".ticket-title")).toContainText(title);
    // Must be "待处理" (open) at this point — the ai-agent hasn't processed yet
    await expect(page.locator("strong.open")).toBeVisible();

    // 4. Trigger ai-agent processing directly, then poll for completion.
    //    Falls back to waiting for the daemon poll cycle if docker is unavailable.
    triggerPickAndProcess();

    // Poll the API every 5 s via browser-side fetch, up to 24 iterations (= 2 min).
    // After triggering pick_and_process directly (seconds) or waiting for the
    // daemon poll cycle (up to 5 min), the ticket should be closed quickly.
    let isClosed = false;
    for (let i = 0; i < 24; i++) {
      await page.waitForTimeout(5_000);
      const state: string = await page.evaluate(
        async ({ url, jwt }) => {
          const resp = await fetch(url, {
            headers: { Authorization: jwt, Accept: "application/json" },
          });
          const data = await resp.json();
          const issue: Record<string, unknown> = data?.d?.issue || data?.d || {};
          return (issue.state as string) || "unknown";
        },
        { url: `${BASE_URL}/api/v2/ts/tickets/${ticketNum}`, jwt },
      );
      if (state === "closed") {
        isClosed = true;
        break;
      }
    }
    expect(isClosed).toBeTruthy();

    // 5. Refresh the detail page in the browser and verify visually
    await page.goto(`${BASE_URL}/tickets/${ticketNum}`);

    // Status badge now shows "已关闭"
    await expect(page.locator("strong.closed")).toBeVisible();

    // Comments section contains the ai-agent's processing report
    const commentsSection = page.locator(".comments-section");
    await expect(commentsSection).toBeVisible();

    const commentCards = page.locator(".comment-card");
    const count = await commentCards.count();
    expect(count).toBeGreaterThan(0);

    // The ai-agent prefixes its comment with "## Processing result"
    await expect(commentsSection).toContainText("Processing result");
  });
});
