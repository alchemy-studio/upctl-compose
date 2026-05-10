import { test } from '@playwright/test'
import path from 'path'

test('admin.moicen.com login debug', async ({ page }) => {
  const screenshotDir = '/Users/weli/works/huiwing-migration/upctl-compose/tests/playwright/screenshots'

  // Capture raw response via route interception
  let apiBody = ''
  await page.route('**/api/v1/uc/login_with_password', async (route) => {
    const resp = await route.fetch()
    apiBody = await resp.text()
    console.log('Intercepted API:', resp.status(), apiBody)
    await route.fulfill({ response: resp })
  })

  await page.goto('https://admin.moicen.com/login', { waitUntil: 'networkidle', timeout: 15000 })

  await page.getByPlaceholder('用户名').fill('admin')
  await page.getByPlaceholder('密码').fill('Admin@Moicen2026!')
  await page.getByRole('button', { name: '登录' }).click()

  await page.waitForTimeout(5000)
  console.log('Final URL:', page.url())
  console.log('Captured API body:', apiBody)

  await page.screenshot({ path: path.join(screenshotDir, 'admin-login-debug3.png'), fullPage: true })
})
