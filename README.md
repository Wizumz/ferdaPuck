# Ferda Puck

Stremio addon for live hockey streams (NHL focus). Curates top live hockey streams from onhockey.tv.

## Quick Start

```bash
npm install
npm start
```

Then in Stremio: click the addon button (puzzle piece), and add `http://127.0.0.1:7000/manifest.json` as the Addon URL.

## Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Run the addon server on port 7000 |
| `npm test` | Run parser and scraper tests (fixture-based) |
| `npm run verify` | Verify addon returns Stremio-compliant catalog and streams |
| `npm run discover` | Inspect onhockey.tv page structure (requires Playwright; run during live games) |

## Scraper Methodology

1. **Playwright** (primary): Fetches onhockey.tv with a headless browser to capture JS-rendered content.
2. **Fetch** (fallback): If Playwright fails, uses native fetch to get static HTML.

The parser (`lib/parser.js`) extracts:
- Game links (`a[href*="channel="]`) → games with `id`, `name`, `league`, `url`
- Streams: `externalUrl` to the onhockey.tv game page (Stremio format)

## Testing

Tests use fixture HTML (`fixtures/onhockey-with-games.html`) to validate:
- URL parsing (`parseGameIdFromUrl`)
- Page parsing (`parseOnHockeyPage`) → games and streams

Run `npm run discover` during live NHL games to dump the page structure and refine selectors if needed.

## Deploy to Vercel

1. Install the Vercel CLI: `npm i -g vercel`
2. From the project root: `vercel`
3. Follow the prompts (link to existing project or create new)
4. Add the addon in Stremio with your deployment URL:
   - `https://your-project.vercel.app/manifest.json` (root, via rewrites)
   - Or `https://your-project.vercel.app/api/manifest.json` (direct)

**Note:** Playwright does not run on Vercel serverless. The scraper automatically falls back to fetch, which works with the static HTML onhockey.tv returns.

## Project Structure

```
ferdaPuck/
├── addon.js           # Stremio addon (manifest, catalog, stream handlers)
├── server.js          # HTTP server (local)
├── api/
│   └── [[...path]].js # Vercel serverless handler
├── vercel.json        # Rewrites for root /manifest.json
├── lib/
│   ├── scraper.js     # Playwright + fetch fallback
│   └── parser.js      # Cheerio-based HTML parsing
├── fixtures/          # Test HTML
├── scripts/
│   ├── discover-structure.js   # Page inspection
│   └── verify-addon.js         # Stremio format check
└── test/
    └── scraper.test.js
```

## License

MIT
