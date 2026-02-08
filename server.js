/**
 * Ferda Puck - HTTP server for Stremio addon.
 * Run: npm start
 * Add to Stremio: http://127.0.0.1:7000/manifest.json
 */

const { serveHTTP } = require('stremio-addon-sdk');
const addonInterface = require('./addon');

serveHTTP(addonInterface, { port: 7000 });
