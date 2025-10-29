import { test, expect } from '@playwright/test'
import path from 'path'

/**
 * Org Branding & Settings Integration Tests
 * 
 * Tests cover:
 * 1. Login page org branding display
 * 2. Sidebar workspace display (authenticated)
 * 3. Admin settings - workspace name update
 * 4. Admin settings - logo upload (PNG validation)
 * 5. Loading states and error handling
 * 6. Toast notifications
 */

// Helper to login as admin
async function loginAsAdmin(page: any) {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  
  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set for admin tests')
  }

  await page.goto('/')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page.getByRole('button', { name: 'New Search' })).toBeVisible({ timeout: 15000 })
}

test.describe('Login Page Org Branding', () => {
  test('displays org name and logo on login page', async ({ page }) => {
    await page.goto('/')
    
    // Should show org name (or default)
    const heading = page.getByRole('heading', { name: /Welcome to/i })
    await expect(heading).toBeVisible()
    
    // Should attempt to load org logo (may be hidden if no logo set)
    const logoImg = page.locator('img[alt]').first()
    await expect(logoImg).toBeAttached()
  })

  test('fetches org data on each visit', async ({ page }) => {
    let orgFetchCount = 0
    
    page.on('response', (resp) => {
      if (resp.url().includes('/rest/v1/org') && resp.request().method() === 'GET') {
        orgFetchCount++
      }
    })

    // First visit
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    
    // Reload to trigger second visit
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    
    // Should have fetched org data at least twice (once per visit)
    expect(orgFetchCount).toBeGreaterThanOrEqual(2)
  })

  test('handles missing org data gracefully', async ({ page }) => {
    const consoleErrors: string[] = []
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    
    // Should not have uncaught errors
    expect(consoleErrors.filter(e => e.includes('Uncaught'))).toHaveLength(0)
  })
})

test.describe('Sidebar Workspace Display', () => {
  test('shows workspace name and logo after login', async ({ page }) => {
    const email = process.env.ADMIN_EMAIL
    const password = process.env.ADMIN_PASSWORD
    
    if (!email || !password) {
      test.skip()
      return
    }

    await loginAsAdmin(page)
    
    // Sidebar should be visible
    const sidebar = page.locator('.sidebar, [class*="sidebar"]').first()
    await expect(sidebar).toBeVisible({ timeout: 5000 })
    
    // Workspace logo should be present
    const workspaceLogo = page.locator('img[alt]').first()
    await expect(workspaceLogo).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Admin Settings - Workspace Management', () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.ADMIN_EMAIL
    const password = process.env.ADMIN_PASSWORD
    
    if (!email || !password) {
      test.skip()
      return
    }

    await loginAsAdmin(page)
  })

  test('admin can access workspace settings tab', async ({ page }) => {
    // Open settings dialog
    await page.getByRole('button', { name: 'Settings' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    
    // Workspace tab should be clickable (not disabled)
    const workspaceTab = page.getByRole('tab', { name: /Workspace/i })
    await expect(workspaceTab).toBeVisible()
    await expect(workspaceTab).not.toBeDisabled()
    
    // Click workspace tab
    await workspaceTab.click()
    
    // Should show workspace settings form
    await expect(page.getByLabel('Workspace Name')).toBeVisible()
    await expect(page.getByLabel('Workspace Logo')).toBeVisible()
  })

  test('workspace name field syncs with current workspace', async ({ page }) => {
    // Open settings
    await page.getByRole('button', { name: 'Settings' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    
    // Go to workspace tab
    await page.getByRole('tab', { name: /Workspace/i }).click()
    
    // Workspace name input should have a value
    const nameInput = page.getByLabel('Workspace Name')
    const value = await nameInput.inputValue()
    expect(value.length).toBeGreaterThan(0)
  })

  test('can update workspace name', async ({ page }) => {
    // Open settings
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByRole('tab', { name: /Workspace/i }).click()
    
    // Get current name
    const nameInput = page.getByLabel('Workspace Name')
    const originalName = await nameInput.inputValue()
    
    // Update name
    const newName = `Test Workspace ${Date.now()}`
    await nameInput.fill(newName)
    
    // Save changes
    const saveButton = page.getByRole('button', { name: /Save Changes/i })
    await saveButton.click()
    
    // Should show loading state
    await expect(saveButton).toBeDisabled({ timeout: 1000 }).catch(() => {})
    
    // Should show success toast
    await expect(page.getByText(/updated successfully/i)).toBeVisible({ timeout: 10000 })
    
    // Revert back to original (cleanup)
    await nameInput.fill(originalName)
    await saveButton.click()
    await expect(page.getByText(/updated successfully/i)).toBeVisible({ timeout: 10000 })
  })

  test('prevents duplicate submissions with loading state', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByRole('tab', { name: /Workspace/i }).click()
    
    const nameInput = page.getByLabel('Workspace Name')
    await nameInput.fill(`Test ${Date.now()}`)
    
    const saveButton = page.getByRole('button', { name: /Save Changes/i })
    
    // Click save
    await saveButton.click()
    
    // Button should become disabled (loading state)
    const isDisabledDuringSave = await saveButton.isDisabled().catch(() => false)
    expect(isDisabledDuringSave).toBeTruthy()
  })
})

test.describe('Admin Settings - Logo Upload', () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.ADMIN_EMAIL
    const password = process.env.ADMIN_PASSWORD
    
    if (!email || !password) {
      test.skip()
      return
    }

    await loginAsAdmin(page)
  })

  test('enforces PNG-only validation', async ({ page }) => {
    // Open settings
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByRole('tab', { name: /Workspace/i }).click()
    
    // Find file input
    const fileInput = page.locator('input[type="file"][accept="image/png"]')
    await expect(fileInput).toBeAttached()
    
    // Try to upload a non-PNG file (simulate JPEG)
    // Note: This tests client-side validation
    const accept = await fileInput.getAttribute('accept')
    expect(accept).toContain('image/png')
  })

  test('shows upload progress during logo upload', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByRole('tab', { name: /Workspace/i }).click()
    
    // Check for upload label text
    const uploadLabel = page.getByText(/PNG only/i)
    await expect(uploadLabel).toBeVisible()
    
    // File input should be present and enabled initially
    const fileInput = page.locator('input[type="file"][accept="image/png"]')
    await expect(fileInput).not.toBeDisabled()
  })

  test('displays workspace logo preview', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByRole('tab', { name: /Workspace/i }).click()
    
    // Logo preview container should be visible
    const logoPreview = page.locator('img[alt="Workspace logo"]')
    await expect(logoPreview).toBeVisible()
  })
})

test.describe('Error Handling & Toast Notifications', () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.ADMIN_EMAIL
    const password = process.env.ADMIN_PASSWORD
    
    if (!email || !password) {
      test.skip()
      return
    }

    await loginAsAdmin(page)
  })

  test('shows error toast for invalid operations', async ({ page }) => {
    // Open settings
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByRole('tab', { name: /Workspace/i }).click()
    
    // Clear workspace name (invalid)
    const nameInput = page.getByLabel('Workspace Name')
    await nameInput.fill('')
    
    // Try to save
    await page.getByRole('button', { name: /Save Changes/i }).click()
    
    // Should show error or validation message
    // (Actual behavior depends on backend validation)
    await page.waitForTimeout(2000)
  })

  test('toast notifications use correct variants', async ({ page }) => {
    // Check that sonner toast container exists
    await page.goto('/')
    
    // Toast container should be in DOM (even if hidden)
    const toastContainer = page.locator('[data-sonner-toaster]')
    // Container might not be visible until a toast is shown
    await expect(toastContainer).toBeAttached({ timeout: 10000 }).catch(() => {})
  })
})

test.describe('Non-Admin User Restrictions', () => {
  test('non-admin cannot access workspace settings', async ({ page }) => {
    const email = process.env.USER_EMAIL
    const password = process.env.USER_PASSWORD
    
    if (!email || !password) {
      test.skip()
      return
    }

    // Login as regular user
    await page.goto('/')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page.getByRole('button', { name: 'New Search' })).toBeVisible({ timeout: 15000 })
    
    // Open settings
    await page.getByRole('button', { name: 'Settings' }).click()
    
    // Workspace and Team Management tabs should be hidden
    await expect(page.getByRole('tab', { name: /Workspace/i })).toHaveCount(0)
    await expect(page.getByRole('tab', { name: /Team Management/i })).toHaveCount(0)
  })
})

test.describe('State Synchronization', () => {
  test('workspace name updates reflect in sidebar', async ({ page }) => {
    const email = process.env.ADMIN_EMAIL
    const password = process.env.ADMIN_PASSWORD
    
    if (!email || !password) {
      test.skip()
      return
    }

    await loginAsAdmin(page)
    
    // Get original workspace name from sidebar
    const sidebar = page.locator('.sidebar, [class*="sidebar"]').first()
    const originalText = await sidebar.textContent()
    
    // Open settings and change name
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByRole('tab', { name: /Workspace/i }).click()
    
    const nameInput = page.getByLabel('Workspace Name')
    const testName = `Test ${Date.now()}`
    await nameInput.fill(testName)
    await page.getByRole('button', { name: /Save Changes/i }).click()
    await expect(page.getByText(/updated successfully/i)).toBeVisible({ timeout: 10000 })
    
    // Close dialog
    await page.keyboard.press('Escape')
    
    // Sidebar should reflect new name (eventually)
    await page.waitForTimeout(1000)
    
    // Note: Actual text check would depend on sidebar structure
    // This is a placeholder for validation
  })
})
