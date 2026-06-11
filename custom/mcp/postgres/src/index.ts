/**
 * MouseAI - PostgreSQL MCP Server (Read-only)
 * Implements Model Context Protocol over HTTP (StreamableHTTP)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createToolHandlers, pgTools, getPool, PG_PORT } from './tools.js';

const POSTGRES_URL = process.env.POSTGRES_URL;
if (!POSTGRES_URL) {
  console.error('POSTGRES_URL environment variable is required');
  process.exit(1);
}

// Create PostgreSQL connection pool
const pool = getPool(POSTGRES_URL);

// Create MCP server
const server = new Server(
  {
    name: 'mouseai-postgres-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: pgTools };
});

// Create tool handlers
const handlers = createToolHandlers(pool);

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const handler = (handlers as Record<string, (args: unknown) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>>)[name];

    if (!handler) {
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }

    const result = await handler(args ?? {});
    return result;
  } catch (error) {
    console.error(`[PG-MCP] Tool error: ${name}`, error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
            tool: name,
          }),
 },
      ],
      isError: true,
    };
  }
});

// HTTP server for StreamableHTTP
async function main() {
  const host = process.env.HOST || '0.0.0.0';
  const port = PG_PORT;

  // Use Node.js built-in http module for StreamableHTTP
  const http = await import('node:http');
  const { createServer } = http;

  const server2 = createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, MCP-Session-ID, Accept');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Health check endpoint
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'mouseai-postgres-mcp' }));
      return;
    }

    // Health check at root
    if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        name: 'mouseai-postgres-mcp', 
        version: '1.0.0',
        status: 'running',
        tools: pgTools.map(t => t.name),
      }));
      return;
    }

    // MCP StreamableHTTP endpoint
    try {
      const transport = new StreamableHTTPClientTransport(req, res as unknown as Response);
      await transport.start();
      // Connect the server to the transport
      await server.connect(transport);
 } catch (error) {
      console.error('[PG-MCP] Transport error:', error);
      if (!res.writableEnded) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    }
  });

  server2.listen(port, host, () => {
    console.log(`[PG-MCP] Server running on http://${host}:${port}`);
    console.log(`[PG-MCP] PostgreSQL: ${POSTGRES_URL.split('@')[1]}`);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('[PG-MCP] Shutting down...');
    await pool.end();
    server2.close();
    process.exit(0);
  });
}

main().catch(console.error);
