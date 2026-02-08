/**
 * Parse onhockey.tv HTML into structured games and streams.
 * Works with Cheerio - for fixtures or Playwright-fetched HTML.
 */

const cheerio = require('cheerio');

const ONHOCKEY_BASE = 'https://onhockey.tv';

/**
 * Infer league prefix from game name (NHL, NCAA, KHL, etc.)
 */
function inferLeaguePrefix(text) {
  const t = text.toUpperCase();
  if (t.includes('NCAA') || t.includes('NCAAD1') || t.includes('COLLEGE') || t.includes('D1 MEN')) return 'ncaa';
  if (t.startsWith('NHL')) return 'nhl';
  if (t.startsWith('KHL')) return 'khl';
  if (t.startsWith('LIIGA') || t.startsWith('SHL') || t.startsWith('DEL') || t.startsWith('EXTRALIGA')) return 'nhl'; // use nhl as generic
  return 'nhl';
}

/**
 * Extract game ID from onhockey URL (channel + place + post)
 * e.g. index.php?channel=20829&place=seeon&post=-25519632_1676 -> nhl:20829:seeon:-25519632_1676
 */
function parseGameIdFromUrl(href, leaguePrefix = 'nhl') {
  try {
    const url = typeof href === 'string' && href.startsWith('http') ? new URL(href) : new URL(href, ONHOCKEY_BASE);
    const channel = url.searchParams.get('channel');
    const place = url.searchParams.get('place');
    const post = url.searchParams.get('post') || '';
    if (channel && place) {
      return `${leaguePrefix}:${channel}:${place}:${post}`;
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
    // Infer league from text (NHL, NCAA, KHL, etc.)
    const leaguePrefix = inferLeaguePrefix(text);
    const league = text.match(/^(NHL|NCAA|KHL|Liiga|SHL|DEL|Extraliga|College|NCAAD1)/i)?.[1] || (leaguePrefix === 'ncaa' ? 'NCAA D1' : 'NHL');
    const id = parseGameIdFromUrl(fullUrl, leaguePrefix);
    if (!id || seenIds.has(id)) return;
    seenIds.add(id);

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

  // Check if a URL looks like a playable video stream (not page UI iframe)
  function isVideoStreamUrl(src) {
    if (!src || typeof src !== 'string') return false;
    const s = src.toLowerCase();
    return s.includes('m3u8') || s.includes('np_fluidtv') || s.includes('.mp4') || s.includes('playlist') || s.includes('livestream') || s.includes('dailymotion') || s.includes('embed');
  }

  // If no game links, create placeholder games (NHL + NCAA D1 browse links)
  if (games.length === 0) {
    const northAmericaUrl = ONHOCKEY_BASE + '/index.php?place=northamerica';
    const iframeSrcs = [];
    $('iframe[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (src && !src.startsWith('about:') && isVideoStreamUrl(src)) iframeSrcs.push(src);
    });
    // Only use externalUrl for placeholders - iframe src like schedule_eng_online.html are NOT video streams
    games.push(
      {
        id: 'nhl:live:embed',
        name: 'Browse NHL on OnHockey.TV',
        league: 'NHL',
        url: ONHOCKEY_BASE,
        streams: [{ externalUrl: ONHOCKEY_BASE, name: 'Watch on OnHockey.TV' }],
      },
      {
        id: 'ncaa:live:embed',
        name: 'Browse NCAA D1 (North America) on OnHockey.TV',
        league: 'NCAA D1',
        url: northAmericaUrl,
        streams: [{ externalUrl: northAmericaUrl, name: 'Watch on OnHockey.TV (North America)' }],
      }
    );
  } else {
    // Append iframe streams only if they look like video (m3u8, np_fluidtv, etc.)
    const iframeSrcs = [];
    $('iframe[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (src && !src.startsWith('about:') && isVideoStreamUrl(src)) iframeSrcs.push(src);
    });
    if (iframeSrcs.length > 0 && games[0]) {
      games[0].streams.push(
        ...iframeSrcs.map((src) => {
          const fullUrl = src.startsWith('http') ? src : ONHOCKEY_BASE + '/' + src.replace(/^\//, '');
          const isDirectHls = fullUrl.includes('m3u8') && !fullUrl.includes('np_fluidtv');
          return isDirectHls ? { url: fullUrl, name: 'HLS Stream' } : { externalUrl: fullUrl, name: 'Watch Stream' };
        })
      );
    }
  }

  return { games };
}

module.exports = {
  parseOnHockeyPage,
  parseGameIdFromUrl,
};
