import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:8088';
const SCREENSHOT_DIR = new URL('.', import.meta.url).pathname;

async function loginViaForm(page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector('input[placeholder="用户名"]');
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

  // Log in via form
  await loginViaForm(page);

  // Screenshot 1: Ticket list page
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: SCREENSHOT_DIR + '02-ticket-list.png',
    fullPage: false,
  });
  console.log('Screenshot 1: 02-ticket-list.png taken');

  // Screenshot 2: Ticket detail page for closed ticket (#25) with AI comment
  await page.goto(`${BASE_URL}/tickets/25`);
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: SCREENSHOT_DIR + '03-ticket-detail.png',
    fullPage: true,
  });
  console.log('Screenshot 2: 03-ticket-detail.png taken');

  await browser.close();
  console.log('Done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
