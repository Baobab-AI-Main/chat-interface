# Playwright Tests - Org Branding & Settings Integration

## Overview

Comprehensive end-to-end tests for the organization branding and settings management features.

## Test Coverage

### 1. **Login Page Org Branding** (`org-branding.spec.ts`)
- ✅ Displays org name and logo on login page
- ✅ Fetches org data on each visit (independent fetch)
- ✅ Handles missing org data gracefully
- ✅ No console errors or uncaught exceptions

### 2. **Sidebar Workspace Display**
- ✅ Shows workspace name and logo after authentication
- ✅ Reads workspace data from AuthContext

### 3. **Admin Settings - Workspace Management**
- ✅ Admin can access workspace settings tab
- ✅ Workspace name field syncs with current workspace
- ✅ Can update workspace name successfully
- ✅ Prevents duplicate submissions with loading states
- ✅ Shows loading indicators ("Saving...")

### 4. **Admin Settings - Logo Upload**
- ✅ Enforces PNG-only validation (file input accept attribute)
- ✅ Shows upload progress indicators
- ✅ Displays workspace logo preview
- ✅ Disables input during upload

### 5. **Error Handling & Notifications**
- ✅ Shows error toasts for invalid operations
- ✅ Toast notifications use correct variants (success/error)
- ✅ Toast container exists in DOM

### 6. **Non-Admin User Restrictions**
- ✅ Non-admin users cannot access workspace settings tab
- ✅ Workspace tab is disabled for regular users

### 7. **State Synchronization**
- ✅ Workspace name updates reflect in sidebar
- ✅ useEffect syncs form state with context

## Setup

### 1. Install Dependencies
```bash
npm install
npx playwright install chromium
```

### 2. Configure Environment Variables

Create a `.env.test` file in the project root:

```env
# Base URL (defaults to http://localhost:3000 if not set)
BASE_URL=http://localhost:3000

# Admin credentials (required for admin tests)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-admin-password

# Regular user credentials (required for permission tests)
USER_EMAIL=user@example.com
USER_PASSWORD=your-user-password

# Supabase credentials (if testing against local/staging)
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
```

### 3. Start Development Server

```bash
npm run dev
```

The server should be running on `http://localhost:3000` (or the port specified in `BASE_URL`)

## Running Tests

### Run All Tests
```bash
npm run test:e2e
```

Or using Playwright directly:
```bash
npx playwright test
```

### Run Specific Test File
```bash
npx playwright test tests/org-branding.spec.ts
```

### Run Tests in UI Mode (Interactive)
```bash
npx playwright test --ui
```

### Run Tests in Headed Mode (See Browser)
```bash
npx playwright test --headed
```

### Run Tests with Debug Mode
```bash
npx playwright test --debug
```

### Run Specific Test by Name
```bash
npx playwright test -g "displays org name and logo"
```

### Run Only Admin Tests
```bash
npx playwright test -g "Admin Settings"
```

## Test Reports

### View HTML Report
```bash
npx playwright show-report
```

Reports are generated in `playwright-report/` directory after test runs.

### Screenshots & Videos

- **Screenshots**: Captured on test failures (see `test-results/`)
- **Videos**: Disabled by default (can enable in `playwright.config.ts`)
- **Traces**: Retained on failure for debugging

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps chromium
      
      - name: Start dev server
        run: npm run dev &
        env:
          BASE_URL: http://localhost:3000
      
      - name: Wait for server
        run: npx wait-on http://localhost:3000
      
      - name: Run tests
        run: npx playwright test
        env:
          ADMIN_EMAIL: ${{ secrets.ADMIN_EMAIL }}
          ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}
          USER_EMAIL: ${{ secrets.USER_EMAIL }}
          USER_PASSWORD: ${{ secrets.USER_PASSWORD }}
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Test Structure

```
tests/
├── README.md                      # This file
├── fixtures/
│   └── test-helpers.ts           # Shared test utilities
├── auth.spec.ts                  # Authentication tests
├── org.spec.ts                   # Org branding smoke tests
├── org-branding.spec.ts          # Comprehensive org branding tests
└── smoke.spec.ts                 # General smoke tests
```

## Test Helpers

See `tests/fixtures/test-helpers.ts` for reusable utilities:

- `loginAsAdmin(page)` - Login as admin user
- `loginAsUser(page)` - Login as regular user
- `openSettingsTab(page, tabName)` - Open settings dialog and navigate to tab
- `waitForToast(page, text)` - Wait for toast notification
- `monitorNetworkRequests(page, pattern)` - Monitor API calls
- `monitorConsoleErrors(page)` - Capture console errors
- `createTestPNG()` - Generate test PNG file
- `createTestJPEG()` - Generate test JPEG file (for validation)

## Troubleshooting

### Tests Skipping

If tests are being skipped, ensure environment variables are set:

```bash
# Check if variables are set
echo $ADMIN_EMAIL
echo $ADMIN_PASSWORD
```

### Authentication Failures

1. Verify credentials are correct in `.env.test`
2. Check Supabase connection is working
3. Ensure RLS policies allow test user access

### Network Timeouts

Increase timeout in specific tests:
```typescript
test('slow test', async ({ page }) => {
  test.setTimeout(60000) // 60 seconds
  // ... test code
})
```

### Database State

For tests that modify data (workspace name, logo):
- Tests include cleanup steps (reverting to original values)
- Consider using test-specific workspaces if possible
- Reset database state between test runs if needed

### Flaky Tests

Common causes:
1. **Race conditions**: Add explicit waits for elements/network
2. **Toast timing**: Increase toast wait timeout
3. **Network latency**: Use `waitForLoadState('networkidle')`

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Revert changes made during tests
3. **Assertions**: Use explicit waits and assertions
4. **Selectors**: Prefer role-based selectors over CSS
5. **Environment**: Use separate test database when possible

## Performance

Average test execution time:
- Login page tests: ~2-5 seconds
- Admin settings tests: ~10-15 seconds (includes login)
- Full suite: ~2-3 minutes

## Contributing

When adding new tests:

1. Follow existing patterns in `org-branding.spec.ts`
2. Add test helpers to `test-helpers.ts` for reusability
3. Use descriptive test names
4. Add comments for complex assertions
5. Update this README with new test coverage

## Support

For issues or questions:
- Check Playwright docs: https://playwright.dev
- Review test output and traces
- Enable debug mode for step-by-step execution
