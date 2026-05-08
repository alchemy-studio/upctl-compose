FROM node:22-alpine AS builder

WORKDIR /app
RUN apk add --no-cache git && \
    git clone --depth 1 https://github.com/alchemy-studio/upctl-web.git .

# Inject compose mode (empty server URLs → relative API calls through nginx)
RUN node -e "const fs=require('fs');let s=fs.readFileSync('vite.config.ts','utf8');s=s.replace('  local: {','  compose: {\n    main: \"\",\n    ts: \"\",\n    host: \"localhost:8088\",\n    wx_app: \"\",\n  },\n  local: {');s=s.replace(/mode \|\| 'local'/,\"mode || 'compose'\");fs.writeFileSync('vite.config.ts',s);" && \
    corepack enable && corepack prepare pnpm@10 --activate && \
    pnpm install --no-frozen-lockfile && \
    mode=compose npx vite build

FROM nginx:alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
