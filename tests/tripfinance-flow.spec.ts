import { test, expect } from '@playwright/test';

test.describe('TripFinance E2E Unified System Flows', () => {
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  const testEmail = `tester-${randomSuffix}@gmail.com`;
  const testPassword = 'password123';
  const testName = `Playwright Tester ${randomSuffix}`;

  test('Signup, Register Card with Photo, Create Workspace, Add Expense, and check Home Hub Feed', async ({ page }) => {
    test.setTimeout(60000);
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    // 1. Go to Login / Auth screen
    await page.goto('http://localhost:3000/login');
    await expect(page).toHaveTitle(/TripFinance/);

    // 2. Toggle to Sign Up form
    await page.click('text=Create a family account');
    await expect(page.locator('text=Full Name')).toBeVisible();

    // 3. Fill in account details and register
    await page.fill('input[placeholder="Your name"]', testName);
    await page.fill('input[placeholder="name@example.com"]', testEmail);
    await page.fill('input[placeholder="••••••••"]', testPassword);
    
    await page.click('button:has-text("Create Account")');

    // 4. Wait for redirect to Unified Home Hub (/personal)
    await page.waitForURL('**/personal', { timeout: 15000 });
    await expect(page.locator('h2')).toContainText('Home Hub');
    await expect(page.locator('text=Hello,')).toContainText(testName);

    // 5. Navigate to Secure Wallet (/cards)
    await page.click('button[title="Wallet"]');
    await page.waitForURL('**/cards');
    await expect(page.locator('span:has-text("Wallet")').first()).toBeVisible();

    // 6. Register a card with an image photo
    await page.fill('input[placeholder="e.g. Target RedCard"]', 'Chase Sapphire');
    
    // Create a mock image file buffer to upload
    const mockImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    await page.setInputFiles('input[type="file"]', {
      name: 'playwright_card.png',
      mimeType: 'image/png',
      buffer: mockImageBuffer
    });

    await page.click('button:has-text("Add Card to Wallet")');
    
    // Verify card card_name is added to secure deck list
    await expect(page.locator('text=Chase Sapphire').first()).toBeVisible();
    await expect(page.locator('text=SECURED RLS CREDENTIAL').first()).toBeVisible();

    // 7. Go to Workspaces dashboard (/groups)
    await page.goto('http://localhost:3000/groups');
    await page.waitForURL('**/groups');
    await expect(page.locator('h1')).toContainText('Shared Workspaces');

    // 8. Create a new Family workspace
    await page.click('button:has-text("Create Family Group")');
    await page.fill('input[placeholder="e.g. Koh Family Home, Japan 2026"]', 'Playwright Holiday');
    await page.click('button:has-text("Create Group Workspace")');

    // Verify it is listed in workspaces
    await expect(page.locator('text=Playwright Holiday').first()).toBeVisible();
    await expect(page.locator('text=INVITE CODE:').first()).toBeVisible();

    // 9. Open group workspace page
    await page.click('button:has-text("Open Workspace")');
    await page.waitForURL('**/groups/*');
    await expect(page.locator('h2').first()).toContainText('Playwright Holiday');

    // 10. Record a group expense
    await page.click('button:has-text("Add Expense")');
    await page.fill('#amount', '120.00');
    await page.fill('#desc', 'Playwright Dinner');
    
    // Select the Chase Sapphire card we registered earlier
    await page.click('button:has-text("Cash")'); // Click select trigger
    await page.click('text=Chase Sapphire'); // Select option

    await page.waitForTimeout(1000);
    await page.locator('button[type="submit"]').click({ force: true });

    // Verify the transaction is listed in group ledger feed
    await expect(page.locator('text=Playwright Dinner').first()).toBeVisible();
    await expect(page.locator('text=$120.00').first()).toBeVisible();
    await expect(page.locator('text=Chase Sapphire').first()).toBeVisible();

    // 11. Go back to Unified Home Hub and verify timeline
    await page.goto('http://localhost:3000/personal');
    await page.waitForURL('**/personal');
    
    // Verify feed has personal summary status & the merged timeline entry!
    await expect(page.locator('text=Playwright Dinner').first()).toBeVisible();
    await expect(page.locator('text=Playwright Holiday').first()).toBeVisible();
    await expect(page.locator('text=Chase Sapphire').first()).toBeVisible();
  });
});
