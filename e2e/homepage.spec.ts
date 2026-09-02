import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('loads with hero section visible after loading', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(8000);
    await expect(page.locator('h1')).toBeVisible({ timeout: 15000 });
  });

  test('quick command cards are visible after load', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(8000);
    await expect(page.getByText('MY GITHUB').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('MY PROJECTS').first()).toBeVisible({ timeout: 15000 });
  });

  test('HUD ACTIVE indicator is present', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(5000);
    await expect(page.getByText('ACTIVE').first()).toBeVisible({ timeout: 15000 });
  });

  test('STATUS READY is present', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(5000);
    await expect(page.getByText('STATUS: READY').first()).toBeVisible({ timeout: 15000 });
  });

  test('stats section has PROJECTS text', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(8000);
    const html = await page.content();
    expect(html).toContain('PROJECTS');
    expect(html).toContain('SKILLS');
    expect(html).toContain('EXPERIENCE');
  });

  test('chat input is visible at bottom', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(5000);
    await expect(page.getByText('SEND').first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe('404 Page', () => {
  test('shows 404 for unknown routes', async ({ page }) => {
    await page.goto('/nonexistent-page');
    await page.waitForTimeout(3000);
    const html = await page.content();
    expect(html).toContain('404');
  });
});

test.describe('Blog Page', () => {
  test('blog page loads', async ({ page }) => {
    await page.goto('/blog');
    await page.waitForTimeout(3000);
    await expect(page.locator('h1')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('SEO & Meta', () => {
  test('homepage has correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Fahim|Portfolio/);
  });

  test('sitemap.xml is accessible', async ({ page }) => {
    const response = await page.goto('/sitemap.xml');
    expect(response?.status()).toBe(200);
  });

  test('robots.txt is accessible', async ({ page }) => {
    const response = await page.goto('/robots.txt');
    expect(response?.status()).toBe(200);
  });
});

test.describe('Accessibility', () => {
  test('all images have alt text', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(8000);
    const images = page.locator('img:not([alt])');
    const count = await images.count();
    expect(count).toBe(0);
  });

  test('buttons have accessible names', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(8000);
    const buttons = page.locator('button');
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      const text = await btn.textContent();
      const ariaLabel = await btn.getAttribute('aria-label');
      expect(text || ariaLabel).toBeTruthy();
    }
  });
});

test.describe('Performance', () => {
  test('homepage loads within 15 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(15000);
  });

  test('no critical console errors on homepage', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon') && !text.includes('404') && !text.includes('net::') && !text.includes('Failed to load resource')) {
          errors.push(text);
        }
      }
    });
    await page.goto('/');
    await page.waitForTimeout(8000);
    expect(errors).toHaveLength(0);
  });
});
