/**
 * Parse onhockey.tv HTML into structured games and streams.
 * Works with Cheerio - for fixtures or Playwright-fetched HTML.
 */

const cheerio = require('cheerio');

const ONHOCKEY_BASE = 'https://onhockey.tv';

/**
 * Extract game ID from onhockey URL (channel + place + post)
 * e.g. index.php?channel=20829&place=seeon&post=-25519632_1676 -> nhl:20829:seeon:-25519632_1676
 */
function parseGameIdFromUrl(href) {
  try {
    const url = typeof href === 'string' && href.startsWith('http') ? new URL(href) : new URL(href, ONHOCKEY_BASE);
    const channel = url.searchParams.get('channel');
    const place = url.searchParams.get('place');
    const post = url.searchParams.get('post') || '';
    if (channel && place) {
      return `nhl:${channel}:${place}:${post}`;
    }
  } catch (_) {}
  return null;
}

/**
 * Parse onhockey.tv HTML into { games }
 * Each game has: id, name, league, url (game page), streams (Stremio format)
 *
 * @param {string} html - Raw HTML from onhockey.tv
 * @returns {{ games: Array<{ id: string, name: string, league: string, url: string, streams: Array<{ externalUrl?: string, url?: string, name: string }> }> }}
 */
function parseOnHockeyPage(html) {
  const $ = cheerio.load(html);
  const games = [];
  const seenIds = new Set();

  // Game links: a[href*="channel="] - these link to game pages
  $('a[href*="channel="]').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href');
    const text = $el.text().trim();
    if (!href || !text) return;
    // Skip short/nav text
    if (text.length < 5) return;

    const fullUrl = href.startsWith('http') ? href : new URL(href, ONHOCKEY_BASE).href;
    const id = parseGameIdFromUrl(fullUrl);
    if (!id || seenIds.has(id)) return;
    seenIds.add(id);

    // Infer league from text (NHL, KHL, etc.)
    const league = text.match(/^(NHL|KHL|Liiga|SHL|DEL|Extraliga)/i)?.[1] || 'NHL';

    games.push({
      id,
      name: text,
      league,
      url: fullUrl,
      streams: [
        {
          externalUrl: fullUrl,
          name: 'Watch on OnHockey.TV',
        },
      ],
    });
  });

  // If no game links but we have iframes, create a single placeholder game with iframe streams
  if (games.length === 0) {
    $('iframe[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (src && !src.startsWith('about:')) {
        games.push({
          id: 'nhl:live:embed',
          name: 'Live Hockey Stream',
          league: 'NHL',
          url: ONHOCKEY_BASE,
          streams: [{ url: src, name: 'Embed Stream' }],
        });
      }
    });
  } else {
    // Append iframe streams to first game if present
    const iframeSrcs = [];
    $('iframe[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (src && !src.startsWith('about:')) iframeSrcs.push(src);
    });
    if (iframeSrcs.length > 0 && games[0]) {
      games[0].streams.push(
        ...iframeSrcs.map((url) => ({ url, name: 'Embed' }))
      );
    }
  }

  return { games };
}

module.exports = {
  parseOnHockeyPage,
  parseGameIdFromUrl,
};
