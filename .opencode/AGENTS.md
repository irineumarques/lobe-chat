# MouseAI — Guia de Agentes

## Quando Usar Cada Skill

### Infraestrutura e Deploy
- Precisa configurar acesso remoto? → `skill: vps-port-forwarding`
- Precisa configurar MCP na interface? → `skill: mcp-config`

### Desenvolvimento
- Precisa entender o projeto? → `skill: project-overview`
- Precisa analisar um repo GitHub? → `skill: github-mcp`
- Precisa otimizar prompts ou performance? → `skill: ai-performance`

## Fluxo de Trabalho Recomendado

1. **Leia o contexto** — sempre use `project-overview` antes de edições grandes
2. **Planeje com TodoWrite** — quebre tarefas em steps menores
3. **Verifique antes de commitar** — rode `docker compose build <serviço>` para validar
4. **Teste healthchecks** — `curl http://localhost:PORT/health` após mudanças em MCPs

## Padrões de MCP Server

Todos os MCPs seguem o mesmo padrão. Para criar um novo:

```typescript
// src/index.ts — Servidor HTTP
import { createServer } from 'node:http';
import { toolDefinitions, handleToolCall } from './tools.js';

// Endpoints obrigatórios:
// POST / → JSON-RPC 2.0 (initialize, tools/list, tools/call)
// GET /health → { status: 'ok' }
```

```typescript
// src/tools.ts — Definição das ferramentas
export const toolDefinitions = [
  {
    name: 'minha_ferramenta',
    description: 'O que faz',
    inputSchema: {
      type: 'object',
      properties: { /* params */ },
      required: ['param1'],
    },
  },
];

export async function handleToolCall(name: string, args: any): Promise<string> {
  switch (name) {
    case 'minha_ferramenta': {
      // implementação
      return JSON.stringify(resultado, null, 2);
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
```

```dockerfile
# Dockerfile padrão para MCPs Node.js
FROM node:22-alpine
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install
COPY src/ ./src/
RUN npx tsc
EXPOSE <PORTA>
CMD ["node", "dist/index.js"]
```

## Docker Compose — Adicionando Novo MCP

```yaml
mcp-novo:
  build:
    context: ./custom/mcp/novo
    dockerfile: Dockerfile
  container_name: mouseai-mcp-novo
  ports:
    - '3105:3105'  # Próxima porta disponível
  environment:
    - PORT=3105
    - API_KEY=${NOVO_API_KEY}
  healthcheck:
    test: ['CMD', 'wget', '--spider', '-q', 'http://localhost:3105/health']
    interval: 30s
    timeout: 5s
    retries: 3
    start_period: 10s
  restart: always
  networks:
    - mouseai-network
```

## Notas

- A próxima porta MCP disponível é **3105** (3100-3104 já usadas)
- Todos os MCPs devem estar na rede `mouseai-network`
- Prefixo de container: `mouseai-mcp-<nome>`
- Healthcheck obrigatório em `GET /health`
