import http from 'node:http';
import { parse as parseUrl } from 'node:url';
import { n8nBackend } from './n8n_engine.js';

const PORT = process.env.PORT || 5678;

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
}

export function handleRequest(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsed = parseUrl(req.url, true);
  const pathname = parsed.pathname || '';
  const query = parsed.query || {};

  // Read JSON body if POST
  let bodyStr = '';
  req.on('data', chunk => {
    bodyStr += chunk;
  });

  req.on('end', () => {
    let body = {};
    if (bodyStr) {
      try {
        body = JSON.parse(bodyStr);
      } catch (_err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', error: 'Invalid JSON payload' }));
        return;
      }
    }

    try {
      // 1. Health check
      if (pathname === '/healthz' || pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          service: 'n8n-care-triage-backend',
          n8n_compatible: true,
          webhook_routes: [
            '/webhook/triage-evaluate',
            '/webhook-test/triage-evaluate',
            '/webhook/review-action',
            '/webhook/verify-action',
            '/webhook/overview',
            '/webhook/trends',
            '/webhook/evidence',
            '/webhook/audit-logs',
            '/webhook/safety-manifest'
          ],
          uptime_seconds: process.uptime()
        }));
        return;
      }

      // 2. Webhook Triage Evaluate (supports /webhook/triage-evaluate and /webhook-test/triage-evaluate)
      if (pathname === '/webhook/triage-evaluate' || pathname === '/webhook-test/triage-evaluate') {
        const result = n8nBackend.evaluateTriage(body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result.body));
        return;
      }

      // 3. Webhook Review Action (Approve / Dismiss)
      if (pathname === '/webhook/review-action') {
        const result = n8nBackend.submitReviewAction(body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result.body));
        return;
      }

      // 4. Webhook Closed-Loop Verification
      if (pathname === '/webhook/verify-action') {
        const result = n8nBackend.verifyAction(body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result.body));
        return;
      }

      // 5. Overview Metrics
      if (pathname === '/webhook/overview') {
        const result = n8nBackend.getOverview();
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result.body));
        return;
      }

      // 6. Attendance Trends
      if (pathname === '/webhook/trends') {
        const result = n8nBackend.getTrends(query);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result.body));
        return;
      }

      // 7. Evidence View
      if (pathname === '/webhook/evidence') {
        const result = n8nBackend.getEvidence(query);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result.body));
        return;
      }

      // 8. Audit Logs
      if (pathname === '/webhook/audit-logs') {
        const result = n8nBackend.getAuditLogs();
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result.body));
        return;
      }

      // 9. Safety Manifest
      if (pathname === '/webhook/safety-manifest') {
        const result = n8nBackend.getSafetyManifest();
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result.body));
        return;
      }

      // 404
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'error',
        code: 'NOT_FOUND',
        message: `Unknown webhook path: ${pathname}`
      }));
    } catch (err) {
      console.error('[n8n-server] Internal error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: err.message }));
    }
  });
}

// Standalone execution if started directly via node server/index.js
import { fileURLToPath } from 'node:url';
const isDirectRun = process.argv[1] && (
  process.argv[1] === fileURLToPath(import.meta.url) ||
  process.argv[1].endsWith('server/index.js') ||
  process.argv[1].endsWith('server\\index.js')
);

if (isDirectRun) {
  const server = http.createServer(handleRequest);
  server.listen(PORT, () => {
    console.log(`==========================================================`);
    console.log(`CareTriage n8n Live Backend listening on port ${PORT}`);
    console.log(`Webhook endpoint: http://localhost:${PORT}/webhook/triage-evaluate`);
    console.log(`Health check:     http://localhost:${PORT}/healthz`);
    console.log(`==========================================================`);
  });
}
