/**
 * MouseAI - GitLab UFAL MCP Server
 * Implements GitLab API v4 as MCP tools via StreamableHTTP
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createToolHandlers, gitlabTools, GITLAB_PORT } from './tools.js';

const server = new Server(
  {
    name: 'mouseai-gitlab-ufal-mcp',
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
  return { tools: gitlabTools };
});

// Create tool handlers
const handlers = createToolHandlers();

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const handler = (handlers as Record<string, (args: unknown) => Promise<{ content: { type: string; text: string }[] }>>)[name];

    if (!handler) {
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }

    const result = await handler(args ?? {});
    return result;
  } catch (error) {
    console.error(`[GitLab-MCP] Tool error: ${name}`, error);
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
  const port = GITLAB_PORT;

  const http = await import('node:http');
  const { createServer } = http;

  const server2 = createServer(async (req, res) => {
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

    try {
      const transport = new StreamableHTTPClientTransport(req, res as unknown as Response);
      await transport.start();
      await server.connect(transport);
    } catch (error) {
      console.error('[GitLab-MCP] Transport error:', error);
      if (!res.writableEnded) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    }
  });

  server2.listen(port, host, () => {
    console.log(`[GitLab-MCP] Server running on http://${host}:${port}`);
    console.log(`[GitLab-MCP] Base URL: ${process.env.GITLAB_UFAL_BASE_URL}`);
  });

  process.on('SIGINT', () => {
    console.log('[GitLab-MCP] Shutting down...');
    server2.close();
    process.exit(0);
  });
}

main().catch(console.error);