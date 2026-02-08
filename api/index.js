/**
 * Vercel serverless handler for Ferda Puck Stremio addon.
 * Add to Stremio: https://your-deployment.vercel.app/manifest.json
 */

const { getRouter } = require('stremio-addon-sdk');
const addonInterface = require('../addon');

const router = getRouter(addonInterface);

module.exports = (req, res) => {
  // Rewrites send /path as ?__path=path - use that or fall back to req.url
  const url = req.url || '/';
  const qsStart = url.indexOf('?');
  const pathPart = qsStart >= 0 ? url.slice(0, qsStart) : url;
  const qs = qsStart >= 0 ? url.slice(qsStart + 1) : '';

  // Parse __path from query (set by vercel.json rewrite)
  const params = new URLSearchParams(qs);
  const rewritePath = params.get('__path');

  let path = rewritePath || pathPart.replace(/^\//, '').replace(/^api\/?/, '') || 'manifest.json';
  if (!path.startsWith('/')) path = '/' + path;

  req.url = path;

  router(req, res, () => {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ err: 'not found' }));
  });
};
