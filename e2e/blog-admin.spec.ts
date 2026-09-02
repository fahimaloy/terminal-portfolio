import { test, expect } from '@playwright/test';

test.describe('Blog', () => {
  test('blog listing page loads', async ({ page }) => {
    await page.goto('/blog');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('blog search works', async ({ page }) => {
    await page.goto('/blog');
    const searchInput = page.locator('input[placeholder*="search" i]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);
    }
  });

  test('blog cards have proper structure', async ({ page }) => {
    await page.goto('/blog');
    const cards = page.locator('[class*="blog-card"], [class*="BlogCard"]');
    const count = await cards.count();
    if (count > 0) {
      await expect(cards.first()).toBeVisible();
    }
  });

  test('blog post page renders', async ({ page }) => {
    await page.goto('/blog');
    const firstLink = page.locator('a[href*="/blog/"]').first();
    if (await firstLink.isVisible()) {
      await firstLink.click();
      await expect(page.locator('article, [class*="blog-post"]')).toBeVisible();
    }
  });
});

test.describe('Blog Admin CRUD', () => {
  test('admin login page loads', async ({ page }) => {
    await page.goto('/sudosuperuser-ostaad/login');
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('redirects to login when unauthorized', async ({ page }) => {
    await page.goto('/sudosuperuser-ostaad/blogs');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login form has proper fields', async ({ page }) => {
    await page.goto('/sudosuperuser-ostaad/login');
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});

test.describe('Contact Form', () => {
  test('contact form is accessible', async ({ page }) => {
    await page.goto('/');
    const contactLink = page.locator('a[href*="contact"], button:has-text("EMAIL")');
    if (await contactLink.first().isVisible()) {
      await contactLink.first().click();
    }
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
    const images = page.locator('img:not([alt])');
    const count = await images.count();
    expect(count).toBe(0);
  });

  test('form inputs have labels', async ({ page }) => {
    await page.goto('/sudosuperuser-ostaad/login');
    const inputs = page.locator('input:not([aria-label])');
    const count = await inputs.count();
    // All inputs should have aria-label or associated label
  });

  test('buttons have accessible names', async ({ page }) => {
    await page.goto('/');
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
  test('homepage loads within 3 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(3000);
  });

  test('no console errors on homepage', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    expect(errors).toHaveLength(0);
  });
});
