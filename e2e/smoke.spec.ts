import { expect, test } from '@playwright/test';

test('visitor can reach sign-in and dashboard entry points', async ({ page }) => {
  await page.goto('/auth');
  await expect(page).toHaveURL(/\/auth(?:\?|$)/);
  await expect(page.getByText('Welcome back')).toBeVisible();

  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);
  await expect(page.getByRole('navigation', { name: 'Workspace views' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
});

test('sign-up navigation is available from the auth entry point', async ({ page }) => {
  await page.goto('/auth/sign-up');
  await expect(page).toHaveURL(/\/auth\/sign-up(?:\?|$)/);
  await expect(page.getByText('Create your account')).toBeVisible();
});
