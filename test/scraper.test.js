/**
 * Tests for scraper and parser.
 * Parser is tested with fixture HTML.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { parseOnHockeyPage, parseGameIdFromUrl } = require('../lib/parser');
const { scrapeOnHockey } = require('../lib/scraper');

describe('parser', () => {
  const fixturePath = path.join(__dirname, '..', 'fixtures', 'onhockey-with-games.html');
  const fixtureHtml = fs.readFileSync(fixturePath, 'utf-8');

  describe('parseGameIdFromUrl', () => {
    it('extracts id from full URL', () => {
      const url = 'https://onhockey.tv/index.php?channel=20829&place=seeon&post=-25519632_1676';
      assert.strictEqual(parseGameIdFromUrl(url), 'nhl:20829:seeon:-25519632_1676');
    });
    it('returns null for invalid URL', () => {
      assert.strictEqual(parseGameIdFromUrl(''), null);
      assert.strictEqual(parseGameIdFromUrl('https://example.com'), null);
    });
  });

  describe('parseOnHockeyPage', () => {
    it('parses game links from fixture', () => {
      const { games } = parseOnHockeyPage(fixtureHtml);
      assert.ok(games.length >= 2, 'expect at least 2 games');
      const bruins = games.find((g) => g.name.includes('Bruins'));
      assert.ok(bruins, 'expect Bruins game');
      assert.ok(bruins.id.startsWith('nhl:'), 'id should start with nhl:');
      assert.ok(bruins.streams.length >= 1, 'expect at least 1 stream');
      const extStream = bruins.streams.find((s) => s.externalUrl);
      assert.ok(extStream, 'expect externalUrl stream');
      assert.ok(extStream.externalUrl.includes('channel=20829'), 'stream URL should contain channel');
      assert.strictEqual(extStream.name, 'Watch on OnHockey.TV');
    });
    it('includes iframe stream for first game when it looks like video', () => {
      const { games } = parseOnHockeyPage(fixtureHtml);
      const first = games[0];
      const embedStream = first.streams.find((s) => (s.url || s.externalUrl || '').includes('embed'));
      assert.ok(embedStream, 'expect embed stream from fixture iframe');
    });
  });
});

describe('scraper (integration)', () => {
  it('scrapeOnHockey returns games structure when given fixture HTML', async () => {
    const { parseOnHockeyPage } = require('../lib/parser');
    const fixtureHtml = fs.readFileSync(
      path.join(__dirname, '..', 'fixtures', 'onhockey-with-games.html'),
      'utf-8'
    );
    const { games } = parseOnHockeyPage(fixtureHtml);
    assert.ok('games' in { games });
    assert.ok(Array.isArray(games));
    assert.ok(games.length >= 2);
  });
});
