# Skill: GitHub MCP — Como Ler Repositórios no LobeChat

## Descrição

Este skill ensina como usar o MCP GitHub do MouseAI para analisar repositórios do GitHub diretamente no chat. O MCP é configurado na porta **3100** e usa Bearer Token (GitHub Personal Access Token).

## Pré-requisitos

1. **SSH port forwarding** configurado (veja skill `vps-port-forwarding`):
   ```bash
   ssh -L 3100:localhost:3100 usuario@IP_DA_VPS
   ```
2. **GitHub MCP configurado** no LobeChat (veja skill `mcp-config`)
3. **GitHub Token** com permissões `repo` (para ler repos privados)

## Ferramentas Disponíveis

| Ferramenta | O que faz | Parâmetros |
|---|---|---|
| `list_repos` | Lista repositórios de um usuário/org | `owner`, `type`, `per_page`, `page` |
| `get_issues` | Lista issues de um repositório | `owner`, `repo`, `state`, `per_page`, `page` |
| `get_prs` | Lista pull requests | `owner`, `repo`, `state`, `per_page`, `page` |
| `get_commits` | Lista commits | `owner`, `repo`, `sha`, `per_page`, `page` |
| `get_branches` | Lista branches | `owner`, `repo`, `per_page`, `page` |
| `get_file_content` | Lê conteúdo de um arquivo | `owner`, `repo`, `path`, `ref` |
| `search_code` | Busca código em repositórios | `q` (sintaxe GitHub code search), `per_page`, `page` |
| `create_issue` | Cria uma issue | `owner`, `repo`, `title`, `body`, `labels` |
| `create_pull_request` | Cria um PR | `owner`, `repo`, `title`, `body`, `head`, `base` |

## Como Analisar um Repositório

### Passo 1 — Liste os repositórios do usuário

Diga no chat:
```
Liste os repositórios do usuário: seu-usuario-github
```

O MCP vai chamar `list_repos` e retornar os repositórios.

### Passo 2 — Obtenha a estrutura do projeto

Depois de identificar o repositório, peça para ler os arquivos principais:

```
Leia o arquivo package.json do repositório: usuario/repositorio
Leia o arquivo README.md do repositório: usuario/repositorio
Liste os branches do repositório: usuario/repositorio
```

### Passo 3 — Analise o código-fonte

Para arquivos específicos:

```
Leia o arquivo src/index.ts do repositório: usuario/repositorio
Leia o arquivo src/main.py do repositório: usuario/repositorio
```

Para pastas, leia o arquivo `dir` ou `.gitignore` para entender a estrutura:

```
Leia o arquivo .gitignore do repositório: usuario/repositorio
```

### Passo 4 — Use busca de código para encontrar funcionalidades

```
Busque código que contém "function fetchData" no repositório: usuario/repositorio
Busque código que contém "class Database" no repositório: usuario/repositorio
```

Sintaxe de busca avançada:
- `language:python` — filtra por linguagem
- `repo:usuario/repositorio` — busca em repositório específico
- `path:src/` — busca em diretório específico

### Passo 5 — Analise histórico e issues

```
Liste os últimos 10 commits do repositório: usuario/repositorio
Liste as issues abertas do repositório: usuario/repositorio
Liste os PRs abertos do repositório: usuario/repositorio
```

## Prompts Prontos para Análise de Repositório

### Análise completa (padrão de uso):

```
Você tem acesso a um MCP GitHub. Analise o repositório https://github.com/usuario/repositorio e me dê:

1. Visão geral do projeto (o que faz, tecnologias)
2. Estrutura de pastas principal
3. Arquivos mais importantes (package.json, README, entry points)
4. Dependências principais
5. Como rodar o projeto localmente
6. Possíveis áreas de melhoria ou dívida técnica

Se precisar ler arquivos específicos, use a ferramenta get_file_content.
Se precisar buscar código, use a ferramenta search_code.
```

### Análise focada em código:

```
Analise o código-fonte do repositório https://github.com/usuario/repositorio.

Foque em:
- Arquitetura e padrões de projeto
- Funções principais e它们的 propósito
- Fluxo de dados
- Pontos de integração com APIs externas

Use get_file_content para ler os arquivos e search_code para buscar padrões.
```

### Auditoria de segurança:

```
Faça uma auditoria de segurança no repositório https://github.com/usuario/repositorio.

Verifique:
- Credenciais hardcoded (use search_code para buscar "api_key", "password", "secret")
- Vulnerabilidades conhecidas em dependências
- Permissões excessivas em arquivos
- Variáveis de ambiente expostas
- Injeção de SQL (busque "execute", "query", "raw")
```

## Dicas de Uso

- **Repos públicos**: não precisa de token com permissões `repo`
- **Repos privados**: precisa de token com escopo `repo` (leitura + escrita se for criar issues/PRs)
- **Arquivos grandes**: o GitHub API retorna arquivos até1MB. Para arquivos maiores, use a busca de código
- **Branches**: use `ref` no `get_file_content` para especificar branch (`main`, `develop`, etc.)
- **Rate limiting**: a API do GitHub tem limite de 5000 requests/hora para tokens autenticados

## Troubleshooting

- **"API error (401)"**: token inválido ou sem permissões suficientes
- **"API error (404)"**: repositório não existe ou não é acessível com o token atual
- **"API error (403)"**: rate limit atingido ou token sem escopo `repo`
- **Arquivo retorna base64**: use `get_file_content` que já faz o decode automaticamente
