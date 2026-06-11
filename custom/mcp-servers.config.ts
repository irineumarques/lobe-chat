/**
 * MouseAI MCP Servers Configuration
 *
 * Este arquivo define todos os MCP servers disponíveis no MouseAI.
 * Para registrar um MCP server no LobeChat, use a UI de configuração de MCP
 * ou configure via variável de ambiente PLUGIN_SETTINGS.
 *
 * Os servers são executados como serviços HTTP standalone e se conectam
 * ao LobeChat via protocolo MCP StreamableHTTP.
 */

export const mcpServers = {
  github: {
    name: 'GitHub',
    description: 'Acesso a repositórios, issues, pull requests, commits e código do GitHub',
    url: process.env.GITHUB_MCP_URL || 'http://localhost:3100',
    type: 'http' as const,
    auth: {
      type: 'bearer' as const,
      token: process.env.GITHUB_TOKEN || '',
    },
    tools: [
      'list_repos',
      'get_issues',
      'get_prs',
      'create_issue',
      'create_pr',
      'get_commits',
      'get_branches',
      'get_file_content',
      'search_code',
    ],
  },
  postgres: {
    name: 'PostgreSQL Readonly',
    description: 'Consultas SELECT em banco de dados PostgreSQL readonly',
    url: process.env.POSTGRES_MCP_URL || 'http://localhost:3101',
    type: 'http' as const,
    tools: [
      'pg_list_tables',
      'pg_describe_table',
      'pg_execute_query',
      'pg_get_schema',
    ],
  },
  gitlab_ufal: {
    name: 'GitLab UFAL',
    description: 'Integração com o GitLab da Universidade Federal de Alagoas',
    url: process.env.GITLAB_MCP_URL || 'http://localhost:3102',
    type: 'http' as const,
    auth: {
      type: 'bearer' as const,
      token: process.env.GITLAB_UFAL_TOKEN || '',
    },
    tools: [
      'list_projects',
      'get_repo',
      'list_branches',
      'list_commits',
      'get_issues',
      'create_issue',
      'get_MRs',
      'create_MR',
      'list_pipelines',
      'list_members',
      'get_file_content',
      'create_file',
    ],
  },
  code_interpreter: {
    name: 'Code Interpreter',
    description: 'Execução de código Python e geração de PDFs com tipografia editorial',
    url: process.env.CODE_INTERPRETER_MCP_URL || 'http://localhost:3104',
    type: 'http' as const,
    tools: [
      'execute_python',
      'generate_pdf',
      'list_fonts',
      'execute_stream',
    ],
  },
} as const;

// LobeChat plugin settings format
// PLUGIN_SETTINGS=mcp-github:url=http://localhost:3100;mcp-postgres:url=http://localhost:3101;mcp-gitlab-ufal:url=http://localhost:3102;mcp-code-interpreter:url=http://localhost:3104

export const mcpPluginSettings = [
  'mcp-github:url=http://localhost:3100',
  'mcp-postgres:url=http://localhost:3101',
  'mcp-gitlab-ufal:url=http://localhost:3102',
  'mcp-code-interpreter:url=http://localhost:3104',
].join(',');