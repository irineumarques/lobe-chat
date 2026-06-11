import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { toolDefinitions, handleToolCall } from './tools.js';

const METHOD_TOOLS_LIST = 'tools/list';
const METHOD_TOOLS_CALL = 'tools/call';

const PORT = parseInt(process.env.PORT || '3100', 10);

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
    'Access-Control-Allow-Headers': 'Content-Type, MCP-Session-Id',
  });
  res.end(JSON.stringify(data));
}

const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, MCP-Session-Id',
    });
    res.end();
    return;
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    res.writeHead(405);
    res.end('Method not allowed');
    return;
  }

  try {
    if (req.method === 'GET') {
      if (req.url === '/health') {
        sendJson(res, 200, { status: 'ok', service: 'mouseai-github-mcp' });
      } else {
        sendJson(res, 200, { status: 'ok', server: 'mouseai-github-mcp', version: '1.0.0' });
      }
      return;
    }

    const data = await parseJsonBody(req);

    if (data.method === 'initialize') {
      sendJson(res, 200, {
        jsonrpc: '2.0',
        id: data.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'mouseai-github-mcp', version: '1.0.0' },
        },
      });
      return;
    }

    if (data.method === METHOD_TOOLS_LIST) {
      const response = await Promise.resolve({ tools: toolDefinitions });
      sendJson(res, 200, {
        jsonrpc: '2.0',
        id: data.id ?? null,
        result: response,
      });
      return;
    }

    if (data.method === METHOD_TOOLS_CALL) {
      const { name, arguments: args = {} } = data.params ?? {};
      const result = await handleToolCall(name, args);
      sendJson(res, 200, {
        jsonrpc: '2.0',
        id: data.id ?? null,
        result: {
          content: [{ type: 'text', text: result }],
        },
      });
      return;
    }

    sendJson(res, 404, { error: 'Method not found' });
  } catch (error: any) {
    sendJson(res, 500, { error: error.message });
  }
});

httpServer.listen(PORT, () => {
  console.log(`[GitHub-MCP] Server listening on http://localhost:${PORT}`);
  console.log(`[GitHub-MCP] Available tools: ${toolDefinitions.map((t) => t.name).join(', ')}`);
});