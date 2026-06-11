# Skill: Boas Práticas e Performance para IA no MouseAI

## Descrição

Este skill documenta práticas para melhorar a performance e qualidade das respostas da IA ao trabalhar no projeto MouseAI.

## Princípios Gerais

### 1. Seja Específico nos Prompts

**Ruim:**
```
Analise o código.
```

**Bom:**
```
Analise o repositório https://github.com/usuario/projeto.
Foque em: arquitetura, tecnologias, dependências, como rodar localmente.
Se encontrar arquivos de configuração (package.json, Cargo.toml, go.mod), leia-os.
```

### 2. Use o MCP Correto para Cada Tarefa

| Tarefa | Ferramenta |
|---|---|
| Ler repositório GitHub | GitHub MCP (`get_file_content`, `list_repos`) |
| Consultar banco de dados | PostgreSQL MCP (`pg_execute_query`) |
| Executar código Python | Code Interpreter MCP (`execute_python`) |
| Gerar PDF com tipografia | Code Interpreter MCP (`generate_pdf`) |
| Buscar na web | SearxNG (via browser.search) |

### 3. Context Window — Use com Sabedoria

- **Perguntas específicas**: forneça apenas o contexto necessário
- **Análises completas**: use o GitHub MCP para buscar arquivos relevantes um a um
- **Contexto longo**: se o contexto ficar muito grande, peça resumos parciais

### 4. Iteração — Não Tente Fazer Tudo de Uma Vez

**Padrão recomendado:**
1. Descubra a estrutura geral
2. Leia os arquivos mais importantes
3. Aprofunde em áreas específicas
4. Synthesize e entregue o resultado

## Performance de Código — Boas Práticas

### TypeScript / React

```typescript
// ✅ Use types ao invés de interfaces para unions
type Status = 'idle' | 'loading' | 'success' | 'error';

// ✅ Use const assertions para literais
const ACTIONS = ['create', 'update', 'delete'] as const;
type Action = (typeof ACTIONS)[number];

// ✅ Evite any — use unknown e faça type narrowing
function parseJSON(json: string): unknown {
  return JSON.parse(json);
}

// ✅ Use nullish coalescing ao invés de || para valores falsy
const value = input ?? defaultValue;

// ✅ Componentes memoizados só quando necessário
const ExpensiveComponent = React.memo(
  ({ data }: { data: DataType }) => <div>{data.name}</div>,
  (prev, next) => prev.data.id === next.data.id
);
```

### Python (Code Interpreter)

```python
# ✅ Use list comprehension ao invés de loops
squares = [x**2 for x in range(1000)]

# ✅ Use numpy para operações vetoriais
import numpy as np
result = np.dot(matrix_a, matrix_b)

# ✅ Lazy evaluation com generators para grandes datasets
def process_large_file(filepath):
    with open(filepath) as f:
        for line in f:  # não carrega tudo em memória
            yield parse_line(line)

# ✅ Use dataclasses para estruturas de dados
from dataclasses import dataclass
@dataclass
class Result:
    name: str
    score: float
    tags: list[str]
```

## Database Queries (PostgreSQL MCP)

### Boas Práticas

```sql
-- ✅ Use EXPLAIN ANALYZE para verificar performance
EXPLAIN ANALYZE
SELECT * FROM messages
WHERE topic_id = $1
ORDER BY created_at DESC
LIMIT 50;

-- ✅ Evite SELECT * — specify columns
SELECT id, content, created_at, user_id
FROM messages
WHERE topic_id = $1;

-- ✅ Use índices — o ParadeDB suporta full-text search
-- Verifique se a tabela tem índice na coluna usada no WHERE
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'messages';

-- ✅ Paginação para grandes resultados
SELECT id, content, created_at
FROM messages
WHERE topic_id = $1
ORDER BY created_at DESC
LIMIT 50 OFFSET 100;
```

## PDF Generation (Code Interpreter MCP)

### Boas Práticas

```python
# ✅ Use Markdown para conteúdo simples — é convertido automaticamente
html_content = """
# Relatório de Análise

## Introdução
Este é o conteúdo do relatório...

## Conclusão
Resumo das descobertas.
"""

# ✅ Para PDFs profissionais, use HTML com CSS inline
html_professional = """
<div style="font-family: 'EB Garamond', serif; font-size: 11pt; color: #333;">
  <h1 style="font-size: 24pt; border-bottom: 1px solid #ccc; padding-bottom: 10px;">
    Título do Documento
  </h1>
  <p style="text-align: justify; line-height: 1.6;">
    Conteúdo do parágrafo...
  </p>
</div>
"""

# ✅ Margens adequadas para impressão
# A4: 2.5cm de margem é o padrão editorial
```

## Prompts Otimizados para o Agente

### Para análise de código:

```
Você tem acesso a:
- GitHub MCP: para ler repositórios (get_file_content, list_repos, search_code)
- PostgreSQL MCP: para consultar o banco de dados
- Code Interpreter: para executar Python e gerar PDFs

Analise o repositório [URL] seguindo esta ordem:
1. Leia o README.md para entender o projeto
2. Leia package.json (ou equivalente) para ver dependências
3. Identifique a estrutura de pastas
4. Leia os arquivos de entrada (main, index, app)
5. Analise as funcionalidades principais

Responda com:
- Visão geral do projeto
- Stack tecnológica
- Estrutura de arquivos
- Pontos importantes do código
- Como rodar localmente
```

### Para tarefas de refatoração:

```
Sua tarefa é refatorar [descrição específica].

Antes de fazer qualquer mudança:
1. Leia o código atual
2. Identifique todos os pontos de uso
3. Planeje a refatoração
4. Explique o plano antes de implementar

Mantenha:
- Compatibilidade com a API existente
- Tipos TypeScript corretos
- Testes existentes passando
```

### Para debugging:

```
Encontre e corrija o bug no arquivo [caminho].

Contexto:
- O que deveria acontecer: [descrição]
- O que está acontecendo: [descrição]
- Como reproduzir: [passos]

Use search_code para encontrar padrões similares no código.
Verifique tipos e edge cases.
```

## Configurações de Performance

### MCP Tool Timeout

O timeout padrão para chamadas de ferramenta é 60 segundos. Para operações longas:

```bash
# No .env da VPS
MCP_TOOL_TIMEOUT=120000  # 2 minutos
```

### Code Interpreter

```python
# Para operações que levam mais tempo
timeout = 300  # 5 minutos para operações pesadas
```

### Redis Cache

O Redis está configurado com `maxmemory 256mb` e política `allkeys-lru` (menos usado é removido primeiro). Isso é adequado para sessões de chat, mas para cache de longo prazo, considere aumentar.

##anti-Patterns a Evitar

1. **Não leia todos os arquivos de uma vez** — use busca específica
2. **Não faça queries SQL sem WHERE** — risco de full table scan
3. **Não use `any` em TypeScript** — prefira `unknown` + type narrowing
4. **Não gere PDFs com HTML complexo demais** — pode falhar no WeasyPrint
5. **Não acumule contexto desnecessário** — seja específico no que pede
