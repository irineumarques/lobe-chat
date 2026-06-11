/**
 * MouseAI - GitLab UFAL MCP Server
 * Implements GitLab API v4 as MCP tools over HTTP
 */

import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { createToolHandlers, gitlabTools, GITLAB_PORT } from './tools.js';

const METHOD_TOOLS_LIST = 'tools/list';
const METHOD_TOOLS_CALL = 'tools/call';

function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, data: any): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, MCP-Session-ID, Accept',
  });
  res.end(JSON.stringify(data));
}

// Create tool handlers
const handlers = createToolHandlers();

const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, MCP-Session-ID, Accept');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'mouseai-gitlab-ufal-mcp' }));
    return;
  }

  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      name: 'mouseai-gitlab-ufal-mcp',
      version: '1.0.0',
      status: 'running',
      tools: gitlabTools.map(t => t.name),
      base_url: process.env.GITLAB_UFAL_BASE_URL,
    }));
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end('Method not allowed');
    return;
  }

  try {
    const data = await parseJsonBody(req);

    if (data.method === 'initialize') {
      sendJson(res, 200, {
        jsonrpc: '2.0',
        id: data.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'mouseai-gitlab-ufal-mcp', version: '1.0.0' },
        },
      });
      return;
    }

    if (data.method === METHOD_TOOLS_LIST) {
      sendJson(res, 200, {
        jsonrpc: '2.0',
        id: data.id ?? null,
        result: { tools: gitlabTools },
      });
      return;
    }

    if (data.method === METHOD_TOOLS_CALL) {
      const { name, arguments: args = {} } = data.params ?? {};
      const handler = (handlers as Record<string, (args: unknown) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>>)[name];

      if (!handler) {
        sendJson(res, 200, {
          jsonrpc: '2.0',
          id: data.id ?? null,
          result: {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          },
        });
        return;
      }

      const result = await handler(args);
      sendJson(res, 200, {
        jsonrpc: '2.0',
        id: data.id ?? null,
        result,
      });
      return;
    }

    sendJson(res, 404, { error: 'Method not found' });
  } catch (error) {
    console.error('[GitLab-MCP] Error:', error);
    sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
});

httpServer.listen(GITLAB_PORT, '0.0.0.0', () => {
  console.log(`[GitLab-MCP] Server running on http://0.0.0.0:${GITLAB_PORT}`);
  console.log(`[GitLab-MCP] Base URL: ${process.env.GITLAB_UFAL_BASE_URL}`);
});

process.on('SIGINT', () => {
  console.log('[GitLab-MCP] Shutting down...');
  httpServer.close();
  process.exit(0);
});