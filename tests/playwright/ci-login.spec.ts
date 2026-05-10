import { test } from '@playwright/test'
import path from 'path'

test('ci login', async ({ page }) => {
  const screenshotDir = '/Users/weli/works/huiwing-migration/upctl-compose/tests/playwright/screenshots'

  await page.goto('https://ci.moicen.com/user/login', { waitUntil: 'networkidle', timeout: 15000 })

  await page.fill('#user_name', 'weli')
  await page.fill('#password', 'weli-dev-pass-2026')
  await page.getByRole('button', { name: 'Sign In' }).click()

  await page.waitForTimeout(5000)
  await page.screenshot({ path: path.join(screenshotDir, 'ci-login-verified.png'), fullPage: true })

  console.log('Final URL:', page.url())
  const err = await page.evaluate(() => {
    const e = document.querySelector('.ui.error.message, .message.error, .flash-error')
    return e ? e.textContent?.trim() : null
  })
  console.log('Error:', err)
  console.log('Success:', !page.url().includes('/user/login'))
})
