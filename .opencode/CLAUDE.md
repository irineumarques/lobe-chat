# MouseAI — Instruções para Agentes de IA

## Sobre o Projeto

MouseAI é uma instância customizada do LobeChat self-hosted com infraestrutura Docker completa.

- **Stack principal:** Next.js (App Router), TypeScript, tRPC, Drizzle ORM, PostgreSQL (ParadeDB), Redis, MinIO
- **MCPs customizados:** GitHub (porta 3100), PostgreSQL Readonly (3101), GitLab UFAL (3102), Code Interpreter (3104)
- **Aplicação:** porta 3210
- **VPS IP:** 206.183.129.66

## Arquivos Importantes

| Caminho | O que é |
|---|---|
| `docker-compose.yml` | Todos os serviços (LobeChat, DB, Redis, MinIO, MCPs) |
| `custom/mcp-servers.config.ts` | Configuração centralizada dos MCP servers |
| `custom/mcp/github/` | GitHub MCP server (Node.js/TypeScript) |
| `custom/mcp/postgres/` | PostgreSQL MCP server |
| `custom/actions/gitlab-ufal/` | GitLab UFAL MCP server |
| `custom/code-interpreter/` | Code Interpreter (Python, FastAPI) |
| `custom/code-interpreter-mcp/` | Code Interpreter MCP wrapper (Node.js) |
| `.env` | Variáveis de ambiente (NÃO commitar) |
| `.env.example` | Template de variáveis |

## Convenções

- **Linguagem do projeto:** TypeScript (MCPs), Python (Code Interpreter)
- **Build dos MCPs:** `npx tsc` dentro de cada pasta em `custom/mcp/`
- **Docker:** todos os serviços estão na rede `mouseai-network`
- **Nomenclatura de containers:** prefixo `mouseai-` (ex: `mouseai-lobe`, `mouseai-mcp-github`)
- **Porta dos MCPs:** range 3100-3104
- **Protocolo MCP:** StreamableHTTP (JSON-RPC 2.0 sobre HTTP POST)
- **Formato de resposta MCP:** `{ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: "..." }] } }`

## Comandos Frequentes

```bash
# Subir todos os serviços
cd /home/irineu/apps/lobe-chat && docker compose up -d

# Verificar status
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep mouseai

# Logs de um serviço
docker logs mouseai-lobe --tail 50 -f
docker logs mouseai-mcp-github --tail 50 -f

# Rebuild de um MCP específico
docker compose build mcp-github && docker compose up -d mcp-github

# Rebuild de tudo
docker compose build && docker compose up -d

# Acessar banco
docker exec -it mouseai-postgres psql -U postgres -d mouseai
```

## Regras ao Editar

1. **Nunca commitar `.env`** — contém tokens e segredos
2. **Testar healthchecks** — todos os MCPs expõem `GET /health`
3. **Manter tipagem** — MCPs usam TypeScript strict
4. **Documentar tools** — cada ferramenta MCP precisa de `name`, `description`, `inputSchema`
5. **Seguir o padrão JSON-RPC 2.0** — methods: `initialize`, `tools/list`, `tools/call`
