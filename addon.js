/**
 * Ferda Puck - Stremio addon for live hockey streams.
 * Minimal addon: scrapes onhockey.tv, returns catalog + streams in Stremio format.
 */

const { addonBuilder } = require('stremio-addon-sdk');
const { scrapeOnHockey } = require('./lib/scraper');

// Playwright does not run on Vercel serverless - use fetch only
const usePlaywright = !process.env.VERCEL;

const manifest = {
  id: 'com.ferdapuck.hockey',
  version: '0.1.0',
  name: 'Ferda Puck',
  description: 'Curated live hockey streams (NHL focus) from top sources',

  resources: ['catalog', 'stream'],
  types: ['tv'],

  catalogs: [
    {
      type: 'tv',
      id: 'nhl',
      name: 'NHL Live',
    },
  ],

  idPrefixes: ['nhl:'],
};

const builder = new addonBuilder(manifest);

// Catalog: list games from onhockey.tv
builder.defineCatalogHandler(async (args) => {
  if (args.type !== 'tv' || args.id !== 'nhl') {
    return Promise.resolve({ metas: [] });
  }

  try {
    const { games } = await scrapeOnHockey({ usePlaywright });
    const metas = games.map((g) => ({
      id: g.id,
      type: 'tv',
      name: g.name,
      poster: undefined,
    }));
    return Promise.resolve({ metas, cacheMaxAge: 300 });
  } catch (err) {
    console.error('Catalog error:', err);
    return Promise.resolve({ metas: [] });
  }
});

// Stream: return streams for a game (Stremio format)
builder.defineStreamHandler(async (args) => {
  const id = args.id;
  if (!id || !id.startsWith('nhl:')) {
    return Promise.resolve({ streams: [] });
  }

  try {
    const { games } = await scrapeOnHockey({ usePlaywright });
    const game = games.find((g) => g.id === id);
    if (!game || !game.streams) {
      return Promise.resolve({ streams: [] });
    }

    // Convert to Stremio stream format
    const streams = game.streams.map((s) => ({
      name: s.name,
      title: s.name,
      ...(s.externalUrl ? { externalUrl: s.externalUrl } : { url: s.url }),
    }));

    return Promise.resolve({ streams, cacheMaxAge: 300 });
  } catch (err) {
    console.error('Stream error:', err);
    return Promise.resolve({ streams: [] });
  }
});

module.exports = builder.getInterface();
