# upctl-compose

> AI Agent 驱动的全自动工单处理平台 — 一键部署，智能响应。

[![Docker Compose](https://img.shields.io/badge/Docker_Compose-2.24%2B-2496ED?logo=docker)](https://docs.docker.com/compose/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Node](https://img.shields.io/badge/node-20%2B-339933?logo=node.js)](https://nodejs.org/)
[![Rust](https://img.shields.io/badge/Rust-1.80%2B-000000?logo=rust)](https://www.rust-lang.org/)

---

![工单列表](userguide/screenshots/05-main-page.png)

**upctl-compose** 是一个开箱即用的工单管理系统。它把 [Gitea](https://about.gitea.com/) 作为工单后端，搭配 Vue 3 管理界面和 Rust API 服务，并通过 **DeepSeek V4 AI Agent** 自动处理已批准的工单，实现从创建到关闭的全链路自动化。

## 功能特色

### 🤖 AI Agent 自动处理

工单创建后打上 `approved` 标签，ai-agent 自动轮询、调用 DeepSeek 模型处理，评论结果并关闭工单，全程无需人工介入。

![AI 处理流程](userguide/screenshots/05-ticket-list-with-data.png)

> ai-agent 每 5 分钟轮询一次。也可通过 `docker compose exec ai-agent python3 /app/poll_worker.py --once` 手动触发即时处理。

### 🖥️ 工单管理界面

基于 Vue 3 的现代化 SPA，支持标签页切换、卡片视图、状态标记，通过 nginx 同源代理访问各后端服务。

<img src="userguide/screenshots/01-login-page.png" width="680" alt="登录页"/>
**登录页**

<img src="userguide/screenshots/02-ticket-list.png" width="680" alt="工单列表"/>
**工单列表**

<img src="userguide/screenshots/03-ticket-detail.png" width="680" alt="工单详情"/>
**工单详情**

### 🐙 Gitea 内置

所有工单数据存储在本地 Gitea 实例中，无需外部 SaaS 服务。可直接通过 Gitea 管理界面查看和处理工单。

![Gitea 工单后台](userguide/screenshots/04-gitea-issues.png)

### 🐳 一键部署

6 个容器，一条命令启动：

```bash
git clone https://github.com/alchemy-studio/upctl-compose.git
cd upctl-compose
docker compose up -d
```

## 架构概览

| 服务 | 端口 | 职责 |
|------|------|------|
| **nginx** | `:8088` | 反向代理，路由静态文件与 API 请求 |
| **upctl-web** | (nginx 内) | Vue 3 工单管理前端 |
| **upctl-svc** | `:3005` | Rust 工单 CRUD API（Gitea 代理 + 附件） |
| **authcore** | `:3000` | 身份认证，JWT 签发 |
| **authcoreadmin** | `:8089` | 用户与角色管理后台 |
| **ai-agent** | — | Python AI 工单处理 worker |
| **gitea** | `:3001` | 代码托管 + 工单追踪 + CI |
| **postgres** | `:5432` | 全局数据库 |
| **redis** | `:6379` | 缓存 / session 存储 |

详细架构说明、请求流程和序列图见 [ARCHITECTURE.md](ARCHITECTURE.md)。

## 快速上手

### 环境要求

- Docker 24.0+、Docker Compose 2.24+
- Git

### 启动

```bash
# 克隆
git clone https://github.com/alchemy-studio/upctl-compose.git
cd upctl-compose

# 启动全部服务
docker compose up -d

# 查看状态
docker compose ps
```

### 初始化 Gitea

首次启动需要等待服务就绪后初始化 Gitea：

```bash
# 等待 Gitea 就绪
until curl -sf http://localhost:3001/api/v1/version > /dev/null 2>&1; do sleep 3; done

# 运行初始化脚本
docker compose exec ai-agent python3 /app/setup-gitea.py
```

初始化会创建组织 `weli`、仓库 `tickets`，以及 **approved / in_progress / blocked** 三个工单标签。

访问 `http://localhost:8088` 进入工单管理界面。  
Gitea 管理后台：`http://localhost:3001`（用户 `ai-bot` / 密码 `ai-bot-dev-pass`）。

### 配置 AI Agent（可选）

创建 `.env` 文件启用 AI 自动处理：

```bash
# .env
DEEPSEEK_API_KEY=sk-your-deepseek-api-key
DEEPSEEK_API_BASE=https://api.deepseek.com
DEFAULT_MODEL=deepseek-v4-flash
```

重启 ai-agent 使配置生效：

```bash
docker compose up -d ai-agent
```

设置后，在 Gitea 中创建工单并打上 `approved` 标签，AI agent 即会自动处理。

### 验证部署

```bash
# 冒烟测试
curl -sf http://localhost:8088/ | head -c 200   # 前端 HTML
curl -sf http://localhost:3005/                   # upctl-svc → "upctl-svc"
curl -sf http://localhost:3000/                   # authcore → "AuthCore"
curl -sf http://localhost:3001/api/v1/version     # Gitea API
```

## AI Agent 工作流程

```
创建工单 → 标记 approved → ai-agent 轮询发现
  → 添加 in_progress 标签 → 调用 DeepSeek API
    → 评论处理结果 → 关闭工单
```

ai-agent 通过 tmux session 托管 DeepSeek TUI，使用 `tmux send-keys` 注入工单内容、`tmux capture-pane` 读取模型回复，实现无头自动化。

查看 ai-agent 运行状态：

```bash
# 查看轮询日志
docker compose logs -f ai-agent

# 进入 tmux 交互 session
docker compose exec ai-agent tmux attach -t deepseek-agent
```

## CI & 测试

本项目内置全链路测试，通过 GitHub Actions 自动运行：

- **lint** — 验证 docker-compose.yml 格式
- **build** — 构建所有服务镜像
- **integration** — 启动全部服务，运行冒烟 + E2E 测试

### E2E 测试

| 测试 | 工具 | 范围 |
|------|------|------|
| 后端 E2E | Python + JWT | 认证、工单 CRUD、AI 处理全流程 |
| 前端渲染 | Playwright | 登录页、路由守卫、工单列表渲染 |

```bash
# 后端 E2E
docker compose cp tests/e2e_test.py ai-agent:/app/e2e_test.py
docker compose exec -T ai-agent python3 /app/e2e_test.py

# 前端 Playwright
cd tests/playwright
npm install && npx playwright test
```

## 停止与清理

```bash
# 停止服务（保留数据卷）
docker compose down

# 完全清理
docker compose down -v
```

## 相关文档

- [ARCHITECTURE.md](ARCHITECTURE.md) — 系统架构、API 路由、序列图
- [CLAUDE.md](CLAUDE.md) — 项目开发约定
- `userguide/userguide.pdf` — 用户手册（幻灯片格式）
- `docker-compose.yml` — 完整服务配置

---

Built by [鉬馨玥翼](https://github.com/alchemy-studio).
