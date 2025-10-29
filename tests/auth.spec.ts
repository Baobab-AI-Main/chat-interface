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
  // Validate app shell and admin-only control present
  await expect(page.getByRole('button', { name: 'New Search' })).toBeVisible({ timeout: 15000 })
  await expect(page.getByText('Conversation Details')).toBeVisible()
  await expect(page.getByText('No external order or invoice data yet for this conversation.')).toBeVisible()
})
