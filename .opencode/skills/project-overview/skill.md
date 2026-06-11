# Skill: Overview do Projeto MouseAI

## Descrição

Visão geral do projeto customizado MouseAI — um LobeChat customizado com MCPs, infraestrutura self-hosted e integrações específicas.

## O que é o MouseAI

MouseAI é uma instância customizada do [LobeChat](https://github.com/lobehub/lobe-chat) com:

- **4 MCP servers customizados** (GitHub, PostgreSQL, GitLab UFAL, Code Interpreter)
- **Infraestrutura self-hosted** (PostgreSQL, Redis, MinIO)
- **Serviços auxiliares** (SearxNG, Web Search, Code Interpreter)
- **Integração com GitLab da UFAL** (Universidade Federal de Alagoas)

## Estrutura do Projeto

```
lobe-chat/ # Raiz do repositório
├── apps/
│   ├── desktop/                  # App Electron desktop
│   ├── cli/                      # CLI do LobeHub
│   └── server/                   # Backend Next.js (TRPC, API routes)
├── packages/
│   ├── database/                # Schemas Drizzle, modelos, repositórios
│   ├── agent-runtime/           # Runtime de agentes
│   └── types/                   # Tipos TypeScript compartilhados
├── src/
│   ├── app/                     # App Router (backend API + auth)
│   ├── routes/                  # SPA page components (React Router)
│   ├── features/                # Componentes de negócio por domínio
│   ├── store/                   # Zustand stores
│   ├── services/                # Serviços client-side
│   └── spa/                     # Entry points e router config
├── custom/                      # ⭐ Customizações MouseAI
│   ├── mcp/
│   │   ├── github/             # GitHub MCP server (porta 3100)
│   │   └── postgres/           # PostgreSQL readonly MCP (porta 3101)
│   ├── actions/
│   │   └── gitlab-ufal/       # GitLab UFAL MCP server (porta 3102)
│   ├── code-interpreter/       # Serviço base Python + PDF (porta 8080)
│   ├── code-interpreter-mcp/   # MCP wrapper do interpretador (porta 3104)
│   └── web-search/             # Serviço de busca web (porta 3103)
├── docker-compose.yml          # ⭐ Compose principal (todos os serviços)
├── docker-compose.mcp.yml     # Compose alternativo (só MCPs)
└── .env                        # Variáveis de ambiente (NÃO commitear)
```

## Arquitetura de Containers

```
┌─────────────────────────────────────────────────────────┐
│                  mouseai-network (bridge)                │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  mouseai-lobe │ │   postgresql  │  │    redis     │ │
│  │ (LobeChat)  │  │ (ParadeDB)   │  │  (cache)     │ │
│  │   porta 3210  │  │   porta 5432  │  │  porta 6379  │ │
│  └───────┬───────┘  └──────────────┘  └──────────────┘ │
│          │                                              │
│  ┌───────┴────────┐  ┌──────────────┐  ┌────────────┐ │
│  │     minio       │  │ github-mcp  │  │postgres-mcp│ │
│  │  (S3 storage)   │  │ porta 3100  │  │ porta 3101 │ │
│  │ 9000 / 9001    │  └──────────────┘  └────────────┘ │
│  └───────┬────────┘  ┌──────────────┐  ┌────────────┐ │
│          │            │gitlab-ufal-mcp│  │  ci-mcp    │ │
│  ┌───────┴────────┐  │  porta 3102  │  │ porta 3104 │ │
│  │code-interpreter│  └──────────────┘  └────────────┘ │
│  │   porta 8080   │  ┌──────────────┐  ┌────────────┐ │
│  └────────────────┘  │ web-search   │  │  searxng   │ │
│                       │  porta 3103  │  │  porta 8081│ │
│                       └──────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Variáveis de Ambiente Principais

### Core
```bash
NODE_ENV=production
KEY_VAULTS_SECRET=...       # Segredo para criptografia
AUTH_SECRET=...             # Segredo para autenticação
APP_URL=http://localhost:3210  # URL pública da aplicação
```

### Banco de Dados
```bash
DATABASE_URL=postgresql://postgres:senha@postgresql:5432/mouseai
POSTGRES_USER=postgres
POSTGRES_PASSWORD=...
LOBE_DB_NAME=mouseai
```

### S3 / MinIO
```bash
S3_ENDPOINT=http://minio:9000
S3_PUBLIC_DOMAIN=http://localhost:9000  # ou IP público da VPS
S3_BUCKET=mouseai
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_ENABLE_PATH_STYLE=1
S3_SET_ACL=0
```

### Redis
```bash
REDIS_URL=redis://redis:6379
REDIS_PREFIX=mouseai
REDIS_TLS=0
```

### MCPs
```bash
GITHUB_TOKEN=ghp_...
GITHUB_MCP_URL=http://localhost:3100

POSTGRES_MCP_URL=http://localhost:3101
POSTGRES_READONLY_URL=postgresql://postgres:senha@localhost:5432/mouseai

GITLAB_UFAL_TOKEN=...
GITLAB_UFAL_BASE_URL=https://gitlab.ufal.br/api/v4
GITLAB_MCP_URL=http://localhost:3102

CODE_INTERPRETER_API_KEY=iris-code-5c6f96e6fd08
CODE_INTERPRETER_API_URL=http://code-interpreter:8080
CODE_INTERPRETER_MCP_URL=http://localhost:3104
```

### Providers de IA
```bash
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_PROXY_URL=https://api.aicortex.vip
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_PROXY_URL=https://api.deepseek.com/v1
```

## Comandos Úteis

### Gerenciar Containers
```bash
# Ver status
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Iniciar todos
docker compose up -d

# Reiniciar um serviço específico
docker compose restart github-mcp

# Ver logs
docker compose logs -f lobe
docker compose logs -f code-interpreter

# Parar todos
docker compose down
```

### Acessar Serviços
```bash
# PostgreSQL
psql postgresql://postgres:senha@localhost:5432/mouseai

# Redis
redis-cli -h localhost -p 6379

# MinIO Console
# http://localhost:9001 (usuário: GKminioadmin0000)
```

### Build de MCPs Customizados
```bash
# Rebuild de um MCP específico
docker compose build github-mcp
docker compose up -d github-mcp

# Rebuild de todos os MCPs
docker compose build --parallel
docker compose up -d
```

## Como Adicionar um Novo MCP

1. **Criar o diretório** em `custom/mcp/seu-mcp/`
2. **Criar o Dockerfile** com Node.js + TypeScript
3. **Implementar o servidor MCP** com `@modelcontextprotocol/sdk`
4. **Adicionar ao docker-compose.yml** com porta, healthcheck e dependências
5. **Configurar no LobeChat UI** (Settings → Plugins → Add Custom Connector)
6. **Documentar no skill `mcp-config`**

Exemplo de estrutura MCP minimal:

```
custom/mcp/seu-mcp/
├── Dockerfile
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts       # Server HTTP + protocolo MCP
    └── tools.ts      # Definições de ferramentas
```

## Fluxo de Dados

```
Usuário (navegador)
    │
    ▼
LobeChat (porta 3210)
    │
    ├──► PostgreSQL (porta 5432) — dados persistentes
    ├──► Redis (porta 6379) — sessões e cache
    ├──► MinIO (porta 9000) — uploads de arquivos
    │
    └──► MCPs (portas 3100-3104)
              │
              ├──► GitHub API
              ├──► PostgreSQL (readonly)
              ├──► GitLab UFAL API
              └──► Code Interpreter (Python/PDF)
```

## Pasta `data/` (não commitear)

```
data/
├── postgres/        # Dados do ParadeDB (gitkeep apenas)
├── redis/          # Dados do Redis (AOF + RDB)
├── minio/          # Buckets MinIO
└── uploads/        # Arquivos uploadados pelos usuários
```

Todos esses diretórios estão no `.gitignore` e devem ser criados manualmente na VPS.

## Onde Encontrar Mais Documentação

- **Skills disponíveis**: `.opencode/skills/`
  - `vps-port-forwarding/` — como expor a VPS
  - `mcp-config/` — como configurar MCPs
  - `github-mcp/` — como usar o GitHub MCP
  - `ai-performance/` — boas práticas e performance
- **docker-compose.yml** — documentação inline de cada serviço
- **custom/mcp-servers.config.ts** — configuração centralizada dos MCPs
