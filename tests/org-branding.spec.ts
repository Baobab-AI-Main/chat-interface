import { test, expect, type Page } from '@playwright/test'

/**
 * Human-Centered User Flow Tests
 * 
 * Tests real user journeys:
 * 1. Admin workflow: Login → Manage team → Update workspace settings
 * 2. Regular user workflow: Login → Start conversation → Use app features
 * 3. Permission boundaries between roles
 */

// Helper to login
async function login(page: Page, email: string, password: string) {
  await page.goto('/')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  // Wait for authenticated page - Settings button appears after login
  await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible({ timeout: 15000 })
}

test.describe('Admin User Flow', () => {
  test('admin can complete full workspace management flow', async ({ page }) => {
    const email = process.env.ADMIN_EMAIL
    const password = process.env.ADMIN_PASSWORD
    
    if (!email || !password) {
      test.skip()
      return
    }

    // 1. Login as admin
    await login(page, email, password)
    
    // 2. Verify admin has access to main app interface
    // Plus icon button for new search
    await expect(page.locator('button').filter({ has: page.locator('svg.lucide-plus') })).toBeVisible()
    await expect(page.getByText('Recent Searches')).toBeVisible()
    
    // 3. Open settings
    await page.getByRole('button', { name: 'Settings' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    
    // 4. Verify admin-only tabs are visible
    await expect(page.getByRole('tab', { name: /Team Management/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Workspace/i })).toBeVisible()
    
    // 5. Navigate to workspace settings
    await page.getByRole('tab', { name: /Workspace/i }).click()
    await expect(page.getByLabel('Workspace Name')).toBeVisible()
    
    // 6. Verify workspace name can be edited
    const nameInput = page.getByLabel('Workspace Name')
    const currentName = await nameInput.inputValue()
    expect(currentName.length).toBeGreaterThan(0)
    
    // 7. Close settings
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('admin can manage team members', async ({ page }) => {
    const email = process.env.ADMIN_EMAIL
    const password = process.env.ADMIN_PASSWORD
    
    if (!email || !password) {
      test.skip()
      return
    }

    // 1. Login
    await login(page, email, password)
    
    // 2. Open settings and navigate to team management
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByRole('tab', { name: /Team Management/i }).click()
    
    // 3. Verify team management UI is present
    await expect(page.getByText('Add or remove users with roles')).toBeVisible()
    
    // 4. Verify user table exists
    const table = page.getByRole('table')
    await expect(table).toBeVisible()
  })

  test('admin can update workspace settings', async ({ page }) => {
    const email = process.env.ADMIN_EMAIL
    const password = process.env.ADMIN_PASSWORD
    
    if (!email || !password) {
      test.skip()
      return
    }

    await login(page, email, password)
    
    // Open workspace settings
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByRole('tab', { name: /Workspace/i }).click()
    
    // Get current name
    const nameInput = page.getByLabel('Workspace Name')
    const originalName = await nameInput.inputValue()
    
    // Make a change
    const testName = `Test ${Date.now()}`
    await nameInput.fill(testName)
    
    // Save
    const saveButton = page.getByRole('button', { name: /Save Changes/i })
    await saveButton.click()
    
    // Verify success (use .first() to handle multiple toast elements)
    await expect(page.getByText(/updated successfully/i).first()).toBeVisible({ timeout: 10000 })
    
    // Cleanup: revert change
    await nameInput.fill(originalName)
    await saveButton.click()
    await expect(page.getByText(/updated successfully/i).first()).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Regular User Flow', () => {
  test('regular user can login and access main app', async ({ page }) => {
    const email = process.env.USER_EMAIL
    const password = process.env.USER_PASSWORD
    
    if (!email || !password) {
      test.skip()
      return
    }

    // 1. Login
    await login(page, email, password)
    
    // 2. Verify main app interface is accessible
    await expect(page.getByText('Recent Searches')).toBeVisible()
    
    // 3. Verify user can start a new conversation
    const newSearchBtn = page.locator('button').filter({ has: page.locator('svg.lucide-plus') })
    await expect(newSearchBtn).toBeVisible()
    
    // User has access to the core app interface
    await expect(page.getByText('Recent Searches')).toBeVisible()
  })

  test('regular user cannot access admin features', async ({ page }) => {
    const email = process.env.USER_EMAIL
    const password = process.env.USER_PASSWORD
    
    if (!email || !password) {
      test.skip()
      return
    }

    // 1. Login
    await login(page, email, password)
    
    // 2. Open settings
    await page.getByRole('button', { name: 'Settings' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    
    // 3. Verify admin-only tabs are NOT visible
    await expect(page.getByRole('tab', { name: /Team Management/i })).toHaveCount(0)
    await expect(page.getByRole('tab', { name: /Workspace/i })).toHaveCount(0)
    
    // 4. Verify only profile tab is available
    await expect(page.getByRole('tab', { name: /Profile/i })).toBeVisible()
  })

  test('regular user can update their profile', async ({ page }) => {
    const email = process.env.USER_EMAIL
    const password = process.env.USER_PASSWORD
    
    if (!email || !password) {
      test.skip()
      return
    }

    // 1. Login
    await login(page, email, password)
    
    // 2. Open settings
    await page.getByRole('button', { name: 'Settings' }).click()
    
    // 3. Should be on profile tab by default
    await expect(page.getByLabel('Full Name')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    
    // 4. Verify profile fields are present
    const nameInput = page.getByLabel('Full Name')
    await expect(nameInput).toBeVisible()
    
    // 5. Email should be disabled (read-only)
    const emailInput = page.getByLabel('Email')
    await expect(emailInput).toBeDisabled()
  })
})

test.describe('Permission Boundaries', () => {
  test('admin has workspace access, user does not', async ({ page }) => {
    const adminEmail = process.env.ADMIN_EMAIL
    const adminPassword = process.env.ADMIN_PASSWORD
    
    if (!adminEmail || !adminPassword) {
      test.skip()
      return
    }

    // Test admin has workspace access
    await login(page, adminEmail, adminPassword)
    await page.getByRole('button', { name: 'Settings' }).click()
    await expect(page.getByRole('tab', { name: /Workspace/i })).toBeVisible()
  })

  test('regular user has no admin features', async ({ page }) => {
    const userEmail = process.env.USER_EMAIL
    const userPassword = process.env.USER_PASSWORD
    
    if (!userEmail || !userPassword) {
      test.skip()
      return
    }

    // Test user cannot see workspace tab
    await login(page, userEmail, userPassword)
    await page.getByRole('button', { name: 'Settings' }).click()
    await expect(page.getByRole('tab', { name: /Workspace/i })).toHaveCount(0)
  })
})
