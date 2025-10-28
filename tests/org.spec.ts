import { test, expect } from '@playwright/test'

// Ensures org branding fetch does not cause 406 and no 'user is not defined' errors occur
// Uses BASE_URL from playwright.config.ts

test('org branding fetch returns acceptable response and no console ReferenceError', async ({ page }) => {
  const orgStatuses: number[] = []
  const consoleErrors: string[] = []

  page.on('response', (resp) => {
    if (resp.url().includes('/rest/v1/org')) {
      orgStatuses.push(resp.status())
    }
  })

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')

  // No 406 on org fetch
  expect(orgStatuses.every((s) => s !== 406)).toBeTruthy()

  // No ReferenceError: user is not defined
  expect(consoleErrors.join('\n')).not.toMatch(/ReferenceError: user is not defined/i)
})
