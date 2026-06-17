import { chromium, type Browser, type Page } from "playwright";

let browser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  return browser;
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

export interface PageResult<T> {
  ok: boolean;
  status?: number;
  data?: T;
  error?: string;
}

// Open a page, run a callback with it, and always clean up.
export async function withPage<T>(
  url: string,
  fn: (page: Page) => Promise<T>,
  timeoutMs = 30_000,
): Promise<PageResult<T>> {
  const b = await getBrowser();
  const context = await b.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 GolaxProspectBot/1.0",
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  try {
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: timeoutMs,
    });
    const status = response?.status();
    const data = await fn(page);
    return { ok: true, status, data };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  } finally {
    await context.close();
  }
}
