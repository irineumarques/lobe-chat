/**
 * Code Interpreter MCP Tools
 * Implements code execution and PDF generation as MCP tools
 */

export interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const CODE_INTERPRETER_PORT = parseInt(process.env.PORT || '3104', 10);

interface ToolContext {
  baseUrl: string;
  apiKey: string;
}

async function callCodeInterpreter(
  endpoint: string,
  body: Record<string, unknown>,
  ctx: ToolContext,
): Promise<unknown> {
  const response = await fetch(`${ctx.baseUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ctx.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Code Interpreter API error ${response.status}: ${errorText}`);
  }

  return response.json() as Promise<unknown>;
}

// Tool definitions
export const codeInterpreterTools: Tool[] = [
  {
    name: 'execute_python',
    description: 'Execute Python code in a sandboxed environment. Supports numpy, pandas, matplotlib, and other data science libraries.',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Python code to execute',
        },
        timeout: {
          type: 'integer',
          description: 'Maximum execution time in seconds (default: 60, max: 300)',
          default: 60,
        },
        session_id: {
          type: 'string',
          description: 'Optional session ID for stateful execution',
        },
      },
      required: ['code'],
    },
  },
  {
    name: 'generate_pdf',
    description: 'Generate PDF from HTML or Markdown content with editorial typography. Uses EB Garamond, Cormorant Garamond, and Cinzel fonts.',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'HTML or Markdown content to convert to PDF',
        },
        title: {
          type: 'string',
          description: 'Document title (used in filename and header)',
        },
        format: {
          type: 'string',
          enum: ['html', 'markdown'],
          description: 'Content format: html or markdown',
          default: 'html',
        },
        font_family: {
          type: 'string',
          description: 'Primary font family',
          default: 'EB Garamond',
        },
        font_size: {
          type: 'integer',
          description: 'Base font size in points',
          default: 11,
        },
        page_size: {
          type: 'string',
          description: 'Page size (A4, Letter, etc.)',
          default: 'A4',
        },
        margin_top: {
          type: 'number',
          description: 'Top margin in cm',
          default: 2.5,
        },
        margin_bottom: {
          type: 'number',
          description: 'Bottom margin in cm',
          default: 2.5,
        },
        margin_left: {
          type: 'number',
          description: 'Left margin in cm',
          default: 2.5,
        },
        margin_right: {
          type: 'number',
          description: 'Right margin in cm',
          default: 2.5,
        },
      },
      required: ['content'],
    },
  },
  {
    name: 'list_fonts',
    description: 'List available fonts in the code interpreter environment',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'execute_stream',
    description: 'Execute Python code and get streaming output (stdout/stderr chunks)',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Python code to execute',
        },
        session_id: {
          type: 'string',
          description: 'Optional session ID for stateful execution',
        },
      },
      required: ['code'],
    },
  },
];

// Tool handlers
async function handleExecutePython(
  args: { code: string; timeout?: number; session_id?: string },
  ctx: ToolContext,
) {
  const result = await callCodeInterpreter('/execute', {
    code: args.code,
    language: 'python',
    timeout: args.timeout || 60,
    session_id: args.session_id,
  }, ctx) as {
    session_id: string;
    success: boolean;
    stdout: string;
    stderr: string;
    execution_time: number;
    artifacts: Array<{ name: string; type: string; url: string }>;
  };

  const output = [
    `Execution time: ${result.execution_time.toFixed(3)}s`,
    `Success: ${result.success}`,
    '',
    '=== STDOUT ===',
    result.stdout || '(no output)',
  ];

  if (result.stderr) {
    output.push('', '=== STDERR ===');
    output.push(result.stderr);
  }

  if (result.artifacts && result.artifacts.length > 0) {
    output.push('', '=== ARTIFACTS ===');
    for (const artifact of result.artifacts) {
      output.push(`- ${artifact.name} (${artifact.type}): ${artifact.url}`);
    }
  }

  return {
    content: [{ type: 'text', text: output.join('\n') }],
    isError: !result.success && !!result.stderr,
  };
}

async function handleGeneratePdf(
  args: {
    content: string;
    title?: string;
    format?: string;
    font_family?: string;
    font_size?: number;
    page_size?: string;
    margin_top?: number;
    margin_bottom?: number;
    margin_left?: number;
    margin_right?: number;
  },
  ctx: ToolContext,
) {
  const result = await callCodeInterpreter('/generate-pdf', {
    content: args.content,
    title: args.title,
    format: args.format || 'html',
    font_family: args.font_family || 'EB Garamond',
    font_size: args.font_size || 11,
    page_size: args.page_size || 'A4',
    margin_top: args.margin_top ?? 2.5,
    margin_bottom: args.margin_bottom ?? 2.5,
    margin_left: args.margin_left ?? 2.5,
    margin_right: args.margin_right ?? 2.5,
  }, ctx) as {
    success: boolean;
    file_id: string;
    file_name: string;
    file_size: number;
    download_url: string;
    content_type: string;
  };

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: result.success,
        file_name: result.file_name,
        file_size: result.file_size,
        download_url: result.download_url,
        message: `PDF generated successfully: ${result.file_name} (${(result.file_size / 1024).toFixed(1)} KB)`,
      }, null, 2),
    }],
  };
}

async function handleListFonts(args: unknown, ctx: ToolContext) {
  const response = await fetch(`${ctx.baseUrl}/fonts`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${ctx.apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to list fonts: ${response.status}`);
  }

  const result = await response.json() as {
    system: string[];
    weasyprint_available: boolean;
  };

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        available_fonts: result.system,
        weasyprint_available: result.weasyprint_available,
      }, null, 2),
    }],
  };
}

async function handleExecuteStream(
  args: { code: string; session_id?: string },
  ctx: ToolContext,
) {
  const result = await callCodeInterpreter('/execute-stream', {
    code: args.code,
    session_id: args.session_id,
  }, ctx) as {
    session_id: string;
    chunks: Array<{ type: string; data: string }>;
    execution_time: number;
  };

  const output = [`Execution time: ${result.execution_time.toFixed(3)}s`, ''];

  for (const chunk of result.chunks) {
    output.push(`[${chunk.type.toUpperCase()}]`);
    output.push(chunk.data);
    output.push('');
  }

  return {
    content: [{ type: 'text', text: output.join('\n') }],
  };
}

export function createToolHandlers(baseUrl: string, apiKey: string) {
  const ctx: ToolContext = { baseUrl, apiKey };

  return {
    execute_python: (args: unknown) => handleExecutePython(args as Parameters<typeof handleExecutePython>[0], ctx),
    generate_pdf: (args: unknown) => handleGeneratePdf(args as Parameters<typeof handleGeneratePdf>[0], ctx),
    list_fonts: (args: unknown) => handleListFonts(args as Parameters<typeof handleListFonts>[0], ctx),
    execute_stream: (args: unknown) => handleExecuteStream(args as Parameters<typeof handleExecuteStream>[0], ctx),
  };
}