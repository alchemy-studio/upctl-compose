import { test, expect } from '@playwright/test'

test('admin.moicen.com full login flow', async ({ page }) => {
  await page.goto('https://admin.moicen.com/login', { waitUntil: 'networkidle', timeout: 15000 })
  await page.fill('input[placeholder="用户名"]', 'admin')
  await page.fill('input[placeholder="密码"]', 'Admin@Moicen2026!')
  await page.getByRole('button', { name: '登录' }).click()

  // Wait for SPA to process login and redirect
  await page.waitForTimeout(5000)

  const finalUrl = page.url()
  console.log('Final URL:', finalUrl)

  // Should be at dashboard (/), not kicked back to /login
  expect(finalUrl).not.toContain('/login')
})
