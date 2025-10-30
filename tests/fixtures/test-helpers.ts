import { Page, expect, type Request, type Response, type ConsoleMessage } from '@playwright/test'

/**
 * Test Helpers & Fixtures for Org Branding Tests
 */

export interface TestCredentials {
  email: string
  password: string
}

export interface OrgBrandingFixture {
  orgName: string
  orgLogo: string | null
}

/**
 * Get admin credentials from environment
 */
export function getAdminCredentials(): TestCredentials | null {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  
  if (!email || !password) {
    return null
  }
  
  return { email, password }
}

/**
 * Get regular user credentials from environment
 */
export function getUserCredentials(): TestCredentials | null {
  const email = process.env.USER_EMAIL
  const password = process.env.USER_PASSWORD
  
  if (!email || !password) {
    return null
  }
  
  return { email, password }
}

/**
 * Login helper - authenticates user and waits for app shell
 */
export async function login(page: Page, credentials: TestCredentials) {
  await page.goto('/')
  await page.getByLabel('Email').fill(credentials.email)
  await page.getByLabel('Password').fill(credentials.password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  
  // Wait for successful auth - app shell should appear
  await expect(page.getByRole('button', { name: 'New Search' })).toBeVisible({ 
    timeout: 15000 
  })
}

/**
 * Login as admin helper
 */
export async function loginAsAdmin(page: Page) {
  const creds = getAdminCredentials()
  if (!creds) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set')
  }
  await login(page, creds)
}

/**
 * Login as regular user helper
 */
export async function loginAsUser(page: Page) {
  const creds = getUserCredentials()
  if (!creds) {
    throw new Error('USER_EMAIL and USER_PASSWORD must be set')
  }
  await login(page, creds)
}

/**
 * Open settings dialog and navigate to specific tab
 */
export async function openSettingsTab(page: Page, tabName: 'Profile' | 'Workspace') {
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  
  const tab = page.getByRole('tab', { name: new RegExp(tabName, 'i') })
  await tab.click()
}

/**
 * Create a test PNG file buffer
 */
export function createTestPNG(): Buffer {
  // Minimal valid PNG (1x1 transparent pixel)
  const png = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
    0x00, 0x00, 0x00, 0x0d, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, // Width: 1
    0x00, 0x00, 0x00, 0x01, // Height: 1
    0x08, 0x06, 0x00, 0x00, 0x00, // Bit depth, color type, etc.
    0x1f, 0x15, 0xc4, 0x89, // CRC
    0x00, 0x00, 0x00, 0x0a, // IDAT chunk length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01,
    0x0d, 0x0a, 0x2d, 0xb4, // IDAT data + CRC
    0x00, 0x00, 0x00, 0x00, // IEND chunk length
    0x49, 0x45, 0x4e, 0x44, // IEND
    0xae, 0x42, 0x60, 0x82  // CRC
  ])
  return png
}

/**
 * Create a test JPEG file buffer (for validation testing)
 */
export function createTestJPEG(): Buffer {
  // Minimal valid JPEG
  const jpeg = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, // JPEG SOI + APP0
    0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
    0x00, 0x01, 0x00, 0x00,
    0xff, 0xd9 // JPEG EOI
  ])
  return jpeg
}

/**
 * Wait for toast notification with specific text
 */
export async function waitForToast(page: Page, text: string | RegExp, timeout = 10000) {
  await expect(page.getByText(text)).toBeVisible({ timeout })
}

/**
 * Wait for toast to disappear
 */
export async function waitForToastToDisappear(page: Page, text: string | RegExp, timeout = 5000) {
  await expect(page.getByText(text)).not.toBeVisible({ timeout })
}

/**
 * Monitor network requests for specific endpoint
 */
export interface NetworkRequestDetails {
  url: string
  method: string
  status?: number
}

export interface NetworkMonitor {
  requests: NetworkRequestDetails[]
  stop: () => void
}

export function monitorNetworkRequests(page: Page, urlPattern: string | RegExp): NetworkMonitor {
  const requests: NetworkRequestDetails[] = []
  const pattern = typeof urlPattern === 'string' ? new RegExp(urlPattern) : urlPattern

  const requestHandler = (request: Request) => {
    const url = request.url()
    if (pattern.test(url)) {
      requests.push({
        url,
        method: request.method(),
      })
    }
  }

  const responseHandler = (response: Response) => {
    const url = response.url()
    if (pattern.test(url)) {
      const existing = requests.find(entry => entry.url === url && entry.status === undefined)
      if (existing) {
        existing.status = response.status()
      }
    }
  }

  page.on('request', requestHandler)
  page.on('response', responseHandler)

  return {
    requests,
    stop: () => {
      page.off('request', requestHandler)
      page.off('response', responseHandler)
    }
  }
}

/**
 * Check for console errors
 */
export function monitorConsoleErrors(page: Page): { errors: string[]; stop: () => void } {
  const errors: string[] = []

  const handler = (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  }

  page.on('console', handler)

  return {
    errors,
    stop: () => page.off('console', handler)
  }
}

/**
 * Get workspace data from sidebar (if visible)
 */
export async function getWorkspaceDataFromSidebar(page: Page): Promise<{ name: string | null; hasLogo: boolean }> {
  const sidebar = page.locator('.sidebar, [class*="sidebar"]').first()
  const isVisible = await sidebar.isVisible().catch(() => false)
  
  if (!isVisible) {
    return { name: null, hasLogo: false }
  }
  
  const text = await sidebar.textContent()
  const logo = sidebar.locator('img[alt]').first()
  const hasLogo = await logo.isVisible().catch(() => false)
  
  return {
    name: text,
    hasLogo
  }
}

/**
 * Take screenshot with timestamp
 */
export async function takeTimestampedScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  await page.screenshot({ 
    path: `test-results/screenshots/${name}-${timestamp}.png`,
    fullPage: true 
  })
}
