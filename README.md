# MouseAI

**MouseAI** é uma plataforma de chat com IA, baseada no [LobeChat](https://github.com/lobehub/lobe-chat), com suporte a múltiplos provedores de IA, ferramentas MCP, interpretador de código com geração de PDFs editoriais, e integração com GitLab UFAL.

## Funcionalidades

- **Multi-Provider AI**: Suporte a Anthropic (Claude), DeepSeek, OpenAI e outros
- **MCP Servers**: Integração com GitHub, PostgreSQL readonly, GitLab UFAL e Code Interpreter
- **Code Interpreter**: Execução de código Python com renderização de PDFs usando WeasyPrint e fontes editoriais (EB Garamond, Cormorant Garamond, Cinzel)
- **GitLab UFAL**: Integração direta com o GitLab da Universidade Federal de Alagoas (12 ferramentas)
- **Web Search**: Busca na web via Serper e scraping via Firecrawl
- **Branding Customizado**: Interface adaptada para MouseAI com suporte a pt-BR
- **SSE Heartbeat**: Mantém conexões longas ativas com heartbeats de 30s para prevenir timeouts

## Quick Start

### 1. Configuração

```bash
# Clone o repositório
git clone https://github.com/irineumarques/lobe-chat.git
cd lobe-chat

# Copie o arquivo de exemplo
cp .env.example .env

# Edite o .env com suas credenciais
nano .env
```

### 2. Iniciar com Docker Compose

```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Edite o .env com suas credenciais
nano .env

# Iniciar todos os serviços
docker compose up -d

# Com MCP servers adicionais (GitHub, PostgreSQL, GitLab UFAL, Code Interpreter)
docker compose -f docker-compose.yml -f docker-compose.mcp.yml up -d

# Ver logs
docker compose logs -f

# Parar serviços
docker compose down
```

### 3. Acessar

- **MouseAI**: http://localhost:3210
- **MinIO Console**: http://localhost:9001
- **SearXNG** (busca): http://localhost:8081

## Estrutura do Projeto

```
mouseai/
├── custom/                    # Código customizado MouseAI
│   ├── mcp/                  # MCP Servers
│   │   ├── github/           # GitHub MCP (9 tools)
│   │   ├── postgres/         # PostgreSQL readonly MCP (4 tools)
│   │   └── code-interpreter-mcp/  # Code Interpreter MCP (4 tools)
│   ├── actions/              # Actions customizadas
│   │   └── gitlab-ufal/      # GitLab UFAL MCP (12 tools)
│   ├── code-interpreter/     # Code interpreter Python (FastAPI)
│   │   └── src/main.py       # Server com /execute, /generate-pdf, /generate-pdf-file
│   └── web-search/           # Serper + Firecrawl service
├── docker/                   # Configurações Docker
│   ├── scripts/             # Scripts de inicialização
│   └── searxng-settings.yml
├── scripts/                 # Scripts auxiliares (deprecated)
├── data/                     # Dados persistentes
│   ├── postgres/            # Banco PostgreSQL
│   ├── redis/                # Cache Redis
│   ├── minio/               # Object storage
│   └── uploads/             # Uploads de arquivos
├── packages/               # Pacotes LobeChat (customizados)
├── public/
│   └── logo-mouseai.svg     # Logo MouseAI
├── locales/
│   └── pt-BR/              # Traduções em Português (Brasil)
├── docker-compose.yml      # Orquestração principal
├── docker-compose.mcp.yml  # Override para MCP servers
└── .env.example            # Variáveis de ambiente
```

## Provedores de IA

### Anthropic (Claude)

```env
ANTHROPIC_API_KEY=your_key
ANTHROPIC_PROXY_URL=https://api.aicortex.vip
ANTHROPIC_CLIENT_TIMEOUT=295000
```

### DeepSeek

```env
DEEPSEEK_API_KEY=your_key
DEEPSEEK_PROXY_URL=https://api.deepseek.com/v1
```

## MCP Servers

### GitHub MCP (porta 3100)

Ferramentas: `list_repos`, `get_issues`, `get_prs`, `create_issue`, `create_pr`, `get_commits`, `get_branches`, `get_file_content`, `search_code`

### PostgreSQL Readonly MCP (porta 3101)

Ferramentas: `pg_list_tables`, `pg_describe_table`, `pg_execute_query`, `pg_get_schema`

Validação: Apenas queries SELECT, máximo 1000 linhas por query.

### GitLab UFAL MCP (porta 3102)

Ferramentas: `list_projects`, `get_repo`, `list_branches`, `list_commits`, `get_issues`, `create_issue`, `get_MRs`, `create_MR`, `list_pipelines`, `list_members`, `get_file_content`, `create_file`

### Code Interpreter MCP (porta 3104)

Ferramentas: `execute_python`, `generate_pdf`, `list_fonts`, `execute_stream`

## Code Interpreter

Executa código Python em sandbox isolado com:
- Pacotes pré-instalados (numpy, pandas, matplotlib, seaborn, etc.)
- Renderização de PDFs com WeasyPrint
- Fontes tipográficas editoriais (EB Garamond, Cormorant Garamond, Cinzel)
- Isolamento de execução por sessão
- Geração de PDFs com tipografia editorial:

```python
# Exemplo de geração de PDF via MCP
{
  "tool": "generate_pdf",
  "arguments": {
    "content": "# Meu Relatório\n\nEste é um relatório editorial...",
    "title": "Relatório 2024",
    "format": "markdown",
    "font_family": "EB Garamond"
  }
}
```

## Web Search

- **Serper**: Busca Google para consultas web
- **Firecrawl**: Scraping de páginas com conversão para markdown

## Variáveis de Ambiente

Consulte `.env.example` para todas as variáveis disponíveis.

### Obrigatórias

- `KEY_VAULTS_SECRET` - Chave para criptografia (`openssl rand -base64 32`)
- `AUTH_SECRET` - Chave de autenticação (`openssl rand -base64 32`)
- `POSTGRES_PASSWORD` - Senha do PostgreSQL
- `ANTHROPIC_API_KEY` - Chave da API Anthropic
- `DEEPSEEK_API_KEY` - Chave da API DeepSeek

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    LobeChat (MouseAI)                        │
│                   http://localhost:3210                       │
└──────┬────────────┬─────────────┬──────────────┬─────────────┘
       │            │             │              │
   ┌───▼────┐  ┌──▼────┐  ┌──▼─────────┐  ┌──▼────────────┐
   │PostgreSQL│  │ Redis │  │  MinIO S3   │  │  SearXNG       │
   │:5432    │  │:6379  │  │  :9000      │  │  :8081         │
   └─────────┘  └───────┘  └────────────┘  └───────────────┘
                      │
              ┌───────▼───────┐
              │ Code Interpreter│
              │   :8080        │
              │ (Python FastAPI)│
              └───────────────┘
       ┌────────┬────────┬──────────┐
    ┌──▼──┐┌──▼───┐┌──▼──────┐┌──▼──────────┐
    │GitHub││Postgres││GitLab UFAL││Code Interp MCP│
    │:3100││:3101  ││  :3102   ││   :3104      │
    └─────┘└───────┘└──────────┘└──────────────┘
```

## License

Este projeto mantém a licença do LobeChat original. Voir [LICENSE](LICENSE).
