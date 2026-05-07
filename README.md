# upctl-compose

Docker Compose project for `upctl` — ticket management system.

## Services

| Service | Description | Internal Port |
|---------|-------------|---------------|
| **nginx** | Reverse proxy (static files + API routing) | 80 → :8088 |
| **authcore** | AuthCore identity & auth service | 3000 |
| **upctl-svc** | Ticket management API (Gitea proxy + attachments) | 3005 |
| **upctl-web** | Vue 3 ticket management frontend (served by nginx) | — |
| **gitea** | Issue tracker (self-hosted) | 3000/3001 |
| **postgres** | Database for all services | 5432 |

## Quick Start

```bash
# Start all services
docker compose up -d

# Wait for all services to be healthy, then seed test data
bash scripts/seed.sh
```

## Architecture

```
                           nginx (:8088)
                        ┌──────┴──────┐
                        │              │
                 ┌──────┴──────┐       │
            upctl-web      upctl-svc (:3005)
           (Vue 3 SPA)    (Rust Axum)
                               │
                        gitea (:3000)
                        (issue tracker)
```

### API Routing (nginx)

| Location | Upstream |
|----------|----------|
| `/` | Static files (upctl-web dist) |
| `/api/v1/uc/` | `authcore:3000` |
| `/api/v2/ts/` | `upctl-svc:3005` |
| `/gitea/` | `gitea:3000` |

## Services Detail

### upctl-web

Vue 3 + Vite SPA. Built with empty `UC_SERVER`/`TS_SERVER` so all API calls
go through nginx (same-origin proxy). Login supports username/password via
AuthCore's global password feature.

## Development

```bash
# Rebuild a specific service after code changes
docker compose build authcore
docker compose up -d authcore

# View logs
docker compose logs -f upctl-svc
```

## Data Persistence

- PostgreSQL data: `pgdata` volume
- Gitea data: `gitea` volume
- Uploaded attachments: `uploads` volume
