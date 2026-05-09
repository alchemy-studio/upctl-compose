import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:8088';
const SCREENSHOT_DIR = new URL('.', import.meta.url).pathname;

async function loginViaForm(page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector('input[placeholder="用户名"]', { timeout: 10000 });
  await page.locator('input[placeholder="用户名"]').fill('demo');
  await page.locator('input[placeholder="密码"]').fill('demo123');
  await page.locator('button:has-text("登录")').click();
  await page.waitForURL('**/');
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  await loginViaForm(page);
  await page.waitForTimeout(2000);

  // Screenshot 1: AI Agent tmux terminal page
  await page.goto(`${BASE_URL}/tester/tmux/ai-agent`);
  await page.waitForTimeout(3000);
  await page.screenshot({
    path: SCREENSHOT_DIR + '05-ai-agent-tmux.png',
    fullPage: false,
  });
  console.log('Screenshot: 05-ai-agent-tmux.png taken');

  await browser.close();
  console.log('Done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
