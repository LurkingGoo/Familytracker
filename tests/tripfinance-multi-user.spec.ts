import { test, expect } from '@playwright/test';

test.describe('TripFinance Multi-User Group Expense Flow', () => {
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  const userA_Email = `userA-${randomSuffix}@gmail.com`;
  const userB_Email = `userB-${randomSuffix}@gmail.com`;
  const testPassword = 'password123';
  
  test('User A creates group, User B joins, B adds expense with location, B deletes it', async ({ browser }) => {
    test.setTimeout(90000); // 90 seconds
    
    // Create contexts for two distinct users
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    pageA.on('console', msg => console.log('PAGE A LOG:', msg.text()));
    pageB.on('console', msg => console.log('PAGE B LOG:', msg.text()));

    // 1. User A Sign Up
    await pageA.goto('http://localhost:3000/login');
    await pageA.click('text=Create a family account');
    await pageA.fill('input[placeholder="Your name"]', 'User A');
    await pageA.fill('input[placeholder="name@example.com"]', userA_Email);
    await pageA.fill('input[placeholder="••••••••"]', testPassword);
    await pageA.click('button:has-text("Create Account")');
    await pageA.waitForURL('**/personal', { timeout: 15000 });

    // User A creates group
    await pageA.goto('http://localhost:3000/groups');
    await pageA.click('button:has-text("Create Family Group")');
    await pageA.fill('input[placeholder="e.g. Koh Family Home, Japan 2026"]', 'MultiUser Shared Group');
    await pageA.click('button:has-text("Create Group Workspace")');
    
    await expect(pageA.locator('text=MultiUser Shared Group').first()).toBeVisible();
    
    // Extract join code
    const inviteCodeLocator = pageA.locator('code').first();
    await expect(inviteCodeLocator).toBeVisible();
    const joinCode = await inviteCodeLocator.innerText();
    console.log('Got Join Code:', joinCode);

    // 2. User B Sign Up
    await pageB.goto('http://localhost:3000/login');
    await pageB.click('text=Create a family account');
    await pageB.fill('input[placeholder="Your name"]', 'User B');
    await pageB.fill('input[placeholder="name@example.com"]', userB_Email);
    await pageB.fill('input[placeholder="••••••••"]', testPassword);
    await pageB.click('button:has-text("Create Account")');
    await pageB.waitForURL('**/personal', { timeout: 15000 });

    // User B joins group
    await pageB.goto('http://localhost:3000/groups');
    await pageB.click('button:has-text("Enter Join Code")');
    await pageB.fill('input[placeholder="FAM-XXXXXX"]', joinCode);
    await pageB.click('button:has-text("Join Group Space")');

    // User B goes to group
    await pageB.click('button:has-text("Open Workspace")');
    await pageB.waitForURL('**/groups/*');
    await expect(pageB.locator('h2').first()).toContainText('MultiUser Shared Group');

    // User B adds expense with location
    await pageB.click('button:has-text("Add Expense")');
    await pageB.fill('#amount', '75.50');
    await pageB.fill('#desc', 'MultiUser Dinner');
    await pageB.fill('#loc', 'Central Restaurant');
    await pageB.click('button:has-text("Record Transaction")');

    // Verify expense shows up for User B
    await expect(pageB.locator('text=MultiUser Dinner').first()).toBeVisible();
    await expect(pageB.locator('text=Central Restaurant').first()).toBeVisible();

    // User A goes to group and verifies expense
    await pageA.click('button:has-text("Open Workspace")');
    await pageA.waitForURL('**/groups/*');
    await expect(pageA.locator('text=MultiUser Dinner').first()).toBeVisible();
    await expect(pageA.locator('text=Central Restaurant').first()).toBeVisible();

    // User B deletes the expense
    const trashButtonB = pageB.locator('.lucide-trash-2').first();
    // Use force true because hover state opacity might be in effect
    await trashButtonB.click({ force: true });
    
    // Verify expense is gone for User B
    await expect(pageB.locator('text=MultiUser Dinner')).toHaveCount(0);

    // Verify expense is gone for User A (reloading as we don't have realtime subscriptions active)
    await pageA.reload();
    await expect(pageA.locator('text=MultiUser Dinner')).toHaveCount(0);
    
    await contextA.close();
    await contextB.close();
  });
});
