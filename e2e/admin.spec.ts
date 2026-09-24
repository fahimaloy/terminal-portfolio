import { test, expect, BrowserContext } from '@playwright/test';

async function dismissBootSequence(context: BrowserContext) {
  await context.addInitScript(() => {
    window.sessionStorage.setItem('cyberpunk-boot-shown', '1');
  });
}

function makeUniqueClientIp(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Helper to dismiss Next.js dev portal if present
async function dismissNextPortal(page: any) {
  const portal = page.locator('nextjs-portal');
  if (await portal.isVisible()) {
    await portal.evaluate((el: any) => (el.style.display = 'none'));
    await expect(portal).not.toBeVisible();
  }
}

test.describe('Admin Panel', () => {
  test.beforeEach(async ({ context }) => {
    await dismissBootSequence(context);
  });

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/sudosuperuser-ostaad/login');
    await dismissNextPortal(page);
    await expect(page.locator('#password')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('dashboard redirects to login when unauthorized', async ({ page }) => {
    await page.goto('/sudosuperuser-ostaad');
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });

  test('skills page redirects to login when unauthorized', async ({ page }) => {
    await page.goto('/sudosuperuser-ostaad/skills');
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });

  test('projects page redirects to login when unauthorized', async ({
    page,
  }) => {
    await page.goto('/sudosuperuser-ostaad/projects');
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });

  test('experiences page redirects to login when unauthorized', async ({
    page,
  }) => {
    await page.goto('/sudosuperuser-ostaad/experiences');
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });

  test('media page redirects to login when unauthorized', async ({ page }) => {
    await page.goto('/sudosuperuser-ostaad/media');
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });

  test('knowledge page redirects to login when unauthorized', async ({
    page,
  }) => {
    await page.goto('/sudosuperuser-ostaad/knowledge');
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });

  test('site-texts page redirects to login when unauthorized', async ({
    page,
  }) => {
    await page.goto('/sudosuperuser-ostaad/site-texts');
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });

  test('blogs page redirects to login when unauthorized', async ({ page }) => {
    await page.goto('/sudosuperuser-ostaad/blogs');
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });

  test('login form shows error on wrong password', async ({ page }) => {
    await page.context().clearCookies();
    await page.setExtraHTTPHeaders({
      'x-forwarded-for': makeUniqueClientIp('e2e-wrong-password'),
    });
    await page.goto('/sudosuperuser-ostaad/login');
    await expect(page.locator('#password')).toBeVisible({ timeout: 15000 });
    await dismissNextPortal(page);
    await page.waitForLoadState('networkidle');
    await page.locator('#username').fill('wronguser');
    await page.locator('#password').fill('wrongpassword');
    const responsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().endsWith('/api/admin/login'),
    );
    await page.locator('button[type="submit"]').click();
    const response = await responsePromise;
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body).toMatchObject({ ok: false, message: 'Invalid credentials' });
    await expect(
      page.getByText('Invalid credentials', { exact: false }),
    ).toBeVisible({ timeout: 15000 });

    const sessionCookies = await page.context().cookies();
    expect(
      sessionCookies.find(
        (cookie) => cookie.name === 'portfolio_admin_session',
      ),
    ).toBeUndefined();
  });

  test('login form locks after five failed attempts', async ({ page }) => {
    await page.context().clearCookies();
    await page.setExtraHTTPHeaders({
      'x-forwarded-for': makeUniqueClientIp('e2e-client-lock'),
    });
    await page.goto('/sudosuperuser-ostaad/login');
    await expect(page.locator('#password')).toBeVisible({ timeout: 15000 });
    await dismissNextPortal(page);
    await page.evaluate(() => {
      localStorage.removeItem('admin_login_lock');
      localStorage.removeItem('admin_login_attempts');
    });
    await page.reload();
    await expect(page.locator('#password')).toBeVisible({ timeout: 15000 });

    const username = page.locator('#username');
    const password = page.locator('#password');
    const submit = page.locator('button[type="submit"]');

    for (let attempt = 0; attempt < 5; attempt++) {
      await expect(username).toBeEnabled();
      await expect(password).toBeEnabled();
      await expect(submit).toBeEnabled();
      await username.fill('wronguser');
      await password.fill('wrongpassword');
      const responsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          response.url().endsWith('/api/admin/login'),
      );
      await submit.click();
      const response = await responsePromise;
      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body).toMatchObject({ ok: false, message: 'Invalid credentials' });
    }

    await expect(page.getByText(/Locked for/)).toBeVisible({
      timeout: 15000,
    });
    await expect(username).toBeDisabled();
    await expect(password).toBeDisabled();
    await expect(submit).toBeDisabled();

    const persistedLock = await page.evaluate(() => {
      const raw = localStorage.getItem('admin_login_lock');
      if (!raw) return null;
      try {
        return JSON.parse(raw) as { until?: number };
      } catch {
        return null;
      }
    });
    expect(persistedLock?.until).toBeGreaterThan(Date.now());

    await page.reload();
    await expect(
      page.getByText('ACCOUNT TEMPORARILY LOCKED', { exact: true }),
    ).toBeVisible({ timeout: 15000 });
    await expect(username).toBeDisabled();
    await expect(password).toBeDisabled();
    await expect(submit).toBeDisabled();
  });

  test('login API rate limits repeated POST requests', async ({ request }) => {
    const clientIp = makeUniqueClientIp('e2e-server-rate-limit');
    const headers = { 'x-forwarded-for': clientIp };
    const data = { username: 'wronguser', password: 'wrongpassword' };

    for (let attempt = 0; attempt < 10; attempt++) {
      const response = await request.post('/api/admin/login', {
        headers,
        data,
      });
      expect(response.status()).toBe(401);
    }

    const response = await request.post('/api/admin/login', { headers, data });
    expect(response.status()).toBe(429);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      message: 'Too many login attempts. Please try again later.',
    });
  });
});

test.describe('Admin Auth Flow', () => {
  test.beforeEach(async ({ context }) => {
    await dismissBootSequence(context);
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    test.skip(!process.env.ADMIN_PASSWORD, 'Skipping: ADMIN_PASSWORD not set');
    await page.goto('/sudosuperuser-ostaad/login');
    await expect(page.locator('#password')).toBeVisible({ timeout: 15000 });
    await dismissNextPortal(page);
    await page
      .locator('#username')
      .fill(process.env.ADMIN_USERNAME || 'fahimaloy');
    await page
      .locator('#password')
      .fill(process.env.ADMIN_PASSWORD || 'admin123');
    await page.locator('button[type="submit"]').click({ force: true });
    await expect(page).toHaveURL(/\/sudosuperuser-ostaad$/);
    await expect(page).toHaveURL(/\/sudosuperuser-ostaad$/);
  });

  test('nav items visible after login', async ({ page }) => {
    test.skip(!process.env.ADMIN_PASSWORD, 'Skipping: ADMIN_PASSWORD not set');
    await page.goto('/sudosuperuser-ostaad/login');
    await expect(page.locator('#password')).toBeVisible({ timeout: 15000 });
    await dismissNextPortal(page);
    await page
      .locator('#username')
      .fill(process.env.ADMIN_USERNAME || 'fahimaloy');
    await page
      .locator('#password')
      .fill(process.env.ADMIN_PASSWORD || 'admin123');
    await page.locator('button[type="submit"]').click({ force: true });
    await page.waitForURL(/\/sudosuperuser-ostaad$/);

    await expect(page.getByText('Dashboard').first()).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText('Skills').first()).toBeVisible();
    await expect(page.getByText('Projects').first()).toBeVisible();
  });

  test('logout shows confirmation modal', async ({ page }) => {
    test.skip(!process.env.ADMIN_PASSWORD, 'Skipping: ADMIN_PASSWORD not set');
    await page.goto('/sudosuperuser-ostaad/login');
    await expect(page.locator('#password')).toBeVisible({ timeout: 15000 });
    await dismissNextPortal(page);
    await page
      .locator('#username')
      .fill(process.env.ADMIN_USERNAME || 'fahimaloy');
    await page
      .locator('#password')
      .fill(process.env.ADMIN_PASSWORD || 'admin123');
    await page.locator('button[type="submit"]').click({ force: true });
    await page.waitForURL(/\/sudosuperuser-ostaad$/);

    await page.getByText('LOGOUT').first().click({ force: true });
    await expect(page.getByText('CONFIRM LOGOUT')).toBeVisible({
      timeout: 5000,
    });
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
    {
      name: 'Site Texts',
      url: '/site-texts',
      heading: 'Site Texts Management',
    },
  ];

  for (const p of pages) {
    test(`${p.name} page loads after login`, async ({ page }) => {
      test.skip(
        !process.env.ADMIN_PASSWORD,
        'Skipping: ADMIN_PASSWORD not set',
      );
      await page.goto('/sudosuperuser-ostaad/login');
      await expect(page.locator('#password')).toBeVisible({ timeout: 15000 });
      await dismissNextPortal(page);
      await page
        .locator('#username')
        .fill(process.env.ADMIN_USERNAME || 'fahimaloy');
      await page
        .locator('#password')
        .fill(process.env.ADMIN_PASSWORD || 'admin123');
      await page.locator('button[type="submit"]').click({ force: true });
      await page.waitForURL(/\/sudosuperuser-ostaad$/);

      await page.getByText(p.name).first().click({ force: true });
      await page.waitForURL(new RegExp(p.url));
      await expect(page.getByText(p.heading)).toBeVisible({ timeout: 10000 });
    });
  }
});
