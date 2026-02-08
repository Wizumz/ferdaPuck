/**
 * Scrape onhockey.tv for live hockey games and stream URLs.
 * Uses Playwright for JS-rendered content. Falls back to fetch+parser when headless fails.
 */

const { parseOnHockeyPage } = require('./parser');

const ONHOCKEY_URL = 'https://onhockey.tv/';
const ONHOCKEY_NORTH_AMERICA = 'https://onhockey.tv/index.php?place=northamerica';

async function fetchUrl(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

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
    // Also fetch North America page for NCAA coverage
    await page.goto(ONHOCKEY_NORTH_AMERICA, { waitUntil: 'networkidle', timeout }).catch(() => {});
    await page.waitForTimeout(3000).catch(() => {});
    const html2 = await page.content();
    const r2 = parseOnHockeyPage(html2);
    const seen = new Set(result.games.map((g) => g.id));
    r2.games.forEach((g) => {
      if (!seen.has(g.id)) {
        seen.add(g.id);
        result.games.push(g);
      }
    });
    return result;
  } finally {
    await browser.close();
  }
}

/** @deprecated Use fetchUrl */
async function fetchStaticHtml() {
  return fetchUrl(ONHOCKEY_URL);
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

  // Fetch both main page and North America filter (NCAA D1, NHL, etc.)
  const [html1, html2] = await Promise.all([
    fetchUrl(ONHOCKEY_URL),
    fetchUrl(ONHOCKEY_NORTH_AMERICA),
  ]);
  const r1 = parseOnHockeyPage(html1);
  const r2 = parseOnHockeyPage(html2);
  // Merge and dedupe by id
  const seen = new Set();
  const games = [...r1.games, ...r2.games].filter((g) => {
    if (seen.has(g.id)) return false;
    seen.add(g.id);
    return true;
  });
  return { games, method: 'fetch' };
}

module.exports = {
  scrapeOnHockey,
  scrapeWithPlaywright,
  fetchStaticHtml,
  parseOnHockeyPage,
};
