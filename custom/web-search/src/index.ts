/**
 * MouseAI Web Search Server
 * FastAPI-style HTTP server for web search and scraping
 */

import { serperSearch, firecrawlScrape } from './providers.js';

const PORT = parseInt(process.env.PORT || '3103', 10);
const SERPER_API_KEY = process.env.SERPER_API_KEY || '';
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || '';
const HOST = process.env.HOST || '0.0.0.0';

if (!SERPER_API_KEY && !FIRECRAWL_API_KEY) {
  console.error('SERPER_API_KEY or FIRECRAWL_API_KEY environment variable is required');
  process.exit(1);
}

// Simple HTTP server
async function main() {
  const http = await import('node:http');
  const { createServer } = http;

  const server = createServer(async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    // Health check
    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        service: 'mouseai-web-search',
        version: '1.0.0',
        providers: {
          serper: !!SERPER_API_KEY,
          firecrawl: !!FIRECRAWL_API_KEY,
        },
      }));
      return;
    }

    // Web search endpoint
    if (url.pathname === '/search' && req.method === 'POST') {
      try {
        const body = await readBody(req);
        const { query } = JSON.parse(body);

        if (!query) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing query parameter' }));
          return;
        }

        if (!SERPER_API_KEY) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'SERPER_API_KEY not configured' }));
          return;
        }

        const startTime = Date.now();
        const results = await serperSearch(query, SERPER_API_KEY);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          query,
          results,
          totalResults: results.length,
          searchTime: Date.now() - startTime,
        }));
      } catch (error) {
        console.error('[WebSearch] Search error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        }));
      }
      return;
    }

    // Web scrape endpoint
    if (url.pathname === '/scrape' && req.method === 'POST') {
      try {
        const body = await readBody(req);
        const { url: targetUrl } = JSON.parse(body);

        if (!targetUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing url parameter' }));
          return;
        }

        if (!FIRECRAWL_API_KEY) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'FIRECRAWL_API_KEY not configured' }));
          return;
        }

        const result = await firecrawlScrape(targetUrl, FIRECRAWL_API_KEY);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          url: targetUrl,
          content: result,
        }));
      } catch (error) {
        console.error('[WebSearch] Scrape error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        }));
      }
      return;
    }

    // Default: info endpoint
    if (url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        name: 'mouseai-web-search',
        version: '1.0.0',
        endpoints: {
          'POST /search': 'Web search via Serper (body: { query: string })',
          'POST /scrape': 'Web scraping via Firecrawl (body: { url: string })',
          'GET /health': 'Health check',
        },
        providers: {
          serper: !!SERPER_API_KEY,
          firecrawl: !!FIRECRAWL_API_KEY,
        },
      }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  server.listen(PORT, HOST, () => {
    console.log(`[WebSearch] Server running on http://${HOST}:${PORT}`);
    console.log(`[WebSearch] Serper: ${SERPER_API_KEY ? 'enabled' : 'disabled'}`);
    console.log(`[WebSearch] Firecrawl: ${FIRECRAWL_API_KEY ? 'enabled' : 'disabled'}`);
  });

  process.on('SIGINT', () => {
    console.log('[WebSearch] Shutting down...');
    server.close();
    process.exit(0);
  });
}

async function readBody(req: import('node:http').IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

main().catch(console.error);