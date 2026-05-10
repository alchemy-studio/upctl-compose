# upctl-compose Architecture

## System Overview

```mermaid
graph TB
    subgraph External [外部访问]
        User[用户浏览器]
    end

    subgraph Compose [upctl-compose 容器网络]
        NGX[nginx :8088]
        WEB[upctl-web<br/>Vue 3 SPA]
        AUTH[authcore :3000<br/>身份认证]
        SVC[upctl-svc :3005<br/>工单 API]
        AI[ai-agent<br/>AI 工单处理]
        GIT[gitea :3000<br/>代码托管 + CI + 工单追踪]
        DB[postgres :5432<br/>数据库]
    end

    subgraph ExternalAPI [外部 API]
        DEEPSEEK[DeepSeek API]
    end

    User --> NGX
    NGX --> WEB
    NGX --> AUTH
    NGX --> SVC
    NGX --> GIT
    SVC --> GIT
    AI --> SVC
    AI --> DEEPSEEK
    AUTH --> DB
    GIT --> DB
```

## Service Table

| Service | Description | Internal Port |
|---------|-------------|---------------|
| **nginx** | Reverse proxy (static files + API routing) | 80 → :8088 |
| **authcore** | AuthCore identity & auth service | 3000 |
| **upctl-svc** | Ticket management API (Gitea proxy + attachments) | 3005 |
| **upctl-web** | Vue 3 ticket management frontend (served by nginx) | — |
| **authcoreadmin** | Vue 3 AuthCore admin frontend (teacher management) | 80 → :8089 |
| **ai-agent** | AI agent: polls Gitea, processes tickets via DeepSeek API | — |
| **gitea** | Code hosting, CI/CD runner, and issue tracker | 3000/3001 |
| **postgres** | Database for all services | 5432 |

## Request Flow

```mermaid
sequenceDiagram
    participant User as 浏览器
    participant NGX as nginx :8088
    participant WEB as upctl-web
    participant AUTH as authcore
    participant SVC as upctl-svc
    participant GIT as gitea

    User->>NGX: GET /
    NGX->>WEB: 静态文件
    WEB-->>User: Vue SPA

    User->>NGX: POST /api/v1/uc/login
    NGX->>AUTH: 转发
    AUTH-->>User: JWT token

    User->>NGX: GET /api/v2/upctl/api/tickets
    NGX->>SVC: 转发
    SVC->>GIT: 代理请求
    GIT-->>SVC: 工单数据
    SVC-->>User: JSON 响应
```

## AI Agent Flow

```mermaid
sequenceDiagram
    participant AI as ai-agent
    participant SVC as upctl-svc
    participant GIT as gitea
    participant DEEPSEEK as DeepSeek API

    loop 每 5 分钟
        AI->>SVC: GET /api/v2/upctl/api/tickets
        SVC->>GIT: 查询已批准工单
        GIT-->>AI: 工单列表
        alt 有已批准的工单
            AI->>GIT: 添加 in_progress 标签
            AI->>DEEPSEEK: 发送工单内容
            DEEPSEEK-->>AI: 处理结果
            AI->>GIT: 提交处理结果评论
            AI->>GIT: 关闭工单
        end
    end
```

## API Routing (nginx)

| Location | Upstream |
|----------|----------|
| `/` | Static files (upctl-web dist) |
| `/admin/` | `authcoreadmin:80` (proxied) |
| `/api/v1/uc/` | `authcore:3000` |
| `/api/v2/upctl/api/` | `upctl-svc:3005` |
| `/gitea/` | `gitea:3000` |

## Services Detail

### upctl-web

Vue 3 + Vite SPA. Built with empty `UC_SERVER`/`TS_SERVER` so all API calls
go through nginx (same-origin proxy). Login supports username/password via
AuthCore's global password feature.

### upctl-svc

Rust Axum service providing:
- Gitea API proxy for ticket CRUD operations (list, create, update, close, comment)
- Attachment upload and serving (local storage in `uploads/` volume)
- JWT authentication via AuthCore

### ai-agent

Python-based AI worker that:
- Polls upctl-svc for approved Gitea tickets every 5 minutes
- Processes tickets using DeepSeek V4 API (OpenAI-compatible SDK)
- Adds comments and closes tickets automatically
- Runs in a tmux session for interactive access

Requires `DEEPSEEK_API_KEY` environment variable to be set.

## Data Persistence

- PostgreSQL data: `pgdata` volume
- Gitea data: `gitea` volume
- Uploaded attachments: `uploads` volume
- AI agent workspace: `agent-workspace` volume
