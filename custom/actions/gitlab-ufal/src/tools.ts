/**
 * GitLab UFAL MCP Server
 * Implements GitLab API v4 as MCP tools
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

export const GITLAB_PORT = parseInt(process.env.GITLAB_PORT || '3102', 10);
export const GITLAB_TOKEN = process.env.GITLAB_UFAL_TOKEN || '';
export const GITLAB_BASE_URL = process.env.GITLAB_UFAL_BASE_URL || 'https://gitlab.ufal.br/api/v4';

if (!GITLAB_TOKEN) {
  console.warn('WARNING: GITLAB_UFAL_TOKEN environment variable is not set. GitLab tools will not work.');
}

// HTTP client
async function gitlabRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${GITLAB_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'PRIVATE-TOKEN': GITLAB_TOKEN,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitLab API error ${response.status}: ${errorText}`);
  }

  return response.json() as Promise<T>;
}

// Tool definitions
export const gitlabTools: Tool[] = [
  {
    name: 'list_projects',
    description: 'Lista todos os projetos acessíveis no GitLab UFAL. Use o parâmetro search para filtrar por nome.',
    inputSchema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Buscar projetos pelo nome (busca parcial)' },
        per_page: { type: 'integer', description: 'Resultados por página (default: 20, max: 100)', default: 20 },
 page: { type: 'integer', description: 'Número da página', default: 1 },
      },
    },
  },
  {
    name: 'get_repo',
    description: 'Obtém detalhes de um repositório específico',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'ID ou path do projeto (ex: grupo/projeto ou123)' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'list_branches',
    description: 'Lista branches de um repositório',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'ID ou path do projeto' },
        per_page: { type: 'integer', description: 'Resultados por página', default: 20 },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'list_commits',
    description: 'Lista commits de um repositório',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'ID ou path do projeto' },
        ref_name: { type: 'string', description: 'Branch ou tag (default: main)' },
        per_page: { type: 'integer', description: 'Resultados por página', default: 20 },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'get_issues',
    description: 'Lista issues de um repositório',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'ID ou path do projeto' },
        state: { type: 'string', description: 'Estado: opened, closed, all', default: 'opened' },
        per_page: { type: 'integer', description: 'Resultados por página', default: 20 },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'create_issue',
    description: 'Cria uma nova issue em um repositório',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'ID ou path do projeto' },
        title: { type: 'string', description: 'Título da issue' },
        description: { type: 'string', description: 'Descrição da issue' },
        labels: { type: 'string', description: 'Labels separadas por vírgula' },
      },
      required: ['project_id', 'title'],
    },
  },
  {
    name: 'get_MRs',
    description: 'Lista merge requests de um repositório',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'ID ou path do projeto' },
        state: { type: 'string', description: 'Estado: opened, closed, merged, all', default: 'opened' },
        per_page: { type: 'integer', description: 'Resultados por página', default: 20 },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'create_MR',
    description: 'Cria um merge request',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'ID ou path do projeto' },
        source_branch: { type: 'string', description: 'Branch de origem' },
        target_branch: { type: 'string', description: 'Branch de destino (default: main)' },
        title: { type: 'string', description: 'Título do MR' },
        description: { type: 'string', description: 'Descrição do MR' },
      },
      required: ['project_id', 'source_branch', 'title'],
    },
  },
  {
    name: 'list_pipelines',
    description: 'Lista pipelines CI/CD de um repositório',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'ID ou path do projeto' },
        ref: { type: 'string', description: 'Branch ou tag' },
        per_page: { type: 'integer', description: 'Resultados por página', default: 20 },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'list_members',
    description: 'Lista membros de um projeto',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'ID ou path do projeto' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'get_file_content',
    description: 'Obtém conteúdo de um arquivo no repositório',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'ID ou path do projeto' },
        file_path: { type: 'string', description: 'Caminho do arquivo (ex: README.md)' },
        ref: { type: 'string', description: 'Branch ou commit (default: main)' },
      },
      required: ['project_id', 'file_path'],
    },
  },
  {
    name: 'create_file',
    description: 'Cria ou atualiza um arquivo no repositório',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'ID ou path do projeto' },
        file_path: { type: 'string', description: 'Caminho do arquivo' },
        content: { type: 'string', description: 'Conteúdo do arquivo (será codificado em base64)' },
        branch: { type: 'string', description: 'Branch de destino (default: main)' },
        commit_message: { type: 'string', description: 'Mensagem do commit' },
      },
      required: ['project_id', 'file_path', 'content', 'commit_message'],
    },
  },
];

// Tool handlers
async function handleListProjects(args: {
  search?: string;
  per_page?: number;
  page?: number;
}) {
  const params = new URLSearchParams();
  if (args.search) params.set('search', args.search);
  params.set('per_page', String(args.per_page || 20));
  params.set('page', String(args.page || 1));

  const projects = await gitlabRequest<unknown[]>(`/projects?${params}`);
  return {
    content: [{ type: 'text', text: JSON.stringify(projects, null, 2) }],
  };
}

async function handleGetRepo(args: { project_id: string }) {
  const project = await gitlabRequest<unknown>(`/projects/${encodeURIComponent(args.project_id)}`);
  return { content: [{ type: 'text', text: JSON.stringify(project, null, 2) }] };
}

async function handleListBranches(args: { project_id: string; per_page?: number }) {
  const params = new URLSearchParams();
  params.set('per_page', String(args.per_page || 20));
  const branches = await gitlabRequest<unknown[]>(
    `/projects/${encodeURIComponent(args.project_id)}/repository/branches?${params}`
  );
  return { content: [{ type: 'text', text: JSON.stringify(branches, null, 2) }] };
}

async function handleListCommits(args: { project_id: string; ref_name?: string; per_page?: number }) {
  const params = new URLSearchParams();
  params.set('per_page', String(args.per_page || 20));
  const ref = args.ref_name || 'main';
  const commits = await gitlabRequest<unknown[]>(
    `/projects/${encodeURIComponent(args.project_id)}/repository/commits?ref_name=${encodeURIComponent(ref)}&${params}`
  );
  return { content: [{ type: 'text', text: JSON.stringify(commits, null, 2) }] };
}

async function handleGetIssues(args: { project_id: string; state?: string; per_page?: number }) {
  const params = new URLSearchParams();
  params.set('state', args.state || 'opened');
  params.set('per_page', String(args.per_page || 20));
  const issues = await gitlabRequest<unknown[]>(
    `/projects/${encodeURIComponent(args.project_id)}/issues?${params}`
  );
  return { content: [{ type: 'text', text: JSON.stringify(issues, null, 2) }] };
}

async function handleCreateIssue(args: {
  project_id: string;
  title: string;
  description?: string;
  labels?: string;
}) {
  const body: Record<string, unknown> = { title: args.title };
  if (args.description) body.description = args.description;
  if (args.labels) body.labels = args.labels;

  const issue = await gitlabRequest<unknown>(
    `/projects/${encodeURIComponent(args.project_id)}/issues`,
    { method: 'POST', body: JSON.stringify(body) }
  );
  return { content: [{ type: 'text', text: JSON.stringify(issue, null, 2) }] };
}

async function handleGetMRs(args: { project_id: string; state?: string; per_page?: number }) {
  const params = new URLSearchParams();
  params.set('state', args.state || 'opened');
  params.set('per_page', String(args.per_page || 20));
  const mrs = await gitlabRequest<unknown[]>(
    `/projects/${encodeURIComponent(args.project_id)}/merge_requests?${params}`
  );
  return { content: [{ type: 'text', text: JSON.stringify(mrs, null, 2) }] };
}

async function handleCreateMR(args: {
  project_id: string;
  source_branch: string;
  target_branch?: string;
  title: string;
  description?: string;
}) {
  const body: Record<string, unknown> = {
    source_branch: args.source_branch,
    target_branch: args.target_branch || 'main',
    title: args.title,
  };
  if (args.description) body.description = args.description;

  const mr = await gitlabRequest<unknown>(
    `/projects/${encodeURIComponent(args.project_id)}/merge_requests`,
    { method: 'POST', body: JSON.stringify(body) }
  );
  return { content: [{ type: 'text', text: JSON.stringify(mr, null, 2) }] };
}

async function handleListPipelines(args: { project_id: string; ref?: string; per_page?: number }) {
  const params = new URLSearchParams();
  params.set('per_page', String(args.per_page || 20));
  if (args.ref) params.set('ref', args.ref);

  const pipelines = await gitlabRequest<unknown[]>(
    `/projects/${encodeURIComponent(args.project_id)}/pipelines?${params}`
  );
  return { content: [{ type: 'text', text: JSON.stringify(pipelines, null, 2) }] };
}

async function handleListMembers(args: { project_id: string }) {
  const members = await gitlabRequest<unknown[]>(
    `/projects/${encodeURIComponent(args.project_id)}/members`
  );
  return { content: [{ type: 'text', text: JSON.stringify(members, null, 2) }] };
}

async function handleGetFileContent(args: { project_id: string; file_path: string; ref?: string }) {
  const ref = args.ref || 'main';
  const file = await gitlabRequest<unknown>(
    `/projects/${encodeURIComponent(args.project_id)}/repository/files/${encodeURIComponent(args.file_path)}?ref=${encodeURIComponent(ref)}`
  );
  return { content: [{ type: 'text', text: JSON.stringify(file, null, 2) }] };
}

async function handleCreateFile(args: {
  project_id: string;
  file_path: string;
  content: string;
  branch?: string;
  commit_message: string;
}) {
  const branch = args.branch || 'main';
  const body = {
    branch,
    content: Buffer.from(args.content).toString('base64'),
    commit_message: args.commit_message,
  };

  const result = await gitlabRequest<unknown>(
    `/projects/${encodeURIComponent(args.project_id)}/repository/files/${encodeURIComponent(args.file_path)}`,
    { method: 'PUT', body: JSON.stringify(body) }
  );
  return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
}

export function createToolHandlers() {
  return {
    list_projects: (args: unknown) => handleListProjects(args as Parameters<typeof handleListProjects>[0]),
    get_repo: (args: unknown) => handleGetRepo(args as Parameters<typeof handleGetRepo>[0]),
    list_branches: (args: unknown) => handleListBranches(args as Parameters<typeof handleListBranches>[0]),
    list_commits: (args: unknown) => handleListCommits(args as Parameters<typeof handleListCommits>[0]),
    get_issues: (args: unknown) => handleGetIssues(args as Parameters<typeof handleGetIssues>[0]),
    create_issue: (args: unknown) => handleCreateIssue(args as Parameters<typeof handleCreateIssue>[0]),
    get_MRs: (args: unknown) => handleGetMRs(args as Parameters<typeof handleGetMRs>[0]),
    create_MR: (args: unknown) => handleCreateMR(args as Parameters<typeof handleCreateMR>[0]),
    list_pipelines: (args: unknown) => handleListPipelines(args as Parameters<typeof handleListPipelines>[0]),
    list_members: (args: unknown) => handleListMembers(args as Parameters<typeof handleListMembers>[0]),
    get_file_content: (args: unknown) => handleGetFileContent(args as Parameters<typeof handleGetFileContent>[0]),
    create_file: (args: unknown) => handleCreateFile(args as Parameters<typeof handleCreateFile>[0]),
  };
}