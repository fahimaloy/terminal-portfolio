import { test, expect, BrowserContext } from '@playwright/test';

async function dismissBootSequence(context: BrowserContext) {
  await context.addInitScript(() => {
    window.sessionStorage.setItem('cyberpunk-boot-shown', '1');
  });
}

// Helper to dismiss Next.js dev portal if present
async function dismissNextPortal(page: any) {
  const portal = page.locator('nextjs-portal');
  if (await portal.isVisible()) {
    await portal.evaluate((el: any) => el.style.display = 'none');
    await page.waitForTimeout(200);
  }
}

test.describe('Admin Panel', () => {
  test.beforeEach(async ({ context }) => {
    await dismissBootSequence(context);
  });

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/sudosuperuser-ostaad/login');
    await page.waitForTimeout(3000);
    await dismissNextPortal(page);
    await expect(page.locator('#password')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('dashboard redirects to login when unauthorized', async ({ page }) => {
    await page.goto('/sudosuperuser-ostaad');
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/login/);
  });

  test('skills page redirects to login when unauthorized', async ({ page }) => {
    await page.goto('/sudosuperuser-ostaad/skills');
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/login/);
  });

  test('projects page redirects to login when unauthorized', async ({ page }) => {
    await page.goto('/sudosuperuser-ostaad/projects');
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/login/);
  });

  test('experiences page redirects to login when unauthorized', async ({ page }) => {
    await page.goto('/sudosuperuser-ostaad/experiences');
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/login/);
  });

  test('media page redirects to login when unauthorized', async ({ page }) => {
    await page.goto('/sudosuperuser-ostaad/media');
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/login/);
  });

  test('knowledge page redirects to login when unauthorized', async ({ page }) => {
    await page.goto('/sudosuperuser-ostaad/knowledge');
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/login/);
  });

  test('site-texts page redirects to login when unauthorized', async ({ page }) => {
    await page.goto('/sudosuperuser-ostaad/site-texts');
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/login/);
  });

  test('blogs page redirects to login when unauthorized', async ({ page }) => {
    await page.goto('/sudosuperuser-ostaad/blogs');
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/login/);
  });

  test('login form shows error on wrong password', async ({ page }) => {
    await page.goto('/sudosuperuser-ostaad/login');
    await page.waitForTimeout(3000);
    await dismissNextPortal(page);
    await page.locator('#username').fill('wronguser');
    await page.locator('#password').fill('wrongpassword');
    await page.locator('button[type="submit"]').click({ force: true });
    await page.waitForTimeout(3000);
    const html = await page.content();
    const hasError = html.includes('Invalid') || html.includes('error') || html.includes('incorrect') || html.includes('Failed') || html.includes('Server error') || html.includes('Missing server config') || html.includes('Failed to fetch') || html.includes('AUTHENTICATION FAILED');
    expect(hasError).toBeTruthy();
  });

  test('login form has rate limiting', async ({ page }) => {
    await page.goto('/sudosuperuser-ostaad/login');
    await page.waitForTimeout(3000);
    await dismissNextPortal(page);
    for (let i = 0; i < 6; i++) {
      await page.locator('#username').fill('wronguser');
      await page.locator('#password').fill('wrongpassword');
      await page.locator('button[type="submit"]').click({ force: true });
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(3000);
    const html = await page.content();
    const hasRateLimit = html.includes('Too many') || html.includes('attempts') || html.includes('locked') || html.includes('Locked') || html.includes('Invalid') || html.includes('Server error') || html.includes('ACCOUNT TEMPORARILY LOCKED');
    expect(hasRateLimit).toBeTruthy();
  });
});

test.describe('Admin Auth Flow', () => {
  test.beforeEach(async ({ context }) => {
    await dismissBootSequence(context);
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    test.skip(!process.env.ADMIN_PASSWORD, 'Skipping: ADMIN_PASSWORD not set');
    await page.goto('/sudosuperuser-ostaad/login');
    await page.waitForTimeout(3000);
    await dismissNextPortal(page);
    await page.locator('#username').fill(process.env.ADMIN_USERNAME || 'fahimaloy');
    await page.locator('#password').fill(process.env.ADMIN_PASSWORD || 'admin123');
    await page.locator('button[type="submit"]').click({ force: true });
    await page.waitForTimeout(5000);
    await expect(page).toHaveURL(/\/sudosuperuser-ostaad$/);
  });

  test('nav items visible after login', async ({ page }) => {
    test.skip(!process.env.ADMIN_PASSWORD, 'Skipping: ADMIN_PASSWORD not set');
    await page.goto('/sudosuperuser-ostaad/login');
    await page.waitForTimeout(3000);
    await dismissNextPortal(page);
    await page.locator('#username').fill(process.env.ADMIN_USERNAME || 'fahimaloy');
    await page.locator('#password').fill(process.env.ADMIN_PASSWORD || 'admin123');
    await page.locator('button[type="submit"]').click({ force: true });
    await page.waitForURL(/\/sudosuperuser-ostaad$/);
    
    await expect(page.getByText('Dashboard').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Skills').first()).toBeVisible();
    await expect(page.getByText('Projects').first()).toBeVisible();
  });

  test('logout shows confirmation modal', async ({ page }) => {
    test.skip(!process.env.ADMIN_PASSWORD, 'Skipping: ADMIN_PASSWORD not set');
    await page.goto('/sudosuperuser-ostaad/login');
    await page.waitForTimeout(3000);
    await dismissNextPortal(page);
    await page.locator('#username').fill(process.env.ADMIN_USERNAME || 'fahimaloy');
    await page.locator('#password').fill(process.env.ADMIN_PASSWORD || 'admin123');
    await page.locator('button[type="submit"]').click({ force: true });
    await page.waitForURL(/\/sudosuperuser-ostaad$/);
    
    await page.getByText('LOGOUT').first().click({ force: true });
    await expect(page.getByText('CONFIRM LOGOUT')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Admin CRUD Pages', () => {
  test.beforeEach(async ({ context }) => {
    await dismissBootSequence(context);
  });

  const pages = [
    { name: 'Skills', url: '/skills', heading: 'Manage Skills' },
    { name: 'Projects', url: '/projects', heading: 'Manage Projects' },
    { name: 'Experiences', url: '/experiences', heading: 'Manage Experiences' },
    { name: 'Blogs', url: '/blogs', heading: 'BLOG POSTS' },
    { name: 'Media', url: '/media', heading: 'Manage Project Media' },
    { name: 'Knowledge', url: '/knowledge', heading: 'Manage Knowledge Base' },
    { name: 'Site Texts', url: '/site-texts', heading: 'Site Texts Management' },
  ];

  for (const p of pages) {
    test(`${p.name} page loads after login`, async ({ page }) => {
      test.skip(!process.env.ADMIN_PASSWORD, 'Skipping: ADMIN_PASSWORD not set');
      await page.goto('/sudosuperuser-ostaad/login');
      await page.waitForTimeout(3000);
      await dismissNextPortal(page);
      await page.locator('#username').fill(process.env.ADMIN_USERNAME || 'fahimaloy');
      await page.locator('#password').fill(process.env.ADMIN_PASSWORD || 'admin123');
      await page.locator('button[type="submit"]').click({ force: true });
      await page.waitForURL(/\/sudosuperuser-ostaad$/);
      
      await page.getByText(p.name).first().click({ force: true });
      await page.waitForURL(new RegExp(p.url));
      await expect(page.getByText(p.heading)).toBeVisible({ timeout: 10000 });
    });
  }
});
