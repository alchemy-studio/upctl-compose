FROM rust:slim-bookworm AS builder

RUN apt-get update && apt-get install -y pkg-config libssl-dev git && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN git clone --depth 1 https://github.com/alchemy-studio/upctl-svc.git .

RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/upctl-svc /usr/local/bin/

RUN mkdir -p /app/uploads
EXPOSE 3005
WORKDIR /app
CMD ["upctl-svc"]
