# Skill: VPS Port Forwarding para LobeChat (MouseAI)

## Descrição

Este skill documenta como expor os containers do MouseAI (LobeChat customizado) rodando em uma VPS para acesso local via SSH port forwarding.

## Arquitetura

O MouseAI roda em uma VPS com os seguintes serviços containerizados:

| Serviço | Container | Porta | Descrição |
|---|---|---|---|
| LobeChat | mouseai-lobe | 3210 | Aplicação principal |
| PostgreSQL | mouseai-postgres | 5432 | Banco de dados (ParadeDB) |
| Redis | mouseai-redis | 6379 | Cache e sessões |
| MinIO API | mouseai-minio | 9000 | Armazenamento de arquivos (S3-compatible) |
| MinIO Console | mouseai-minio | 9001 | Painel de administração MinIO |
| GitHub MCP | mouseai-mcp-github | 3100 | MCP para GitHub |
| PostgreSQL MCP | mouseai-mcp-postgres | 3101 | MCP para consultas SQL |
| GitLab MCP | mouseai-mcp-gitlab | 3102 | MCP para GitLab UFAL |
| Code Interpreter MCP | mouseai-mcp-code-interpreter | 3104 | MCP para execução Python/PDF |
| Code Interpreter (base) | mouseai-code-interpreter | 8080 | Serviço base do interpretador |
| Web Search (SearxNG) | mouseai-web-search | 8081 | Motor de busca privado |

## Comando de Port Forwarding

### Mínimo (só LobeChat + dependências core)

```bash
ssh -L 3210:localhost:3210 \
    -L 9000:localhost:9000 \
    usuario@IP_DA_VPS
```

### Completo (todos os serviços)

```bash
ssh -L 3210:localhost:3210 \
    -L 5432:localhost:5432 \
    -L 6379:localhost:6379 \
    -L 9000:localhost:9000 \
    -L 9001:localhost:9001 \
    -L 3100:localhost:3100 \
    -L 3101:localhost:3101 \
    -L 3102:localhost:3102 \
    -L 3104:localhost:3104 \
    -L 8080:localhost:8080 \
    -L 8081:localhost:8081 \
    usuario@IP_DA_VPS
```

### Com flag para manter em background

```bash
ssh -fN \
    -L 3210:localhost:3210 \
    -L 5432:localhost:5432 \
    -L 6379:localhost:6379 \
    -L 9000:localhost:9000 \
    -L 9001:localhost:9001 \
    -L 3100:localhost:3100 \
    -L 3101:localhost:3101 \
    -L 3102:localhost:3102 \
    -L 3104:localhost:3104 \
    -L 8080:localhost:8080 \
    -L 8081:localhost:8081 \
    usuario@IP_DA_VPS
```

- `-f`: manda o SSH para background
- `-N`: não executa comando remoto (só forwarding)

## Após conectar

1. Abra `http://localhost:3210` no navegador
2. O LobeChat vai se comunicar com MinIO via `localhost:9000` para upload de arquivos
3. Os MCPs ficam disponíveis nas portas 3100-3104

## Troubleshooting

- **Porta já em uso**: mate processos antigos com `lsof -ti:PORTA | xargs kill`
- **Containers caídos na VPS**: `cd /home/irineu/apps/lobe-chat && docker compose up -d`
- **Verificar saúde**: `docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"`

## Variáveis de Ambiente Relevantes

O LobeChat usa `S3_PUBLIC_DOMAIN` para montar URLs de arquivos no frontend. Se acessar via localhost, essa variável precisa ser `http://localhost:9000`. Na VPS, está configurada com o IP público.
