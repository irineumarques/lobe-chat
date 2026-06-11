const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_API = 'https://api.github.com';

async function githubRequest(path: string, options: RequestInit = {}): Promise<any> {
  const url = path.startsWith('http') ? path : `${GITHUB_API}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`GitHub API error (${res.status}): ${error}`);
  }

  return res.json();
}

export const toolDefinitions = [
  {
    name: 'list_repos',
    description: 'List repositories for a user or organization',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'GitHub username or organization name' },
        type: { type: 'string', enum: ['all', 'owner', 'member'], description: 'Type of repositories to list', default: 'all' },
        per_page: { type: 'number', description: 'Results per page (max 100)', default: 30 },
        page: { type: 'number', description: 'Page number', default: 1 },
      },
      required: ['owner'],
    },
  },
  {
    name: 'get_issues',
    description: 'Get issues for a repository',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        state: { type: 'string', enum: ['open', 'closed', 'all'], description: 'Issue state filter', default: 'open' },
        per_page: { type: 'number', description: 'Results per page (max 100)', default: 30 },
        page: { type: 'number', description: 'Page number', default: 1 },
      },
      required: ['owner', 'repo'],
    },
  },
  {
    name: 'get_prs',
    description: 'Get pull requests for a repository',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        state: { type: 'string', enum: ['open', 'closed', 'all'], description: 'PR state filter', default: 'open' },
        per_page: { type: 'number', description: 'Results per page (max 100)', default: 30 },
        page: { type: 'number', description: 'Page number', default: 1 },
      },
      required: ['owner', 'repo'],
    },
  },
  {
    name: 'create_issue',
    description: 'Create an issue in a repository',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        title: { type: 'string', description: 'Issue title' },
        body: { type: 'string', description: 'Issue body' },
        labels: { type: 'array', items: { type: 'string' }, description: 'Labels to assign' },
      },
      required: ['owner', 'repo', 'title'],
    },
  },
  {
    name: 'create_pull_request',
    description: 'Create a pull request in a repository',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        title: { type: 'string', description: 'PR title' },
        body: { type: 'string', description: 'PR body' },
        head: { type: 'string', description: 'Branch containing changes' },
        base: { type: 'string', description: 'Branch to merge into', default: 'main' },
      },
      required: ['owner', 'repo', 'title', 'head', 'base'],
    },
  },
  {
    name: 'get_commits',
    description: 'Get commits for a repository',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        sha: { type: 'string', description: 'Branch name or commit SHA' },
        per_page: { type: 'number', description: 'Results per page (max 100)', default: 30 },
        page: { type: 'number', description: 'Page number', default: 1 },
      },
      required: ['owner', 'repo'],
    },
  },
  {
    name: 'get_branches',
    description: 'Get branches for a repository',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        per_page: { type: 'number', description: 'Results per page (max 100)', default: 30 },
        page: { type: 'number', description: 'Page number', default: 1 },
      },
      required: ['owner', 'repo'],
    },
  },
  {
    name: 'get_file_content',
    description: 'Get file content from a repository',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        path: { type: 'string', description: 'File path in the repository' },
        ref: { type: 'string', description: 'Branch name, tag, or commit SHA' },
      },
      required: ['owner', 'repo', 'path'],
    },
  },
  {
    name: 'search_code',
    description: 'Search code in repositories',
    inputSchema: {
      type: 'object' as const,
      properties: {
        q: { type: 'string', description: 'Search query (GitHub code search syntax)' },
        per_page: { type: 'number', description: 'Results per page (max 100)', default: 30 },
        page: { type: 'number', description: 'Page number', default: 1 },
      },
      required: ['q'],
    },
  },
];

export async function handleToolCall(name: string, args: Record<string, any>): Promise<string> {
  switch (name) {
    case 'list_repos': {
      const { owner, type = 'all', per_page = 30, page = 1 } = args;
      const data = await githubRequest(`/users/${owner}/repos?type=${type}&per_page=${per_page}&page=${page}`);
      return JSON.stringify(
        data.map((r: any) => ({
          name: r.name,
          full_name: r.full_name,
          description: r.description,
          language: r.language,
          stars: r.stargazers_count,
          forks: r.forks_count,
          updated_at: r.updated_at,
          html_url: r.html_url,
        })),
        null,
        2,
      );
    }

    case 'get_issues': {
      const { owner, repo, state = 'open', per_page = 30, page = 1 } = args;
      const data = await githubRequest(`/repos/${owner}/${repo}/issues?state=${state}&per_page=${per_page}&page=${page}`);
      return JSON.stringify(
        data.map((i: any) => ({
          number: i.number,
          title: i.title,
          state: i.state,
          user: i.user?.login,
          labels: i.labels?.map((l: any) => l.name),
          created_at: i.created_at,
          html_url: i.html_url,
        })),
        null,
        2,
      );
    }

    case 'get_prs': {
      const { owner, repo, state = 'open', per_page = 30, page = 1 } = args;
      const data = await githubRequest(`/repos/${owner}/${repo}/pulls?state=${state}&per_page=${per_page}&page=${page}`);
      return JSON.stringify(
        data.map((p: any) => ({
          number: p.number,
          title: p.title,
          state: p.state,
          user: p.user?.login,
          head: p.head?.ref,
          base: p.base?.ref,
          created_at: p.created_at,
          html_url: p.html_url,
        })),
        null,
        2,
      );
    }

    case 'create_issue': {
      const { owner, repo, title, body, labels } = args;
      const data = await githubRequest(`/repos/${owner}/${repo}/issues`, {
        method: 'POST',
        body: JSON.stringify({ title, body, labels }),
      });
      return JSON.stringify(
        { number: data.number, title: data.title, html_url: data.html_url, state: data.state },
        null,
        2,
      );
    }

    case 'create_pull_request': {
      const { owner, repo, title, body, head, base } = args;
      const data = await githubRequest(`/repos/${owner}/${repo}/pulls`, {
        method: 'POST',
        body: JSON.stringify({ title, body, head, base }),
      });
      return JSON.stringify(
        { number: data.number, title: data.title, html_url: data.html_url, state: data.state },
        null,
        2,
      );
    }

    case 'get_commits': {
      const { owner, repo, sha, per_page = 30, page = 1 } = args;
      let url = `/repos/${owner}/${repo}/commits?per_page=${per_page}&page=${page}`;
      if (sha) url += `&sha=${sha}`;
      const data = await githubRequest(url);
      return JSON.stringify(
        data.map((c: any) => ({
          sha: c.sha.slice(0, 7),
          message: c.commit?.message?.split('\n')[0],
          author: c.commit?.author?.name,
          date: c.commit?.author?.date,
        })),
        null,
        2,
      );
    }

    case 'get_branches': {
      const { owner, repo, per_page = 30, page = 1 } = args;
      const data = await githubRequest(`/repos/${owner}/${repo}/branches?per_page=${per_page}&page=${page}`);
      return JSON.stringify(
        data.map((b: any) => ({
          name: b.name,
          sha: b.commit?.sha?.slice(0, 7),
          protected: b.protected,
        })),
        null,
        2,
      );
    }

    case 'get_file_content': {
      const { owner, repo, path, ref } = args;
      let url = `/repos/${owner}/${repo}/contents/${path}`;
      if (ref) url += `?ref=${ref}`;
      const data = await githubRequest(url);
      if (data.content) {
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        return content;
      }
      return JSON.stringify(data, null, 2);
    }

    case 'search_code': {
      const { q, per_page = 30, page = 1 } = args;
      const data = await githubRequest(`/search/code?q=${encodeURIComponent(q)}&per_page=${per_page}&page=${page}`);
      return JSON.stringify(
        {
          total_count: data.total_count,
          items: data.items?.map((i: any) => ({
            name: i.name,
            path: i.path,
            repository: i.repository?.full_name,
            html_url: i.html_url,
          })),
        },
        null,
        2,
      );
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
