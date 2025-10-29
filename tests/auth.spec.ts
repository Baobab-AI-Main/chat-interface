import { test, expect } from '@playwright/test'

// Smoke tests for auth UI

test('loads login page', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Welcome to BrunelAI' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
})

test('sign in with admin if creds provided', async ({ page }) => {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) test.skip()
  await page.goto('/')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  // Validate app shell is present
  await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible({ timeout: 15000 })
  await expect(page.getByText('Recent Searches')).toBeVisible()
  // Plus button for new search
  await expect(page.locator('button').filter({ has: page.locator('svg.lucide-plus') })).toBeVisible()
})
