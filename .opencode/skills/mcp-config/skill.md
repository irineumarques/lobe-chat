# Skill: Configuração de MCPs no LobeChat (MouseAI)

## Visão Geral

O MouseAI tem4 MCP servers customizados rodando como containers Docker. Todos se comunicam com o LobeChat via protocolo **StreamableHTTP** (MCP over HTTP).

## MCPs Disponíveis

| Nome | Container | Porta | Descrição | Autenticação |
|---|---|---|---|---|
| **GitHub** | mouseai-mcp-github | 3100 | Repositórios, issues, PRs, commits, busca de código | Bearer Token |
| **PostgreSQL Readonly** | mouseai-mcp-postgres | 3101 | Consultas SELECT no banco de dados | Nenhuma |
| **GitLab UFAL** | mouseai-mcp-gitlab | 3102 | Projetos, MRs, issues, pipelines do GitLab da UFAL | Bearer Token |
| **Code Interpreter** | mouseai-mcp-code-interpreter | 3104 | Execução Python, geração de PDFs com tipografia editorial | Nenhuma |

## Como Configurar na Interface

### Passo 1 — Acesse as Configurações

1. Abra `http://localhost:3210` (ou URL da VPS)
2. Clique no **avatar** (canto superior direito)
3. Vá em **Configurações** (Settings)

### Passo 2 — Adicione o Custom Connector

1. No menu lateral de Configurações, procure **Plugins** ou **MCP**
2. Clique em **"+" (Adicionar)** ou **"Add Custom Connector"**
3. Preencha os campos para cada MCP (veja abaixo)

### Passo 3 — Configure cada MCP

#### GitHub MCP (porta 3100)

| Campo | Valor |
|---|---|
| **Tipo** | `http` |
| **URL** | `http://localhost:3100` |
| **Autenticação** | `Bearer Token` |
| **Token** | Seu `GITHUB_TOKEN` (do `.env` da VPS) |

#### PostgreSQL Readonly MCP (porta 3101)

| Campo | Valor |
|---|---|
| **Tipo** | `http` |
| **URL** | `http://localhost:3101` |
| **Autenticação** | `none` |

#### GitLab UFAL MCP (porta 3102)

| Campo | Valor |
|---|---|
| **Tipo** | `http` |
| **URL** | `http://localhost:3102` |
| **Autenticação** | `Bearer Token` |
| **Token** | Seu `GITLAB_UFAL_TOKEN` (do `.env` da VPS) |

#### Code Interpreter MCP (porta 3104)

| Campo | Valor |
|---|---|
| **Tipo** | `http` |
| **URL** | `http://localhost:3104` |
| **Autenticação** | `none` |

### Passo 4 — Teste e Salve

- Clique em **"Testar Conexão"** (Test Connection)
- Se aparecer ✓ verde, está funcionando
- Salve a configuração

### Passo 5 — Habilite no Agente

1. Crie ou edite um **Agente** (assistente)
2. Vá nas **configurações do agente** (ícone de engrenagem)
3. Na seção **Plugins / MCP**, ative os MCPs configurados
4. Salve

## Ferramentas Disponíveis por MCP

### GitHub MCP

- `list_repos` — Lista repositórios do usuário
- `get_issues` — Lista issues de um repositório
- `get_prs` — Lista pull requests
- `create_issue` — Cria uma issue
- `create_pr` — Cria um pull request
- `get_commits` — Lista commits de um repositório
- `get_branches` — Lista branches
- `get_file_content` — Lê conteúdo de um arquivo
- `search_code` — Busca código em repositórios

### PostgreSQL Readonly MCP

- `pg_list_tables` — Lista todas as tabelas
- `pg_describe_table` — Descreve a estrutura de uma tabela
- `pg_execute_query` — Executa uma query SELECT
- `pg_get_schema` — Retorna o schema completo do banco

### GitLab UFAL MCP

- `list_projects` — Lista projetos
- `get_repo` — Obtém detalhes de um repositório
- `list_branches` — Lista branches
- `list_commits` — Lista commits
- `get_issues` — Lista issues
- `create_issue` — Cria issue
- `get_MRs` — Lista merge requests
- `create_MR` — Cria merge request
- `list_pipelines` — Lista pipelines CI/CD
- `list_members` — Lista membros do projeto
- `get_file_content` — Lê arquivo do repositório
- `create_file` — Cria arquivo no repositório

### Code Interpreter MCP

- `execute_python` — Executa código Python
- `generate_pdf` — Gera PDF com tipografia editorial
- `list_fonts` — Lista fontes disponíveis
- `execute_stream` — Executa código com output streaming

## Via Linha de Comando (VPS)

Para verificar se os MCPs estão rodando:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}" | grep mouseai-
```

Para reiniciar um MCP específico:

```bash
docker compose restart github-mcp
docker compose restart postgres-mcp
docker compose restart gitlab-ufal-mcp
docker compose restart code-interpreter-mcp
```

Para ver logs de um MCP:

```bash
docker compose logs -f github-mcp
docker compose logs -f code-interpreter-mcp
```

## Configuração Programática (`.env`)

Os MCPs também podem ser configurados via variáveis de ambiente no `.env` da VPS:

```bash
# GitHub MCP
GITHUB_MCP_URL=http://localhost:3100
GITHUB_TOKEN=ghp_seu_token_aqui

# PostgreSQL MCP
POSTGRES_MCP_URL=http://localhost:3101
POSTGRES_READONLY_URL=postgresql://postgres:senha@localhost:5432/mouseai

# GitLab UFAL MCP
GITLAB_MCP_URL=http://localhost:3102
GITLAB_UFAL_TOKEN=seu_token_gitlab

# Code Interpreter MCP
CODE_INTERPRETER_MCP_URL=http://localhost:3104
CODE_INTERPRETER_API_KEY=iris-code-5c6f96e6fd08
```

## Estrutura de Arquivos

```
custom/
├── mcp/
│   ├── github/          # GitHub MCP server
│   │   ├── Dockerfile
│   │   └── src/index.ts
│   └── postgres/         # PostgreSQL MCP server
│       ├── Dockerfile
│       └── src/
│           ├── index.ts
│           └── tools.ts
├── actions/
│   └── gitlab-ufal/     # GitLab UFAL MCP server
│       ├── Dockerfile
│       └── src/
│           ├── index.ts
│           └── tools.ts
└── code-interpreter-mcp/ # Code Interpreter MCP server
    ├── Dockerfile
    ├── package.json
    └── src/
        ├── index.ts
        └── tools.ts
```

## Troubleshooting

- **MCP não conecta**: verifique se o container está rodando (`docker ps`)
- **Token inválido**: o token expirou ou não tem permissões suficientes
- **Timeout**: o `MCP_TOOL_TIMEOUT` está muito baixo (padrão: 60s)
- **Ferramentas não aparecem**: recarregue a página ou reconfigura o MCP no agente
