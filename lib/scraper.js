/**
 * Scrape onhockey.tv for live hockey games and stream URLs.
 * Uses Playwright for JS-rendered content. Falls back to fetch+parser when headless fails.
 */

const { parseOnHockeyPage } = require('./parser');

const ONHOCKEY_URL = 'https://onhockey.tv/';

/**
 * Scrape onhockey.tv using Playwright (headless browser).
 * @param {{ headless?: boolean, timeout?: number }} options
 * @returns {Promise<{ games: Array }>}
 */
async function scrapeWithPlaywright(options = {}) {
  const { headless = true, timeout = 25000 } = options;

  const chromium = require('playwright').chromium;
  const browser = await chromium.launch({ headless });
  const page = await browser.newPage();

  try {
    await page.goto(ONHOCKEY_URL, {
      waitUntil: 'networkidle',
      timeout,
    });
    await page.waitForTimeout(5000);

    const html = await page.content();
    const result = parseOnHockeyPage(html);
    return result;
  } finally {
    await browser.close();
  }
}

/**
 * Fetch page with native fetch (no JS execution). Will get static HTML only.
 * Use when Playwright is unavailable - schedule may be empty if page is JS-rendered.
 */
async function fetchStaticHtml() {
  const res = await fetch(ONHOCKEY_URL, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/**
 * Main scrape entry point. Tries Playwright first, falls back to fetch.
 * @param {{ usePlaywright?: boolean }} options - Set usePlaywright: false to skip Playwright
 * @returns {Promise<{ games: Array, method: string }>}
 */
async function scrapeOnHockey(options = {}) {
  const usePlaywright = options.usePlaywright !== false;

  if (usePlaywright) {
    try {
      const result = await scrapeWithPlaywright({
        headless: true,
        timeout: 30000,
      });
      return { ...result, method: 'playwright' };
    } catch (err) {
      console.warn('Playwright scrape failed, falling back to fetch:', err.message);
    }
  }

  const html = await fetchStaticHtml();
  const result = parseOnHockeyPage(html);
  return { ...result, method: 'fetch' };
}

module.exports = {
  scrapeOnHockey,
  scrapeWithPlaywright,
  fetchStaticHtml,
  parseOnHockeyPage,
};
