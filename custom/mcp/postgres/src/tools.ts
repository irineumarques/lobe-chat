import { z } from 'zod';
import pg from 'pg';
import type { McpTool } from '@modelcontextprotocol/sdk/types.js';

const { Pool } = pg;

export const PG_PORT = parseInt(process.env.PG_PORT || '3101', 10);
export const MAX_ROWS = parseInt(process.env.MAX_ROWS || '1000', 10);

export interface ToolContext {
  pool: pg.Pool;
}

// Initialize connection pool
let pool: pg.Pool | null = null;

export function getPool(connectionString: string): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    pool.on('error', (err) => {
      console.error('Unexpected PostgreSQL pool error:', err);
    });
  }
  return pool;
}

// Validate that a query is SELECT-only
export function validateQuery(query: string): { valid: boolean; error?: string } {
  const trimmed = query.trim().toUpperCase();

  // Block dangerous keywords
  const dangerousKeywords = [
    'INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE', 'ALTER',
    'CREATE', 'GRANT', 'REVOKE', 'COMMIT', 'ROLLBACK', 'SAVEPOINT',
    'LOCK', 'COPY', 'VACUUM', 'ANALYZE', 'CLUSTER', 'REINDEX',
  ];

  for (const keyword of dangerousKeywords) {
    // Check for keyword as a whole word (not part of another word)
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(trimmed)) {
      return { valid: false, error: `Query contains forbidden keyword: ${keyword}` };
    }
  }

  // Must start with SELECT
  if (!trimmed.startsWith('SELECT')) {
    return { valid: false, error: 'Only SELECT queries are allowed' };
  }

  // Block multiple statements
  if (trimmed.includes(';') && trimmed.split(';').filter(s => s.trim()).length > 1) {
    return { valid: false, error: 'Only single-statement queries are allowed' };
  }

  return { valid: true };
}

// Tool definitions
export const pgTools: McpTool[] = [
  {
    name: 'pg_list_tables',
    description: 'List all tables in a PostgreSQL schema',
    inputSchema: {
      type: 'object',
      properties: {
        schema: {
          type: 'string',
          description: 'Schema name (default: public)',
          default: 'public',
        },
      },
    },
  },
  {
    name: 'pg_describe_table',
    description: 'Get column information for a specific table',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'Table name to describe',
        },
        schema: {
          type: 'string',
          description: 'Schema name (default: public)',
          default: 'public',
        },
      },
      required: ['table'],
    },
  },
  {
    name: 'pg_execute_query',
    description: 'Execute a SELECT query (read-only). Only SELECT statements are allowed. Maximum 1000 rows.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'SQL SELECT query to execute',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'pg_get_schema',
    description: 'Get complete database schema overview (all tables and columns)',
    inputSchema: {
      type: 'object',
      properties: {
        schema: {
          type: 'string',
          description: 'Schema name (default: public)',
          default: 'public',
        },
      },
    },
  },
];

// Tool handlers
export async function handlePgListTables(args: { schema?: string }, ctx: ToolContext) {
  const schema = args.schema || 'public';
  const query = `
    SELECT
      t.table_name,
      t.table_type,
      obj_description((t.table_schema || '.' || t.table_name)::regclass, 'pg_class') as description
    FROM information_schema.tables t
    WHERE t.table_schema = $1
    AND t.table_type IN ('BASE TABLE', 'VIEW')
    ORDER BY t.table_name;
  `;

  const result = await ctx.pool.query(query, [schema]);
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ tables: result.rows, count: result.rows.length }, null, 2),
      },
    ],
  };
}

export async function handlePgDescribeTable(args: { table: string; schema?: string }, ctx: ToolContext) {
  const schema = args.schema || 'public';
  const query = `
    SELECT
      c.column_name,
      c.data_type,
      c.is_nullable,
      c.column_default,
      c.character_maximum_length,
      c.numeric_precision,
      c.numeric_scale,
      CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
    FROM information_schema.columns c
    LEFT JOIN (
      SELECT kcu.column_name
      FROM information_schema.key_column_usage kcu
      JOIN information_schema.table_constraints tc
        ON tc.constraint_name = kcu.constraint_name
        AND tc.constraint_type = 'PRIMARY KEY'
      WHERE kcu.table_schema = $1 AND kcu.table_name = $2
    ) pk ON pk.column_name = c.column_name
    WHERE c.table_schema = $1 AND c.table_name = $2
    ORDER BY c.ordinal_position;
  `;

  const result = await ctx.pool.query(query, [schema, args.table]);
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ table: args.table, schema, columns: result.rows }, null, 2),
      },
    ],
  };
}

export async function handlePgExecuteQuery(args: { query: string }, ctx: ToolContext) {
  const validation = validateQuery(args.query);
  if (!validation.valid) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ error: validation.error, query: args.query }),
        },
      ],
      isError: true,
    };
  }

  console.log(`[PG-MCP] Executing query: ${args.query.substring(0, 100)}...`);

  const result = await ctx.pool.query(args.query + ` LIMIT ${MAX_ROWS}`, []);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          rows: result.rows,
          count: result.rows.length,
          truncated: result.rows.length === MAX_ROWS,
          columns: result.fields.map(f => f.name),
        }, null, 2),
      },
    ],
  };
}

export async function handlePgGetSchema(args: { schema?: string }, ctx: ToolContext) {
  const schema = args.schema || 'public';
  const query = `
    SELECT
      t.table_name,
      c.column_name,
      c.data_type,
      c.is_nullable,
      c.column_default,
      CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
    FROM information_schema.tables t
    JOIN information_schema.columns c ON c.table_name = t.table_name AND c.table_schema = t.table_schema
    LEFT JOIN (
      SELECT kcu.column_name, kcu.table_name
      FROM information_schema.key_column_usage kcu
      JOIN information_schema.table_constraints tc
        ON tc.constraint_name = kcu.constraint_name AND tc.constraint_type = 'PRIMARY KEY'
      WHERE kcu.table_schema = $1
    ) pk ON pk.column_name = c.column_name AND pk.table_name = c.table_name
    WHERE t.table_schema = $1 AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name, c.ordinal_position;
  `;

  const result = await ctx.pool.query(query, [schema]);

  // Group by table
  const schemaOverview: Record<string, unknown[]> = {};
  for (const row of result.rows) {
    if (!schemaOverview[row.table_name]) {
      schemaOverview[row.table_name] = [];
    }
    schemaOverview[row.table_name].push({
      column: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable === 'YES',
      default: row.column_default,
      primary_key: row.is_primary_key,
    });
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ schema, tables: schemaOverview }, null, 2),
      },
    ],
  };
}

export function createToolHandlers(pool: pg.Pool) {
  const ctx: ToolContext = { pool };

  return {
    pg_list_tables: (args: unknown) => handlePgListTables(args as { schema?: string }, ctx),
    pg_describe_table: (args: unknown) => handlePgDescribeTable(args as { table: string; schema?: string }, ctx),
    pg_execute_query: (args: unknown) => handlePgExecuteQuery(args as { query: string }, ctx),
    pg_get_schema: (args: unknown) => handlePgGetSchema(args as { schema?: string }, ctx),
  };
}