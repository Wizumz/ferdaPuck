/**
 * Verify addon returns Stremio-compliant catalog and streams.
 * Run: node scripts/verify-addon.js
 * When network is available and games are live: returns real data.
 * Otherwise: validates format with empty responses.
 */

const addonInterface = require('../addon');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function verify() {
  console.log('Verifying Ferda Puck addon (Stremio format)...\n');

  // 1. Manifest
  const manifest = addonInterface.manifest;
  assert(manifest, 'addon should expose manifest');
  assert(manifest.types?.includes('tv'), 'manifest should include tv type');
  assert(manifest.resources?.includes('stream'), 'manifest should include stream resource');
  console.log('Manifest OK (tv type, stream resource)\n');

  // 2. Catalog
  const catalogRes = await addonInterface.get('catalog', 'tv', 'nhl', {});
  const metas = catalogRes?.metas ?? [];
  console.log(`Catalog (tv/nhl): ${metas.length} metas`);
  assert(Array.isArray(metas), 'catalog should return metas array');
  if (metas.length > 0) {
    const m = metas[0];
    assert(m.id && m.type === 'tv' && m.name, 'meta should have id, type, name');
    console.log('  Example:', m.name, '->', m.id);
  }
  console.log('✓ Catalog format OK\n');

  // 3. Stream
  const gameId = metas[0]?.id ?? 'nhl:20829:seeon:-25519632_1676';
  const streamRes = await addonInterface.get('stream', 'tv', gameId, {});
  const streams = streamRes?.streams ?? [];
  console.log(`Stream (tv/${gameId}): ${streams.length} streams`);
  assert(Array.isArray(streams), 'stream should return streams array');
  if (streams.length > 0) {
    const s = streams[0];
    assert(s.name, 'stream should have name');
    assert(s.externalUrl || s.url || s.ytId, 'stream should have url/externalUrl/ytId');
    console.log('  Example:', s.name, '->', (s.externalUrl || s.url || '').slice(0, 60) + '...');
  }
  console.log('✓ Stream format OK (Stremio compliant)\n');

  console.log('All checks passed.');
}

verify().catch((err) => {
  console.error('Verification failed:', err.message);
  process.exit(1);
});
