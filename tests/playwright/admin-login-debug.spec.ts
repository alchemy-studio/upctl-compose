import { test, expect } from '@playwright/test'

test('login with TEACHER endpoint intercepted', async ({ page }) => {
  // Return empty success for TEACHER to isolate the issue
  await page.route('**/find_users_with_info_by_role/**', async (route) => {
    console.log('INTERCEPTED TEACHER, returning empty []')
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ r: true, d: [] }),
    })
  })

  await page.goto('https://admin.moicen.com/login', { waitUntil: 'networkidle', timeout: 15000 })
  await page.fill('input[placeholder="用户名"]', 'admin')
  await page.fill('input[placeholder="密码"]', 'Admin@Moicen2026!')
  await page.getByRole('button', { name: '登录' }).click()

  await page.waitForTimeout(5000)
  console.log('Final URL:', page.url())
  expect(page.url()).not.toContain('/login')
})
