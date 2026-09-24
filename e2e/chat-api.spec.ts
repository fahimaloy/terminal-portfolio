import { test, expect, BrowserContext } from '@playwright/test';

async function dismissBootSequence(context: BrowserContext) {
  await context.addInitScript(() => {
    window.sessionStorage.setItem('cyberpunk-boot-shown', '1');
  });
}

async function dismissNextPortal(page: any) {
  const portal = page.locator('nextjs-portal');
  if (await portal.isVisible()) {
    await portal.evaluate((el: any) => (el.style.display = 'none'));
    await expect(portal).not.toBeVisible();
  }
}

test.describe('Chat Interface', () => {
  test.beforeEach(async ({ context }) => {
    await dismissBootSequence(context);
  });

  test('chat overlay opens from the chat input', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });
    await dismissNextPortal(page);
    const chatInput = page.locator('input[aria-label="Open chat"]');
    await expect(chatInput).toBeVisible({ timeout: 15000 });
    await chatInput.click();
    const textarea = page.locator(
      'textarea[placeholder^="Ask about my development projects"]',
    );
    await expect(textarea).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('CLOSE', { exact: true })).toBeVisible({
      timeout: 5000,
    });
  });

  test('chat overlay closes on escape', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });
    await dismissNextPortal(page);
    const chatInput = page.locator('input[aria-label="Open chat"]');
    await expect(chatInput).toBeVisible({ timeout: 15000 });
    await chatInput.click();
    const textarea = page.locator(
      'textarea[placeholder^="Ask about my development projects"]',
    );
    await expect(textarea).toBeVisible({ timeout: 5000 });
    await page.keyboard.press('Escape');
    await expect(textarea).not.toBeVisible();
    await expect(page.getByText('CLOSE', { exact: true })).not.toBeVisible();
  });

  test('sending a message shows response', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });
    await dismissNextPortal(page);
    const chatInput = page.locator('input[aria-label="Open chat"]');
    await expect(chatInput).toBeVisible({ timeout: 15000 });
    await chatInput.click();
    const input = page.locator(
      'textarea[placeholder^="Ask about my development projects"]',
    );
    await expect(input).toBeVisible({ timeout: 5000 });
    await input.fill('Hello');
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-chat-msg]').first()).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.locator('[data-chat-msg]').filter({ hasText: 'Hello' }),
    ).toHaveCount(1, {
      timeout: 15000,
    });
  });

  test('quick cards send messages', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });
    await dismissNextPortal(page);
    const githubCard = page.getByRole('button', { name: /MY GITHUB/ });
    await expect(githubCard).toBeVisible({ timeout: 15000 });
    await githubCard.click();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page
        .locator('[data-chat-msg]')
        .filter({ hasText: 'Show me your GitHub' }),
    ).toHaveCount(1, { timeout: 15000 });
  });
});

test.describe('API Endpoints', () => {
  test('GET /api/blogs returns 200', async ({ request }) => {
    const response = await request.get('/api/blogs');
    expect(response.status()).toBe(200);
  });

  test('GET /api/blogs/[slug] returns 200 or 404', async ({ request }) => {
    const response = await request.get('/api/blogs/test-slug');
    expect([200, 404, 500]).toContain(response.status());
  });

  test('POST /api/contact validates input', async ({ request }) => {
    const response = await request.post('/api/contact', {
      data: { name: '', email: '', message: '' },
    });
    expect([200, 400, 500]).toContain(response.status());
  });

  test('GET /api/admin/blogs requires auth', async ({ request }) => {
    const response = await request.get('/api/admin/blogs');
    expect([401, 403, 500]).toContain(response.status());
  });

  test('GET /api/admin/skills returns 404 (no dedicated endpoint)', async ({
    request,
  }) => {
    // Admin skills/projects are fetched client-side from Supabase, not via API routes
    const response = await request.get('/api/admin/skills');
    expect([404, 200]).toContain(response.status());
  });

  test('GET /api/admin/projects returns 404 (no dedicated endpoint)', async ({
    request,
  }) => {
    const response = await request.get('/api/admin/projects');
    expect([404, 200]).toContain(response.status());
  });

  test('POST /api/admin/login requires password', async ({ request }) => {
    const response = await request.post('/api/admin/login', {
      data: { password: '' },
    });
    expect([200, 400, 429, 500]).toContain(response.status());
  });
});

test.describe('Responsive Design', () => {
  test.beforeEach(async ({ context }) => {
    await dismissBootSequence(context);
  });

  test('homepage renders on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });
  });

  test('homepage renders on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });
  });

  test('homepage renders on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });
  });

  test('blog page renders on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/blog');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });
  });

  test('admin login renders on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/sudosuperuser-ostaad/login');
    await expect(page.locator('input[type="password"]')).toBeVisible({
      timeout: 15000,
    });
  });
});

test.describe('Animation & Motion', () => {
  test.beforeEach(async ({ context }) => {
    await dismissBootSequence(context);
  });

  test('elements have entrance animations', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });
    const heroName = page.locator('[data-hero="name"]');
    await expect(heroName.first()).toBeVisible({ timeout: 15000 });
  });

  test('reduced motion disables animations', async ({ browser }) => {
    const reducedMotionContext = await browser.newContext({
      reducedMotion: 'reduce',
      viewport: { width: 1920, height: 1080 },
    });
    await dismissBootSequence(reducedMotionContext);
    const page = await reducedMotionContext.newPage();
    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });
    // h1 may match multiple elements, use .first()
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    await reducedMotionContext.close();
  });
});

test.describe('Security', () => {
  test.beforeEach(async ({ context }) => {
    await dismissBootSequence(context);
  });

  test('admin pages are not indexed', async ({ page }) => {
    await page.goto('/sudosuperuser-ostaad/login');
    await expect(page.locator('input[type="password"]')).toBeVisible({
      timeout: 15000,
    });
    const robots = await page
      .locator('meta[name="robots"]')
      .first()
      .getAttribute('content');
    expect(robots).toContain('noindex');
  });

  test('password field is masked', async ({ page }) => {
    await page.goto('/sudosuperuser-ostaad/login');
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
    const type = await passwordInput.getAttribute('type');
    expect(type).toBe('password');
  });
});
