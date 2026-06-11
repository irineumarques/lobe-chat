import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { toolDefinitions, handleToolCall } from './tools.js';

const PORT = parseInt(process.env.PORT || '3100', 10);

const server = new Server(
  {
    name: 'github-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler({ method: 'tools/list' }, async () => ({
  tools: toolDefinitions,
}));

server.setRequestHandler({ method: 'tools/call' }, async (request: any): Promise<CallToolResult> => {
  const { name, arguments: args } = request.params;

  try {
    const result = await handleToolCall(name, args || {});
    return {
      content: [{ type: 'text', text: result }],
    };
  } catch (error: any) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

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
  // CORS preflight
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
      sendJson(res, 200, { status: 'ok', server: 'github-mcp-server', version: '1.0.0' });
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
          serverInfo: { name: 'github-mcp-server', version: '1.0.0' },
        },
      });
      return;
    }

    if (data.method === 'tools/list') {
      const result = await server.requestHandler.handleRequest(
        { method: 'tools/list', jsonrpc: '2.0', id: data.id ?? 1 } as any,
        {} as any,
      );
      sendJson(res, 200, result);
      return;
    }

    if (data.method === 'tools/call') {
      const result = await server.requestHandler.handleRequest(
        { method: 'tools/call', params: data.params, jsonrpc: '2.0', id: data.id ?? 1 } as any,
        {} as any,
      );
      sendJson(res, 200, result);
      return;
    }

    sendJson(res, 404, { error: 'Method not found' });
  } catch (error: any) {
    sendJson(res, 500, { error: error.message });
  }
});

httpServer.listen(PORT, () => {
  console.log(`GitHub MCP Server listening on http://localhost:${PORT}`);
  console.log(`Available tools: ${toolDefinitions.map((t) => t.name).join(', ')}`);
});