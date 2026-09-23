/**
 * Consolidated API Router for Vercel Serverless Function
 * Ensures the entire backend operates within Vercel's Hobby plan function limits (12 max).
 * All endpoints are routed through this single serverless handler.
 */

const { handleCors } = require('./_lib/auth');

const routes = {
  '/services': require('./_routes/services'),
  '/orders': require('./_routes/orders'),
  '/tickets': require('./_routes/tickets'),
  '/notify': require('./_routes/notify'),
  '/auth/login': require('./_routes/auth/login'),
  '/auth/me': require('./_routes/auth/me'),
  '/auth/register': require('./_routes/auth/register'),
  '/wallet/balance': require('./_routes/wallet/balance'),
  '/wallet/deposit': require('./_routes/wallet/deposit'),
  '/admin/alerts': require('./_routes/admin/alerts'),
  '/admin/deposits': require('./_routes/admin/deposits'),
  '/admin/gateways': require('./_routes/admin/gateways'),
  '/admin/login': require('./_routes/admin/login'),
  '/admin/orders': require('./_routes/admin/orders'),
  '/admin/seed': require('./_routes/admin/seed'),
  '/admin/services': require('./_routes/admin/services'),
  '/admin/stats': require('./_routes/admin/stats'),
  '/admin/tickets': require('./_routes/admin/tickets'),
};

module.exports = async function handler(req, res) {
  // Always handle CORS preflight
  if (handleCors(req, res)) return;

  // Determine requested path
  let targetPath = '';

  // Case 1: Path passed via query rewrite (?path=...)
  if (req.query && req.query.path) {
    const p = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path;
    targetPath = '/' + p.replace(/^\/+/, '');
  } else {
    // Case 2: Direct URL parsing (e.g. /api/auth/login or /auth/login)
    const rawUrl = req.url || '/';
    const cleanUrl = rawUrl.split('?')[0];
    targetPath = cleanUrl.replace(/^\/api/, '');
  }

  // Normalize path: strip trailing slash if not root
  if (targetPath.length > 1 && targetPath.endsWith('/')) {
    targetPath = targetPath.slice(0, -1);
  }

  // Health check on root
  if (!targetPath || targetPath === '/' || targetPath === '') {
    return res.status(200).json({
      status: 'ok',
      message: 'SMM API Router is active',
      availableRoutes: Object.keys(routes),
    });
  }

  const routeHandler = routes[targetPath];
  if (routeHandler) {
    try {
      return await routeHandler(req, res);
    } catch (err) {
      console.error(`Error processing ${targetPath}:`, err);
      return res.status(500).json({
        error: 'Internal server error',
        message: err.message,
      });
    }
  }

  return res.status(404).json({
    error: 'Endpoint not found',
    requestedPath: targetPath,
  });
};
