import { test, expect, chromium, type Browser } from '@playwright/test';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '..', '..');
const reportsDir = path.join(repoRoot, 'reports');
const screenshotsDir = path.join(reportsDir, 'screenshots');
const resultPath = path.join(reportsDir, 'harmony-qa-console-result.json');
const screenshotPath = path.join(screenshotsDir, 'harmony-qa-console-result.png');
const failureScreenshotPath = path.join(screenshotsDir, 'harmony-qa-console-failed.png');
const port = 4179;
const baseUrl = `http://127.0.0.1:${port}`;

function chromePath(): string | undefined {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
}

async function waitForServer(): Promise<void> {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error('QA Console server did not start.');
}

test('Harmony QA Console executes API self-check', async () => {
  fs.mkdirSync(screenshotsDir, { recursive: true });
  let server: ChildProcessWithoutNullStreams | undefined;
  let browser: Browser | undefined;

  try {
    server = spawn(process.execPath, ['scripts/serve-harmony-qa-console.mjs'], {
      cwd: repoRoot,
      stdio: 'pipe',
      env: {
        ...process.env,
        PORT: `${port}`
      }
    });
    await waitForServer();

    browser = await chromium.launch({
      headless: true,
      executablePath: chromePath()
    });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.locator('#apiBaseUrl').fill('https://fyeboolnlvqv.sealoshzh.site/api');
    await page.locator('#username').fill('admin');
    await page.locator('#password').fill('123');
    await page.getByRole('button', { name: '一键 API 自检' }).click();
    await page.waitForFunction(() => Boolean((window as any).__HARMONY_QA_DONE), null, { timeout: 180000 });
    await page.screenshot({ path: screenshotPath, fullPage: true });
    const result = await page.evaluate(() => (window as any).__HARMONY_QA_RESULT);
    fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    expect(result.success, JSON.stringify(result, null, 2)).toBe(true);
  } catch (error) {
    if (browser) {
      const pages = browser.contexts().flatMap((context) => context.pages());
      const page = pages[0];
      if (page) await page.screenshot({ path: failureScreenshotPath, fullPage: true });
    }
    throw error;
  } finally {
    if (browser) await browser.close();
    if (server) server.kill();
  }
});
