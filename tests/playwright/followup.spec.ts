import { test, expect } from '@playwright/test';

const BASE = process.env.TICKET_BASE_URL || 'http://localhost:8088';

test.describe('Follow-up (追问) feature', () => {
  test('follow-up button navigates to create page with pre-filled ref', async ({ page }) => {
    // Login and create a ticket to test against
    const token = process.env.TEST_TOKEN;
    test.skip(!token, 'TEST_TOKEN not set');

    // First, create a ticket via API
    const createResp = await page.request.post(BASE + '/api/v2/upctl/api/tickets', {
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      data: { title: 'Follow-up test ticket ' + Date.now(), body: 'Testing follow-up feature' }
    });
    const createData = await createResp.json();
    const ticketNum = createData.d?.number;
    expect(ticketNum).toBeGreaterThan(0);

    // Navigate to the ticket detail page
    await page.goto(`${BASE}/tickets/${ticketNum}`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(t => window.localStorage.setItem('Authorization', t), token);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Check follow-up button exists
    const btn = page.locator('.btn-followup');
    await expect(btn).toBeVisible({ timeout: 5000 });

    // Click follow-up button
    await btn.click();
    await page.waitForTimeout(2000);

    // Should navigate to create page with ref param
    expect(page.url()).toContain(`/tickets/new?ref=${ticketNum}`);

    // Body should be pre-filled with reference
    const bodyTextarea = page.locator('textarea');
    await expect(bodyTextarea).toBeVisible({ timeout: 5000 });
    const bodyValue = await bodyTextarea.inputValue();
    expect(bodyValue).toContain(`追问自 #${ticketNum}`);
    expect(bodyValue).toContain('Follow-up test ticket');
  });
});
