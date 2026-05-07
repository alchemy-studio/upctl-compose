FROM node:20-alpine AS builder

WORKDIR /app
RUN apk add --no-cache git && \
    git clone --depth 1 https://github.com/alchemy-studio/upctl-web.git .

# Inject compose environment (empty UC/TS → relative API calls through nginx)
RUN sed -i 's/^  local: {/  compose: {\n    main: "",\n    ts: "",\n    host: "localhost:8088",\n    wx_app: "",\n  },\n  local:/' vite.config.ts && \
    sed -i "s/\\(const mode = (process.env.mode ||\\) 'local'/\1 'compose'/" vite.config.ts

RUN corepack enable && pnpm install && mode=compose npx vite build

FROM nginx:alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
