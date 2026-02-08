/**
 * Discovery script to inspect onhockey.tv page structure.
 * Run during live NHL games: npm run discover
 *
 * Dumps:
 * - Full HTML to onhockey-dump.html
 * - All iframe src attributes
 * - Any XHR/fetch URLs seen
 * - Schedule/game elements found
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const DUMP_DIR = path.join(__dirname, '..', 'dumps');
const DUMP_HTML = path.join(DUMP_DIR, 'onhockey-dump.html');
const DUMP_JSON = path.join(DUMP_DIR, 'discovery-result.json');

async function discover() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });

  const xhrUrls = [];
  const page = await browser.newPage();

  // Capture XHR/fetch requests
  page.on('request', (req) => {
    const url = req.url();
    if (
      req.resourceType() === 'xhr' ||
      req.resourceType() === 'fetch' ||
      url.endsWith('.json')
    ) {
      xhrUrls.push({ url, method: req.method(), type: req.resourceType() });
    }
  });

  try {
    console.log('Navigating to onhockey.tv...');
    await page.goto('https://onhockey.tv/', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Wait for content to render
    console.log('Waiting for content (10s)...');
    await page.waitForTimeout(10000);

    // Extract iframes
    const iframes = await page.$$eval('iframe', (els) =>
      els.map((e) => ({
        src: e.src,
        id: e.id || null,
        name: e.name || null,
        className: e.className || null,
      }))
    );

    // Extract potential schedule/game rows (common patterns)
    const selectors = [
      'a[href*="channel="]',
      'a[href*="place="]',
      'tr',
      '.game',
      '[class*="game"]',
      '[class*="schedule"]',
      '[class*="stream"]',
    ];

    const foundElements = {};
    for (const sel of selectors) {
      try {
        const els = await page.$$(sel);
        foundElements[sel] = els.length;
      } catch {
        foundElements[sel] = 0;
      }
    }

    // Get links with channel/post params (game links)
    const gameLinks = await page.$$eval('a[href*="channel="]', (els) =>
      els.map((e) => ({
        href: e.href,
        text: e.textContent?.trim().slice(0, 100) || null,
      }))
    );

    // Full HTML
    const html = await page.content();
    if (!fs.existsSync(DUMP_DIR)) {
      fs.mkdirSync(DUMP_DIR, { recursive: true });
    }
    fs.writeFileSync(DUMP_HTML, html, 'utf-8');

    const result = {
      timestamp: new Date().toISOString(),
      iframes,
      gameLinks,
      elementCounts: foundElements,
      xhrUrls: [...new Map(xhrUrls.map((x) => [x.url, x])).values()],
    };

    fs.writeFileSync(DUMP_JSON, JSON.stringify(result, null, 2), 'utf-8');

    console.log('\n--- Discovery Results ---');
    console.log('HTML saved to:', DUMP_HTML);
    console.log('JSON saved to:', DUMP_JSON);
    console.log('\nIframes found:', iframes.length);
    if (iframes.length > 0) {
      iframes.forEach((f, i) => console.log(`  ${i + 1}. ${f.src?.slice(0, 80)}...`));
    }
    console.log('\nGame links (a[href*="channel="]):', gameLinks.length);
    if (gameLinks.length > 0) {
      gameLinks.slice(0, 5).forEach((l, i) =>
        console.log(`  ${i + 1}. ${l.text} -> ${l.href?.slice(0, 60)}...`)
      );
    }
    console.log('\nXHR/Fetch URLs:', xhrUrls.length);
    xhrUrls.slice(0, 5).forEach((u, i) => console.log(`  ${i + 1}. ${u.url}`));
  } finally {
    await browser.close();
  }
}

discover().catch((err) => {
  console.error('Discovery failed:', err);
  process.exit(1);
});
