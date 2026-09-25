import { test, expect } from '@playwright/test';

test.describe('Admin Question CRUD', () => {
  test.use({ extraHTTPHeaders: { 'x-playwright-test': 'true' } });

  test('should load the admin questions page and open the add dialog', async ({ page }) => {
    await page.goto('/admin/questions');
    await expect(page.locator('h2').first()).toHaveText(/question manager/i);
    
    // Open add question dialog
    await page.getByRole('button', { name: /add question/i }).click();
    
    // Check if dialog is visible
    // Check if dialog is visible
    await expect(page.locator('.lg\\:col-span-1').getByText(/new question/i)).toBeVisible();
  });
});
