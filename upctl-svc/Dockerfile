FROM rust:slim-bookworm AS builder

RUN apt-get update && apt-get install -y pkg-config libssl-dev libpq-dev git && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src

RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates libpq5 && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/upctl-svc /usr/local/bin/

RUN mkdir -p /app/uploads
EXPOSE 3005
WORKDIR /app
CMD ["upctl-svc"]
