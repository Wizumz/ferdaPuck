/**
 * Vercel serverless handler for Ferda Puck Stremio addon.
 * Add to Stremio: https://your-deployment.vercel.app/api/manifest.json
 */

const { getRouter } = require('stremio-addon-sdk');
const addonInterface = require('../addon');

const router = getRouter(addonInterface);

module.exports = (req, res) => {
  // Vercel serves /api/* - strip /api prefix so Stremio router sees /manifest.json etc.
  const rawPath = (req.url || '/').split('?')[0];
  const path = rawPath.replace(/^\//, '').replace(/^api\/?/, '') || 'manifest.json';
  req.url = '/' + path;

  router(req, res, () => {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ err: 'not found' }));
  });
};
