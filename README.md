# MouseAI

**MouseAI** é uma plataforma de chat com IA, baseada no [LobeChat](https://github.com/lobehub/lobe-chat), com suporte a múltiplos provedores de IA, ferramentas MCP, interpretador de código, e integração com GitLab UFAL.

## Funcionalidades

- **Multi-Provider AI**: Suporte a Anthropic (Claude), DeepSeek, OpenAI e outros
- **MCP Servers**: Integração com GitHub, PostgreSQL e ferramentas customizadas
- **Code Interpreter**: Execução de código Python com renderização de PDFs
- **GitLab UFAL**: Integração direta com o GitLab da UFAL
- **Web Search**: Busca na web via Serper e scraping via Firecrawl
- **Branding Customizado**: Interface adaptada para MouseAI com suporte a pt-BR

## Quick Start

### 1. Configuração

```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Edite o .env com suas credenciais
nano .env
```

### 2. Iniciar com Docker Compose

```bash
# Iniciar todos os serviços
docker compose up -d

# Ver logs
docker compose logs -f

# Parar serviços
docker compose down
```

### 3. Acessar

- **MouseAI**: http://localhost:3210
- **MinIO Console**: http://localhost:9001
- **SearXNG** (busca): http://localhost:8080

## Estrutura do Projeto

```
mouseai/
├── custom/                    # Código customizado
│   ├── mcp/                    # MCP Servers customizados
│   │   ├── github/            # GitHub MCP adapter
│   │   └── postgres/          # PostgreSQL readonly MCP
│   ├── actions/               # Actions customizadas
│   │   └── gitlab-ufal/      # GitLab UFAL integration
│   └── code-interpreter/      # Code interpreter service
├── docker/                    # Configurações Docker
│   ├── scripts/               # Scripts de inicialização
│   └── searxng-settings.yml  # Configuração SearXNG
├── data/                     # Dados persistentes
│   ├── postgres/              # Banco PostgreSQL
│   ├── redis/                # Cache Redis
│   ├── minio/                # Object storage
│   └── uploads/              # Uploads de arquivos
├── logs/                     # Logs da aplicação
├── docker-compose.yml        # Orquestração de serviços
└── .env.example              # Exemplo de variáveis de ambiente
```

## Provedores de IA

### Anthropic (Claude)

```env
ANTHROPIC_API_KEY=your_key
ANTHROPIC_PROXY_URL=https://api.aicortex.vip
```

### DeepSeek

```env
DEEPSEEK_API_KEY=your_key
DEEPSEEK_PROXY_URL=https://api.deepseek.com/v1
```

## MCP Servers

### GitHub

Ferramentas disponíveis:
- `list_repos` - Lista repositórios do usuário
- `get_issues` - Lista issues de um repositório
- `get_prs` - Lista pull requests
- `create_issue` - Cria uma nova issue
- `create_pr` - Cria um pull request
- `get_commits` - Lista commits
- `get_branches` - Lista branches
- `get_file_content` - Lê conteúdo de arquivo
- `search_code` - Busca código

### PostgreSQL (Readonly)

Executa queries SELECT em um banco de dados readonly.

## Code Interpreter

Executa código Python em sandbox isolado com:
- Pacotes pré-instalados (numpy, pandas, matplotlib, etc.)
- Renderização de PDFs com WeasyPrint
- Fontes tipográficas editoriais (EB Garamond, Cormorant Garamond, Cinzel)
- Isolamento de execução por sessão

## GitLab UFAL

Integração direta com o GitLab institucional:

- `list_projects` - Lista projetos
- `get_repo` - Detalhes de repositório
- `list_branches` - Lista branches
- `list_commits` - Lista commits
- `get_issues` / `create_issue` - Issues
- `get_MRs` / `create_MR` - Merge requests
- `list_pipelines` - Pipelines CI/CD
- `list_members` - Membros do projeto

## Variáveis de Ambiente

Consulte `.env.example` para todas as variáveis disponíveis.

### Obrigatórias

- `KEY_VAULTS_SECRET` - Chave para criptografia (gere com `openssl rand -base64 32`)
- `AUTH_SECRET` - Chave de autenticação (gere com `openssl rand -base64 32`)
- `POSTGRES_PASSWORD` - Senha do PostgreSQL
- `ANTHROPIC_API_KEY` - Chave da API Anthropic
- `DEEPSEEK_API_KEY` - Chave da API DeepSeek

## Desenvolvimento

```bash
# Clonar o repositório
git clone https://github.com/irineumarques/lobe-chat.git
cd lobe-chat

# Instalar dependências
bun install

# Desenvolvimento SPA (frontend)
bun run dev:spa

# Desenvolvimento full-stack
bun run dev
```

## Documentação

- [LobeChat Docs](https://lobehub.com/docs)
- [MCP Protocol](https://modelcontextprotocol.io)
- [SearXNG](https://docs.searxng.org)

## License

Este projeto mantém a licença do LobeChat original. Voir [LICENSE](LICENSE).
